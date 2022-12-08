import { loggers, RequestArgs } from '@projecttacoma/node-fhir-server-core';
import { findResourceById } from '../db/dbOperations';
import { Service } from '../types/service';
import { ResourceNotFoundError } from '../util/errorUtils';

const logger = loggers.get('default');

/*
 * Implementation of a service for the `Library` resource
 * The Service interface contains all possible functions
 */
export class LibraryService implements Service<fhir4.Library> {
  // TODO: Remove ts-ignore comment when actually implementing this
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  async search() {
    throw new Error('Not implemented');
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
