import { loggers, RequestArgs, RequestCtx } from '@projecttacoma/node-fhir-server-core';
import { findResourceById, findResourcesWithQuery } from '../db/dbOperations';
import { Service } from '../types/service';
import { createSearchsetBundle } from '../util/bundleUtils';
import { ResourceNotFoundError } from '../util/errorUtils';
import { parseQuery } from '../util/queryUtils';
import { validateSearchParams } from '../util/validationUtils';

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
  async search(_: RequestArgs, { req }: RequestCtx): Promise<fhir4.Bundle<fhir4.Library>> {
    const { query } = req;
    validateSearchParams(query);
    const parsedQuery = parseQuery(query);
    const entries = (await findResourcesWithQuery(parsedQuery, 'Library')) as fhir4.Library[];
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
      throw new ResourceNotFoundError(`No resource found in collection: Library, with: id ${args.id}`);
    }
    return result;
  }
}
