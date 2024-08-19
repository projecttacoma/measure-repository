import { loggers, RequestArgs, RequestCtx } from '@projecttacoma/node-fhir-server-core';
import {
  batchInsert,
  batchUpdate,
  createResource,
  deleteResource,
  findDataRequirementsWithQuery,
  findResourceById,
  findResourceCountWithQuery,
  findResourceElementsWithQuery,
  findResourcesWithQuery,
  updateResource
} from '../db/dbOperations';
import { Service } from '../types/service';
import {
  createBatchResponseBundle,
  createMeasurePackageBundle,
  createSearchsetBundle,
  createSummarySearchsetBundle
} from '../util/bundleUtils';
import { BadRequestError, ResourceNotFoundError } from '../util/errorUtils';
import { getMongoQueryFromRequest } from '../util/queryUtils';
import {
  extractIdentificationForQuery,
  gatherParams,
  validateParamIdSource,
  checkContentTypeHeader,
  checkExpectedResourceType,
  checkFieldsForCreate,
  checkFieldsForUpdate,
  checkFieldsForDelete,
  checkIsOwned,
  checkAuthoring
} from '../util/inputUtils';
import { Calculator } from 'fqm-execution';
import {
  MeasureSearchArgs,
  MeasureDataRequirementsArgs,
  PackageArgs,
  parseRequestSchema,
  DraftArgs,
  CloneArgs,
  ApproveArgs
} from '../requestSchemas';
import { v4 as uuidv4 } from 'uuid';
import { Filter } from 'mongodb';
import { CRMIShareableMeasure, FhirLibraryWithDR } from '../types/service-types';
import { getChildren, modifyResourcesForClone, modifyResourcesForDraft } from '../util/serviceUtils';

const logger = loggers.get('default');

/*
 * Implementation of a service for the `Measure` resource
 * The Service interface contains all possible functions
 */
export class MeasureService implements Service<CRMIShareableMeasure> {
  /**
   * result of sending a GET request to {BASE_URL}/4_0_1/Measure?{QUERY}
   * searches for all measures that match the included query and returns a FHIR searchset Bundle
   */
  async search(_: RequestArgs, { req }: RequestCtx) {
    logger.info(`GET /Measure`);
    const { query } = req;
    logger.debug(`Request Query: ${JSON.stringify(query, null, 2)}`);
    const parsedQuery = parseRequestSchema(query, MeasureSearchArgs);
    const mongoQuery = getMongoQueryFromRequest(parsedQuery);

    // if the _summary parameter with a value of count is included, then
    // return a searchset bundle that excludes the entries
    if (parsedQuery._summary && parsedQuery._summary === 'count') {
      const count = await findResourceCountWithQuery(mongoQuery, 'Measure');
      return createSummarySearchsetBundle<CRMIShareableMeasure>(count);
    }
    // if the _elements parameter with a comma-separated string is included
    // then return a searchset bundle that includes only those elements
    // on those resource entries
    else if (parsedQuery._elements) {
      const entries = await findResourceElementsWithQuery<CRMIShareableMeasure>(mongoQuery, 'Measure');
      // add the SUBSETTED tag to the resources returned by the _elements parameter
      entries.map(e => {
        if (e.meta) {
          if (e.meta.tag) {
            e.meta.tag.push({ code: 'SUBSETTED', system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationValue' });
          } else {
            e.meta.tag = [{ code: 'SUBSETTED', system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationValue' }];
          }
        } else {
          e.meta = {
            tag: [{ code: 'SUBSETTED', system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationValue' }]
          };
        }
      });
      return createSearchsetBundle(entries);
    } else {
      const entries = await findResourcesWithQuery<CRMIShareableMeasure>(mongoQuery, 'Measure');
      return createSearchsetBundle(entries);
    }
  }

  /**
   * result of sending a GET request to {BASE_URL}/4_0_1/Measure/{id}
   * searches for the measure with the passed in id
   */
  async searchById(args: RequestArgs) {
    logger.info(`GET /Measure/${args.id}`);
    const result = await findResourceById<CRMIShareableMeasure>(args.id, 'Measure');
    if (!result) {
      throw new ResourceNotFoundError(`No resource found in collection: Measure, with id: ${args.id}`);
    }
    return result;
  }

  /**
   * result of sending a POST request to {BASE_URL}/4_0_1/Measure
   * creates a new Measure resource, generates an id for it, and adds it to the database
   */
  async create(_: RequestArgs, { req }: RequestCtx) {
    logger.info('POST /Measure');
    const contentType: string | undefined = req.headers['content-type'];
    checkContentTypeHeader(contentType);
    const resource = req.body;
    checkExpectedResourceType(resource.resourceType, 'Measure');
    checkFieldsForCreate(resource);
    resource['id'] = uuidv4();
    return createResource(resource, 'Measure');
  }

  /**
   * result of sending a PUT request to {BASE_URL}/4_0_1/Measure/{id}
   * updates the measure with the passed in id using the passed in data
   * or creates a measure with passed in id if it does not exist in the database
   */
  async update(args: RequestArgs, { req }: RequestCtx) {
    logger.info(`PUT /Measure/${args.id}`);
    const contentType: string | undefined = req.headers['content-type'];
    checkContentTypeHeader(contentType);
    const resource = req.body;
    checkExpectedResourceType(resource.resourceType, 'Measure');
    // Throw error if the id arg in the url does not match the id in the request body
    if (resource.id !== args.id) {
      throw new BadRequestError('Argument id must match request body id for PUT request');
    }
    const oldResource = (await findResourceById(resource.id, resource.resourceType)) as CRMIShareableMeasure | null;
    // note: the distance between this database call and the update resource call, could cause a race condition
    if (oldResource) {
      checkFieldsForUpdate(resource, oldResource);
    } else {
      checkFieldsForCreate(resource);
    }

    return updateResource(args.id, resource, 'Measure');
  }

  /**
   * result of sending a DELETE request to {BASE_URL}/4_0_1/measure/{id}
   * deletes the measure with the passed in id if it exists in the database
   */
  async remove(args: RequestArgs) {
    const resource = (await findResourceById(args.id, 'Measure')) as CRMIShareableMeasure | null;
    if (!resource) {
      throw new ResourceNotFoundError(`Existing resource not found with id ${args.id}`);
    }
    checkFieldsForDelete(resource);
    return deleteResource(args.id, 'Measure');
  }

  /**
   * result of sending a POST or GET request to:
   * {BASE_URL}/4_0_1/Measure/$draft or {BASE_URL}/4_0_1/Measure/[id]/$draft
   * drafts a new version of an existing Measure artifact in active status,
   * as well as for all resources it is composed of
   * requires id and version parameters
   */
  async draft(args: RequestArgs, { req }: RequestCtx) {
    logger.info(`${req.method} ${req.path}`);

    // checks that the authoring environment variable is true
    checkAuthoring();

    if (req.method === 'POST') {
      const contentType: string | undefined = req.headers['content-type'];
      checkContentTypeHeader(contentType);
    }

    const params = gatherParams(req.query, args.resource);
    validateParamIdSource(req.params.id, params.id);

    const query = extractIdentificationForQuery(args, params);

    const parsedParams = parseRequestSchema({ ...params, ...query }, DraftArgs);

    const activeMeasure = await findResourceById<CRMIShareableMeasure>(parsedParams.id, 'Measure');
    if (!activeMeasure) {
      throw new ResourceNotFoundError(`No resource found in collection: Measure, with id: ${args.id}`);
    }
    checkIsOwned(activeMeasure, 'Child artifacts cannot be directly drafted.');

    // recursively get any child artifacts from the artifact if they exist
    const children = activeMeasure.relatedArtifact ? await getChildren(activeMeasure.relatedArtifact) : [];

    const draftArtifacts = await modifyResourcesForDraft(
      [activeMeasure, ...(await Promise.all(children))],
      params.version
    );

    // now we want to batch insert the parent Measure artifact and any of its children
    const newDrafts = await batchInsert(draftArtifacts, 'draft');

    // we want to return a Bundle containing the created artifacts
    return createBatchResponseBundle(newDrafts);
  }

  /**
   * result of sending a POST or GET request to:
   * {BASE_URL}/4_0_1/Measure/$clone or {BASE_URL}/4_0_1/Measure/[id]/$clone
   * clones a new knowledge artifact based on the contents of an existing artifact,
   * as well as for all resources it is composed of
   * requires id, url, and version parameters
   */
  async clone(args: RequestArgs, { req }: RequestCtx) {
    logger.info(`${req.method} ${req.path}`);

    // checks that the authoring environment variable is true
    checkAuthoring();

    if (req.method === 'POST') {
      const contentType: string | undefined = req.headers['content-type'];
      checkContentTypeHeader(contentType);
    }

    const params = gatherParams(req.query, args.resource);
    validateParamIdSource(req.params.id, params.id);

    const query = extractIdentificationForQuery(args, params);

    const parsedParams = parseRequestSchema({ ...params, ...query }, CloneArgs);

    const measure = await findResourceById<CRMIShareableMeasure>(parsedParams.id, 'Measure');
    if (!measure) {
      throw new ResourceNotFoundError(`No resource found in collection: Measure, with id: ${args.id}`);
    }
    measure.url = parsedParams.url;
    checkIsOwned(measure, 'Child artifacts cannot be directly cloned.');

    // recursively get any child artifacts from the artifact if they exist
    const children = measure.relatedArtifact ? await getChildren(measure.relatedArtifact) : [];
    children.forEach(child => {
      child.url = child.url + '-clone';
    });

    const clonedArtifacts = await modifyResourcesForClone([measure, ...children], parsedParams.version);

    // now we want to batch insert the cloned parent Measure artifact and any of its children
    const newClones = await batchInsert(clonedArtifacts, 'clone');

    // we want to return a Bundle containing the created artifacts
    return createBatchResponseBundle(newClones);
  }

  /**
   * result of sending a POST or GET request to:
   * {BASE_URL}/4_0_1/Measure/$approve or {BASE_URL}/4_0_1/Measure/[id]/$approve
   * applies an approval to an existing artifact, regardless of status, and sets the
   * date and approvalDate elements of the approved artifact as well as for all resources
   * it is composed of. The user can optionally provide an artifactAssessmentType and an
   * artifactAssessmentSummary for an cqfm-artifactComment extension.
   */
  async approve(args: RequestArgs, { req }: RequestCtx) {
    logger.info(`${req.method} ${req.path}`);

    // checks that the authoring environment variable is true
    checkAuthoring();

    if (req.method === 'POST') {
      const contentType: string | undefined = req.headers['content-type'];
      checkContentTypeHeader(contentType);
    }

    const params = gatherParams(req.query, args.resource);
    validateParamIdSource(req.params.id, params.id);

    const query = extractIdentificationForQuery(args, params);

    const parsedParams = parseRequestSchema({ ...params, ...query }, ApproveArgs);

    const measure = await findResourceById<CRMIShareableMeasure>(parsedParams.id, 'Measure');
    if (!measure) {
      throw new ResourceNotFoundError(`No resource found in collection: Measure, with id: ${parsedParams.id}`);
    }
    if (parsedParams.artifactAssessmentType && parsedParams.artifactAssessmentSummary) {
      const approveExtension: fhir4.Extension[] = [];
      approveExtension.push(
        { url: 'type', valueCode: parsedParams.artifactAssessmentType },
        { url: 'text', valueMarkdown: parsedParams.artifactAssessmentSummary }
      );
      if (measure.extension) {
        measure.extension.push({
          extension: approveExtension,
          url: 'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-artifactComment'
        });
      } else {
        measure.extension = [
          {
            extension: approveExtension,
            url: 'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-artifactComment'
          }
        ];
      }
    }
    measure.date = new Date().toISOString();
    measure.approvalDate = parsedParams.approvalDate ?? new Date().toISOString();
    checkIsOwned(measure, 'Child artifacts cannot be directly approved.');

    // recursively get any child artifacts from the artifact if they exist
    const children = measure.relatedArtifact ? await getChildren(measure.relatedArtifact) : [];
    children.forEach(child => {
      if (parsedParams.artifactAssessmentType && parsedParams.artifactAssessmentSummary) {
        const approveExtension: fhir4.Extension[] = [];
        approveExtension.push(
          { url: 'type', valueCode: parsedParams.artifactAssessmentType },
          { url: 'text', valueMarkdown: parsedParams.artifactAssessmentSummary }
        );
        if (child.extension) {
          child.extension.push({
            extension: approveExtension,
            url: 'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-artifactComment'
          });
        } else {
          child.extension = [
            {
              extension: approveExtension,
              url: 'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-artifactComment'
            }
          ];
        }
      }
      child.date = new Date().toISOString();
      child.approvalDate = parsedParams.approvalDate ?? new Date().toISOString();
    });

    // now we want to batch update the approved parent Measure and any of its children
    const approvedArtifacts = await batchUpdate([measure, ...(await Promise.all(children))]);

    // we want to return a Bundle containing the updated artifacts
    return createBatchResponseBundle(approvedArtifacts);
  }

  /**
   * result of sending a POST or GET request to:
   * {BASE_URL}/4_0_1/Measure/$cqfm.package or {BASE_URL}/4_0_1/Measure/:id/$cqfm.package
   * creates a bundle of the measure (specified by parameters) and all dependent libraries
   * requires parameters id and/or url and/or identifier, but also supports version as supplemental (optional)
   */
  async package(args: RequestArgs, { req }: RequestCtx) {
    logger.info(`${req.method} ${req.path}`);

    if (req.method === 'POST') {
      const contentType: string | undefined = req.headers['content-type'];
      checkContentTypeHeader(contentType);
    }

    const params = gatherParams(req.query, args.resource);
    validateParamIdSource(req.params.id, params.id);

    const query = extractIdentificationForQuery(args, params);

    const parsedParams = parseRequestSchema({ ...params, ...query }, PackageArgs);

    return createMeasurePackageBundle(query, parsedParams);
  }

  /**
   * result of sending a POST or GET request to:
   * {BASE_URL}/4_0_1/Measure/$data-requirements or {BASE_URL}/4_0_1/Measure/:id/$data-requirements
   * creates a Library with all data requirements for the specified Measure
   * requires parameters id and/or url and/or identifier, but also supports version as supplemental (optional)
   */
  async dataRequirements(args: RequestArgs, { req }: RequestCtx) {
    if (req.method === 'POST') {
      const contentType: string | undefined = req.headers['content-type'];
      checkContentTypeHeader(contentType);
    }

    const params = gatherParams(req.query, args.resource);
    validateParamIdSource(req.params.id, params.id);
    const query = extractIdentificationForQuery(args, params);
    const parsedParams = parseRequestSchema({ ...params, ...query }, MeasureDataRequirementsArgs);

    // check to see if data requirements were already calculated for this Measure and params
    const dataReqsQuery: Filter<any> = {};
    Object.entries(parsedParams).forEach(p => {
      if (p[0] === 'id') {
        dataReqsQuery.resourceId = p[1] as string;
      } else {
        dataReqsQuery[p[0]] = p[1] as string;
      }
    });

    const dataReqs = await findDataRequirementsWithQuery(dataReqsQuery);

    // if data requirements were already calculated for this Measure and params, return them
    if (dataReqs) {
      logger.info('Successfully retrieved $data-requirements report from cache.');
      return dataReqs;
    }

    logger.info(`${req.method} ${req.path}`);

    const measureBundle = await createMeasurePackageBundle(query, parsedParams);

    // See https://jira.hl7.org/browse/FHIR-40230
    // periodStart and periodEnd should be optional. Right now, fqm-execution will default it to 2019.
    // This will be handled in a separate task
    // TODO: Update the fqm-execution dependency and delete this comment block once periodStart/End can safely be excluded
    const dataRequirements = await Calculator.calculateDataRequirements(measureBundle, {
      ...(parsedParams.periodStart && { measurementPeriodStart: parsedParams.periodStart }),
      ...(parsedParams.periodEnd && { measurementPeriodEnd: parsedParams.periodEnd })
    });

    dataRequirements.results['id'] = uuidv4();

    // add the data requirements query params to the data requirements Library resource and add to the Library collection
    const results = { ...dataRequirements.results } as FhirLibraryWithDR;
    results['_dataRequirements'] = dataReqsQuery;
    results.url = `Library/${dataRequirements.results.id}`;
    createResource(results, 'Library');

    logger.info('Successfully generated $data-requirements report');
    return dataRequirements.results;
  }
}
