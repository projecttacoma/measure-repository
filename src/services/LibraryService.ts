import { loggers, RequestArgs, RequestCtx } from '@projecttacoma/node-fhir-server-core';
import { findResourceById, findResourcesWithQuery } from '../db/dbOperations';
import { CoreSearchArgs, PackageArgs } from '../requestSchemas';
import { Service } from '../types/service';
import { createLibraryPackageBundle, createSearchsetBundle } from '../util/bundleUtils';
import { ResourceNotFoundError } from '../util/errorUtils';
import { getMongoQueryFromRequest } from '../util/queryUtils';
import { extractIdentificationForQuery, gatherParams, validateParamIdSource } from '../util/inputUtils';
const logger = loggers.get('default');

/*
 * Implementation of a service for the `Library` resource
 * The Service interface contains all possible functions
 */
export class LibraryService implements Service<fhir4.Library> {
  /**
   * result of sending a GET request to {BASE_URL}/4_0_1/Library?{QUERY}
   * searches for all libraries that match the included query and returns a FHIR searchset Bundle
   */
  async search(_: RequestArgs, { req }: RequestCtx) {
    logger.info(`GET /Library`);
    let { query } = req;
    logger.debug(`Request Query: ${JSON.stringify(query, null, 2)}`);
    query = CoreSearchArgs.parse(query);
    const parsedQuery = getMongoQueryFromRequest(query);
    const entries = await findResourcesWithQuery<fhir4.Library>(parsedQuery, 'Library');
    return createSearchsetBundle(entries);
  }

  /**
   * result of sending a GET request to {BASE_URL}/4_0_1/Library/{id}
   * searches for the library with the passed in id
   */
  async searchById(args: RequestArgs) {
    logger.info(`GET /Library/${args.id}`);
    const result = await findResourceById<fhir4.Library>(args.id, 'Library');
    if (!result) {
      throw new ResourceNotFoundError(`No resource found in collection: Library, with id: ${args.id}`);
    }
    return result;
  }

  /**
   * result of sending a POST or GET request to:
   * {BASE_URL}/4_0_1/Library/$package or {BASE_URL}/4_0_1/Library/:id/$package
   * creates a bundle of the library (specified by parameters) and all dependent libraries
   * requires parameters id, url, and/or identifier, but also supports version as supplemental (optional)
   */
  async package(args: RequestArgs, { req }: RequestCtx) {
    logger.info(`${req.method} ${req.path}`);

    let params = gatherParams(req.query, args.resource);
    validateParamIdSource(req.params.id, params.id);

    const query = extractIdentificationForQuery(args, params);

    params = PackageArgs.parse({ ...params, ...query });

    return createLibraryPackageBundle(query);
  }
}
