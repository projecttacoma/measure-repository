import { loggers, RequestArgs, RequestCtx } from '@projecttacoma/node-fhir-server-core';
import { findResourceById, findResourcesWithQuery } from '../db/dbOperations';
import { Service } from '../types/service';
import { createSearchsetBundle } from '../util/bundleUtils';
import { ResourceNotFoundError } from '../util/errorUtils';
import { parseQuery } from '../util/queryUtils';
import { validateSearchParams } from '../util/validationUtils';

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
  async search(args: RequestArgs, { req }: RequestCtx): Promise<fhir4.Bundle<fhir4.Measure>> {
    const { query } = req;
    validateSearchParams(query);
    const parsedQuery = parseQuery(query);
    const entries = (await findResourcesWithQuery(parsedQuery, 'Measure')) as fhir4.Measure[];
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
}
