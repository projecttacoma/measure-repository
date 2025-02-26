import { loggers, RequestArgs, RequestCtx } from '@projecttacoma/node-fhir-server-core';
import {
  batchDelete,
  batchInsert,
  batchUpdate,
  createResource,
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
  createPaginationLinks,
  createMeasurePackageBundle,
  createSearchsetBundle,
  createSummarySearchsetBundle,
  createTransactionResponseBundle
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
  ApproveArgs,
  ReviewArgs,
  ReleaseArgs
} from '../requestSchemas';
import { v4 as uuidv4 } from 'uuid';
import { Filter } from 'mongodb';
import { CRMIShareableMeasure, FhirLibraryWithDR } from '../types/service-types';
import {
  createArtifactComment,
  getChildren,
  modifyResourcesForClone,
  modifyResourcesForDraft
} from '../util/serviceUtils';

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
    // if _count has the value 0, this shall be treated the same as _summary=count
    if (
      (parsedQuery._summary && parsedQuery._summary === 'count') ||
      (parsedQuery._count && parsedQuery._count === '0')
    ) {
      const count = await findResourceCountWithQuery(mongoQuery, 'Measure');
      return createSummarySearchsetBundle<CRMIShareableMeasure>(count);
    }
    // if the _elements parameter with a comma-separated string is included
    // then return a searchset bundle that includes only those elements
    // on those resource entries
    else if (parsedQuery._elements) {
      const result = await findResourceElementsWithQuery<CRMIShareableMeasure>(mongoQuery, 'Measure');
      // add the SUBSETTED tag to the resources returned by the _elements parameter
      result.data.map(e => {
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
      const bundle = createSearchsetBundle(result.data);
      if (parsedQuery._count) {
        if (parsedQuery._count) {
          bundle.link = createPaginationLinks(
            `http://${req.headers.host}/${req.params.base_version}/`,
            'Measure',
            new URLSearchParams(req.query),
            {
              numberOfPages: Math.ceil(result.total / parseInt(parsedQuery._count)),
              page: parseInt(parsedQuery.page || '1')
            }
          );
        }
      }
      return bundle;
    } else {
      const result = await findResourcesWithQuery<CRMIShareableMeasure>(mongoQuery, 'Measure');
      const bundle = createSearchsetBundle(result.data);
      if (parsedQuery._count) {
        if (parsedQuery._count) {
          bundle.link = createPaginationLinks(
            `http://${req.headers.host}/${req.params.base_version}/`,
            'Measure',
            new URLSearchParams(req.query),
            {
              numberOfPages: Math.ceil(result.total / parseInt(parsedQuery._count)),
              page: parseInt(parsedQuery.page || '1')
            }
          );
        }
      }
      return bundle;
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
   * retire: only updates a measure with status 'active' to have status 'retired'
   * and any resource it is composed of
   *
   * Otherwise, updates the measure with the passed in id using the passed in data
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

      if (resource.status === 'retired') {
        // because we are changing the status/date of artifact, we want to also do so for
        // any resources it is composed of
        const children = oldResource.relatedArtifact ? await getChildren(oldResource.relatedArtifact) : [];
        children.forEach(child => {
          child.status = resource.status;
          child.date = resource.date;
        });

        // now we want to batch update the retired parent Measure and any of its children
        await batchUpdate([resource, ...(await Promise.all(children))], 'retire');

        return { id: args.id, created: false };
      }
    } else {
      checkFieldsForCreate(resource);
    }

    return updateResource(args.id, resource, 'Measure');
  }

  /**
   * archive: deletes a measure and any resources it is composed of with 'retired' status
   * withdraw: deletes a measure and any resources it is composed of with 'draft' status
   * result of sending a DELETE request to {BASE_URL}/4_0_1/measure/{id}
   * deletes the measure with the passed in id if it exists in the database
   * as well as all resources it is composed of
   * requires id parameter
   */
  async remove(args: RequestArgs) {
    const measure = await findResourceById<CRMIShareableMeasure>(args.id, 'Measure');
    if (!measure) {
      throw new ResourceNotFoundError(`No resource found in collection: Measure, with id: ${args.id}`);
    }
    checkFieldsForDelete(measure);
    const archiveOrWithdraw = measure.status === 'retired' ? 'archive' : 'withdraw';
    checkIsOwned(
      measure,
      `Child artifacts cannot be directly ${archiveOrWithdraw === 'archive' ? 'archived' : 'withdrawn'}`
    );

    // recursively get any child artifacts from the artifact if they exist
    const children = measure.relatedArtifact ? await getChildren(measure.relatedArtifact) : [];

    // now we want to batch delete (archive/withdraw) the Measure artifact and any of its children
    const newDeletes = await batchDelete([measure, ...children], archiveOrWithdraw);

    // we want to return a Bundle containing the deleted artifacts
    return createTransactionResponseBundle(newDeletes);
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
    if (activeMeasure.status !== 'active') {
      throw new BadRequestError('Authoring repository service drafting may only be made to active status resources.');
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
      const comment = createArtifactComment(
        parsedParams.artifactAssessmentType,
        parsedParams.artifactAssessmentSummary,
        parsedParams.artifactAssessmentTarget,
        parsedParams.artifactAssessmentRelatedArtifact,
        parsedParams.artifactAssessmentAuthor
      );
      if (measure.extension) {
        measure.extension.push(comment);
      } else {
        measure.extension = [comment];
      }
    }
    measure.date = new Date().toISOString();
    measure.approvalDate = parsedParams.approvalDate ?? new Date().toISOString();
    checkIsOwned(measure, 'Child artifacts cannot be directly approved.');

    // recursively get any child artifacts from the artifact if they exist
    const children = measure.relatedArtifact ? await getChildren(measure.relatedArtifact) : [];
    children.forEach(child => {
      if (parsedParams.artifactAssessmentType && parsedParams.artifactAssessmentSummary) {
        const comment = createArtifactComment(
          parsedParams.artifactAssessmentType,
          parsedParams.artifactAssessmentSummary,
          parsedParams.artifactAssessmentTarget,
          parsedParams.artifactAssessmentRelatedArtifact,
          parsedParams.artifactAssessmentAuthor
        );
        if (child.extension) {
          child.extension.push(comment);
        } else {
          child.extension = [comment];
        }
      }
      child.date = new Date().toISOString();
      child.approvalDate = parsedParams.approvalDate ?? new Date().toISOString();
    });

    // now we want to batch update the approved parent Measure and any of its children
    const approvedArtifacts = await batchUpdate([measure, ...(await Promise.all(children))], 'approve');

    // we want to return a Bundle containing the updated artifacts
    return createBatchResponseBundle(approvedArtifacts);
  }

  /**
   * result of sending a POST or GET request to:
   * {BASE_URL}/4_0_1/Measure/$review or {BASE_URL}/4_0_1/Measure/[id]/$review
   * applies a review to an existing artifact, regardless of status, and sets the
   * date and lastReviewDate elements of the reviewed artifact as well as for all resources
   * it is composed of. The user can optionally provide an artifactAssessmentType and an
   * artifactAssessmentSummary for an cqfm-artifactComment extension.
   */
  async review(args: RequestArgs, { req }: RequestCtx) {
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

    const parsedParams = parseRequestSchema({ ...params, ...query }, ReviewArgs);

    const measure = await findResourceById<CRMIShareableMeasure>(parsedParams.id, 'Measure');
    if (!measure) {
      throw new ResourceNotFoundError(`No resource found in collection: Measure, with id: ${parsedParams.id}`);
    }
    if (parsedParams.artifactAssessmentType && parsedParams.artifactAssessmentSummary) {
      const comment = createArtifactComment(
        parsedParams.artifactAssessmentType,
        parsedParams.artifactAssessmentSummary,
        parsedParams.artifactAssessmentTarget,
        parsedParams.artifactAssessmentRelatedArtifact,
        parsedParams.artifactAssessmentAuthor
      );
      if (measure.extension) {
        measure.extension.push(comment);
      } else {
        measure.extension = [comment];
      }
    }
    measure.date = new Date().toISOString();
    measure.lastReviewDate = parsedParams.reviewDate ?? new Date().toISOString();
    checkIsOwned(measure, 'Child artifacts cannot be directly reviewed.');

    // recursively get any child artifacts from the artifact if they exist
    const children = measure.relatedArtifact ? await getChildren(measure.relatedArtifact) : [];
    children.forEach(child => {
      if (parsedParams.artifactAssessmentType && parsedParams.artifactAssessmentSummary) {
        const comment = createArtifactComment(
          parsedParams.artifactAssessmentType,
          parsedParams.artifactAssessmentSummary,
          parsedParams.artifactAssessmentTarget,
          parsedParams.artifactAssessmentRelatedArtifact,
          parsedParams.artifactAssessmentAuthor
        );
        if (child.extension) {
          child.extension.push(comment);
        } else {
          child.extension = [comment];
        }
      }
      child.date = new Date().toISOString();
      child.lastReviewDate = parsedParams.reviewDate ?? new Date().toISOString();
    });

    // now we want to batch update the reviewed parent Measure and any of its children
    const reviewedArtifacts = await batchUpdate([measure, ...(await Promise.all(children))], 'review');

    // we want to return a Bundle containing the updated artifacts
    return createBatchResponseBundle(reviewedArtifacts);
  }

  /**
   * result of sending a POST or GET request to:
   * {BASE_URL}/4_0_1/Measure/$release or {BASE_URL}/4_0_1/Measure/[id]/$release
   * releases an artifact, updating the status of an existing draft artifact to active and
   * setting the date element of the resource. Also sets the version and recursively releases
   * child artifacts according to the versionBehavior parameter.
   */
  async release(args: RequestArgs, { req }: RequestCtx) {
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
    const parsedParams = parseRequestSchema({ ...params, ...query }, ReleaseArgs);

    const measure = await findResourceById<CRMIShareableMeasure>(parsedParams.id, 'Measure');
    if (!measure) {
      throw new ResourceNotFoundError(`No resource found in collection: Measure, with id: ${parsedParams.id}`);
    }
    if (measure.status !== 'draft') {
      throw new BadRequestError(
        `Measure with id: ${measure.id} has status ${measure.status}. $release may only be used on draft artifacts.`
      );
    }
    checkIsOwned(measure, 'Child artifacts cannot be directly released.');

    measure.status = 'active';
    measure.date = new Date().toISOString();

    // Version behavior source: https://hl7.org/fhir/uv/crmi/1.0.0-snapshot/CodeSystem-crmi-release-version-behavior-codes.html
    if (parsedParams.versionBehavior === 'check') {
      logger.info('Applying check version behavior');
      // check: if the root artifact has a specified version different from the version passed in, an error will be returned
      // Developer note: this is assumed to be the behavior for child artifacts as well
      if (parsedParams.releaseVersion !== measure.version) {
        throw new BadRequestError(
          `Measure with id: ${measure.id} has version ${measure.version}, which does not match the passed release version ${parsedParams.releaseVersion}`
        );
      }
    } else if (parsedParams.versionBehavior === 'force') {
      logger.info('Applying force version behavior');
      // force: version provided will be applied to the root and all children, regardless of whether a version was already specified
      measure.version = parsedParams.releaseVersion;
    } else {
      logger.info('Applying default version behavior');
      // default: version provided will be applied to the root artifact and all children if a version is not specified.
      // Developer note: this is currently a null operation because version is a required field
    }

    // recursively get any child artifacts from the artifact if they exist
    const children = measure.relatedArtifact ? await getChildren(measure.relatedArtifact) : [];
    children.forEach(child => {
      child.status = 'active';
      child.date = new Date().toISOString();
      if (parsedParams.versionBehavior === 'check') {
        if (parsedParams.releaseVersion !== child.version) {
          throw new BadRequestError(
            `Child artifact with id: ${child.id} has version ${child.version}, which does not match the passed release version ${parsedParams.releaseVersion}`
          );
        }
      } else if (parsedParams.versionBehavior === 'force') {
        child.version = parsedParams.releaseVersion;
      }
    });

    // batch update the released parent Measure and any of its children
    const releasedArtifacts = await batchUpdate([measure, ...(await Promise.all(children))], 'release');

    // return a Bundle containing the updated artifacts
    return createBatchResponseBundle(releasedArtifacts);
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
