import { loggers, RequestArgs, RequestCtx } from '@projecttacoma/node-fhir-server-core';
import {
  createResource,
  findDataRequirementsWithQuery,
  findResourceById,
  findResourceCountWithQuery,
  findResourceElementsWithQuery,
  findResourcesWithQuery,
  updateResource
} from '../db/dbOperations';
import { Service } from '../types/service';
import { createMeasurePackageBundle, createSearchsetBundle, createSummarySearchsetBundle } from '../util/bundleUtils';
import { BadRequestError, ResourceNotFoundError } from '../util/errorUtils';
import { getMongoQueryFromRequest } from '../util/queryUtils';
import {
  extractIdentificationForQuery,
  gatherParams,
  validateParamIdSource,
  checkContentTypeHeader,
  checkExpectedResourceType
} from '../util/inputUtils';
import { Calculator } from 'fqm-execution';
import { MeasureSearchArgs, MeasureDataRequirementsArgs, PackageArgs, parseRequestSchema } from '../requestSchemas';
import { v4 as uuidv4 } from 'uuid';
import { Filter } from 'mongodb';
import { FhirLibraryWithDR } from '../types/service-types';

const logger = loggers.get('default');

/*
 * Implementation of a service for the `Measure` resource
 * The Service interface contains all possible functions
 */
export class MeasureService implements Service<fhir4.Measure> {
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
      return createSummarySearchsetBundle<fhir4.Measure>(count);
    }
    // if the _elements parameter with a comma-separated string is included
    // then return a searchset bundle that includes only those elements
    // on those resource entries
    else if (parsedQuery._elements) {
      const entries = await findResourceElementsWithQuery<fhir4.Measure>(mongoQuery, 'Measure');
      return createSearchsetBundle(entries);
    } else {
      const entries = await findResourcesWithQuery<fhir4.Measure>(mongoQuery, 'Measure');
      return createSearchsetBundle(entries);
    }
  }

  /**
   * result of sending a GET request to {BASE_URL}/4_0_1/Measure/{id}
   * searches for the measure with the passed in id
   */
  async searchById(args: RequestArgs) {
    logger.info(`GET /Measure/${args.id}`);
    const result = await findResourceById<fhir4.Measure>(args.id, 'Measure');
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
    resource['id'] = uuidv4();
    if (resource.status != 'active') {
      resource.status = 'active';
      logger.warn(`Resource ${resource.id} has been coerced to active`);
    }
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
    if (resource.status != 'active') {
      resource.status = 'active';
      logger.warn(`Resource ${resource.id} has been coerced to active`);
    }
    return updateResource(args.id, resource, 'Measure');
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
