import { loggers, RequestArgs, RequestCtx } from '@projecttacoma/node-fhir-server-core';
import { Filter } from 'mongodb';
import { findResourceById, findResourcesWithQuery } from '../db/dbOperations';
import { Service } from '../types/service';
import { createMeasurePackageBundle, createSearchsetBundle } from '../util/bundleUtils';
import { BadRequestError, ResourceNotFoundError } from '../util/errorUtils';
import { getMongoQueryFromRequest } from '../util/queryUtils';
import { gatherParams, validateSearchParams } from '../util/validationUtils';

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
    validateSearchParams(query);
    const parsedQuery = getMongoQueryFromRequest(query);
    const entries = await findResourcesWithQuery<fhir4.Measure>(parsedQuery, 'Measure');
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
      throw new ResourceNotFoundError(`No resource found in collection: Measure, with: id ${args.id}`);
    }
    return result;
  }

  /**
   * result of sending a POST or GET request to {BASE_URL}/4_0_1/Measure/$package or {BASE_URL}/4_0_1/Measure/:id/$package
   * creates a bundle of the measure (specified by parameters) and all dependent libraries
   * supports parameters id and/or url + version (optional)
   */
  async package(args: RequestArgs, { req }: RequestCtx) {
    logger.info(`${req.method} ${req.path}`);

    const params = gatherParams(req.query, args.resource);
    const id = args.id || params.id;
    const url = params.url;
    const version = params.version;

    if (!id && !url) {
      throw new BadRequestError('Must provide identifying information via either id or url parameters');
    }

    // query construction
    const query: Filter<any> = {};
    if (id) query.id = id;
    if (url) query.url = url;
    if (version) query.version = version;
    const measure = await findResourcesWithQuery<fhir4.Measure>(query, 'Measure');
    if (!measure || !(measure.length > 0)) {
      throw new ResourceNotFoundError(
        `No resource found in collection: Measure, with: ${Object.keys(query)
          .map(key => `${key}: ${query[key]}`)
          .join(' and ')}`
      );
    }

    // TODO: should we allow multiple measure matches?
    return createMeasurePackageBundle(measure[0]);
  }
}
