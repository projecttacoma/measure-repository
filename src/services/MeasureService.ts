import { loggers, RequestArgs } from '@projecttacoma/node-fhir-server-core';
import { findResourceById } from '../db/DBOperations';
import { Service } from '../types/service';
import { ResourceNotFoundError } from '../util/errorUtils';

const logger = loggers.get('default');

/*
 * Implementation of a service for the `Measure` resource
 * The Service interface contains all possible functions
 */
export class MeasureService implements Service<fhir4.Measure> {
  // TODO: Remove ts-ignore comment when actually implementing this
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  async search() {
    throw new Error('Not implemented');
  }

  /**
   *
   * result of sending a GET request to {BASE_URL}/4_0_1/Measure/{id}
   * searches for the measure with the passed in id
   */
  async searchById(args: RequestArgs) {
    const result = await findResourceById(args.id, 'Measure');
    logger.info(`GET /Measure/${args.id}`);
    if (!result) {
      throw new ResourceNotFoundError(`No resource found in collection: Measure, with: id ${args.id}`);
    }
    return result as fhir4.Measure;
  }
}
