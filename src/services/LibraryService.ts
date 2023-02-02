import { loggers, RequestArgs, RequestCtx, constants } from '@projecttacoma/node-fhir-server-core';
import { Filter } from 'mongodb';
import { findResourceById, findResourcesWithQuery } from '../db/dbOperations';
import { Service } from '../types/service';
import { createLibraryPackageBundle, createSearchsetBundle } from '../util/bundleUtils';
import { BadRequestError, ResourceNotFoundError } from '../util/errorUtils';
import { getMongoQueryFromRequest } from '../util/queryUtils';
import { gatherParams, validateSearchParams, validateParamIdSource } from '../util/validationUtils';

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
    const { query } = req;
    logger.debug(`Request Query: ${JSON.stringify(query, null, 2)}`);
    validateSearchParams(query);
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

    const params = gatherParams(req.query, args.resource);
    validateParamIdSource(req.params.id, params.id);
    const id = args.id || params.id;
    const url = params.url;
    const version = params.version;
    const identifier = params.identifier;

    if (!id && !url && !identifier) {
      throw new BadRequestError(
        'Must provide identifying information via either id, url, or identifier parameters',
        constants.ISSUE.CODE.REQUIRED
      );
    }

    const query: Filter<any> = {};
    if (id) query.id = id;
    if (url) query.url = url;
    if (version) query.version = version;
    if (identifier) query.identifier = identifier;

    const parsedQuery = getMongoQueryFromRequest(query);
    const library = await findResourcesWithQuery<fhir4.Library>(parsedQuery, 'Library');
    if (!library || !(library.length > 0)) {
      throw new ResourceNotFoundError(
        `No resource found in collection: Library, with ${Object.keys(query)
          .map(key => `${key}: ${query[key]}`)
          .join(' and ')}`
      );
    }
    if (library.length > 1) {
      throw new BadRequestError(
        `Multiple resources found in collection: Library, with ${Object.keys(query)
          .map(key => `${key}: ${query[key]}`)
          .join(' and ')}. /Library/$package operation must specify a single Library`
      );
    }

    return createLibraryPackageBundle(library[0], req.query['include-terminology'] ?? false);
  }
}
