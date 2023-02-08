import { loggers, RequestArgs, RequestCtx } from '@projecttacoma/node-fhir-server-core';
import { findResourceById, findResourcesWithQuery } from '../db/dbOperations';
import { Service } from '../types/service';
import { createMeasurePackageBundle, createSearchsetBundle } from '../util/bundleUtils';
import { ResourceNotFoundError } from '../util/errorUtils';
import { getMongoQueryFromRequest } from '../util/queryUtils';
import { extractIdentificationForQuery, gatherParams, validateParamIdSource } from '../util/inputUtils';
import { Calculator } from 'fqm-execution';
import { CoreSearchArgs, DataRequirementsArgs, PackageArgs } from '../requestSchemas';

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
    let { query } = req;
    logger.debug(`Request Query: ${JSON.stringify(query, null, 2)}`);
    query = CoreSearchArgs.parse(query);
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
      throw new ResourceNotFoundError(`No resource found in collection: Measure, with id: ${args.id}`);
    }
    return result;
  }

  /**
   * result of sending a POST or GET request to:
   * {BASE_URL}/4_0_1/Measure/$package or {BASE_URL}/4_0_1/Measure/:id/$package
   * creates a bundle of the measure (specified by parameters) and all dependent libraries
   * requires parameters id and/or url and/or identifier, but also supports version as supplemental (optional)
   */
  async package(args: RequestArgs, { req }: RequestCtx) {
    logger.info(`${req.method} ${req.path}`);

    let params = gatherParams(req.query, args.resource);
    validateParamIdSource(req.params.id, params.id);

    const query = extractIdentificationForQuery(args, params);

    params = PackageArgs.parse({ ...params, ...query });

    return createMeasurePackageBundle(query);
  }

  /**
   * result of sending a POST or GET request to:
   * {BASE_URL}/4_0_1/Measure/$data-requirements or {BASE_URL}/4_0_1/Measure/:id/$data-requirements
   * creates a Library with all data requirements for the specified measure
   * requires parameters id and/or url and/or identifier, but also supports version as supplemental (optional)
   */
  async dataRequirements(args: RequestArgs, { req }: RequestCtx) {
    let params = gatherParams(req.query, args.resource);
    validateParamIdSource(req.params.id, params.id);
    const query = extractIdentificationForQuery(args, params);
    params = DataRequirementsArgs.parse({ ...params, ...query });

    logger.info(`${req.method} ${req.path}`);

    const measureBundle = await createMeasurePackageBundle(query);

    // See https://jira.hl7.org/browse/FHIR-40230
    // periodStart and periodEnd should be optional. Right now, fqm-execution will default it to 2019.
    // This will be handled in a separate task
    // TODO: Update the fqm-execution dependency and delete this comment block once periodStart/End can safely be excluded
    const { results } = await Calculator.calculateDataRequirements(measureBundle, {
      ...(params.periodStart && { measurementPeriodStart: params.periodStart }),
      ...(params.periodEnd && { measurementPeriodEnd: params.periodEnd })
    });

    logger.info('Successfully generated $data-requirements report');
    return results;
  }
}
