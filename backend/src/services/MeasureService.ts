import { loggers, RequestArgs, RequestCtx } from '@projecttacoma/node-fhir-server-core';
import { findResourceById, findResourcesWithQuery } from '../db/dbOperations';
import { Service } from '../types/service';
import { createMeasurePackageBundle, createSearchsetBundle } from '../util/bundleUtils';
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
import { createResource, updateResource } from '../db/dbOperations';

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
    const entries = await findResourcesWithQuery<fhir4.Measure>(mongoQuery, 'Measure');
    return createSearchsetBundle(entries);
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
    // create new id
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
    return updateResource(args.id, resource, 'Measure');
  }

  /**
   * result of sending a POST or GET request to:
   * {BASE_URL}/4_0_1/Measure/$package or {BASE_URL}/4_0_1/Measure/:id/$package
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

    logger.info(`${req.method} ${req.path}`);

    const measureBundle = await createMeasurePackageBundle(query, parsedParams);

    // See https://jira.hl7.org/browse/FHIR-40230
    // periodStart and periodEnd should be optional. Right now, fqm-execution will default it to 2019.
    // This will be handled in a separate task
    // TODO: Update the fqm-execution dependency and delete this comment block once periodStart/End can safely be excluded
    const { results } = await Calculator.calculateDataRequirements(measureBundle, {
      ...(parsedParams.periodStart && { measurementPeriodStart: parsedParams.periodStart }),
      ...(parsedParams.periodEnd && { measurementPeriodEnd: parsedParams.periodEnd })
    });

    logger.info('Successfully generated $data-requirements report');
    return results;
  }
}
