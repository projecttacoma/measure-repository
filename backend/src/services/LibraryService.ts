import { loggers, RequestArgs, RequestCtx } from '@projecttacoma/node-fhir-server-core';
import { findResourceById, findResourcesWithQuery, updateResource } from '../db/dbOperations';
import { LibrarySearchArgs, LibraryDataRequirementsArgs, PackageArgs, parseRequestSchema } from '../requestSchemas';
import { createResource } from '../db/dbOperations';
import { Service } from '../types/service';
import { createLibraryPackageBundle, createSearchsetBundle } from '../util/bundleUtils';
import { BadRequestError, ResourceNotFoundError } from '../util/errorUtils';
import { getMongoQueryFromRequest } from '../util/queryUtils';
import {
  extractIdentificationForQuery,
  gatherParams,
  validateParamIdSource,
  checkContentTypeHeader,
  checkExpectedResourceType
} from '../util/inputUtils';
import { v4 as uuidv4 } from 'uuid';
import { Calculator } from 'fqm-execution';
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
    const parsedQuery = parseRequestSchema(query, LibrarySearchArgs);
    const mongoQuery = getMongoQueryFromRequest(parsedQuery);
    const entries = await findResourcesWithQuery<fhir4.Library>(mongoQuery, 'Library');
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
   * result of sending a POST request to {BASE_URL}/4_0_1/Library
   * creates a new Library resource, generates an id for it, and adds it to the database
   */
  async create(_: RequestArgs, { req }: RequestCtx) {
    logger.info(`POST /Library`);
    const contentType: string | undefined = req.headers['content-type'];
    checkContentTypeHeader(contentType);
    const resource = req.body;
    checkExpectedResourceType(resource.resourceType, 'Library');
    // create new id
    resource['id'] = uuidv4();
    return createResource(resource, 'Library');
  }

  /**
   * result of sending a PUT request to {BASE_URL}/4_0_1/Library/{id}
   * updates the library with the passed in id using the passed in data
   * or creates a library with passed in id if it does not exist in the database
   */
  async update(args: RequestArgs, { req }: RequestCtx) {
    logger.info(`PUT /Library/${args.id}`);
    const contentType: string | undefined = req.headers['content-type'];
    checkContentTypeHeader(contentType);
    const resource = req.body;
    checkExpectedResourceType(resource.resourceType, 'Library');
    // Throw error if the id arg in the url does not match the id in the request body
    if (resource.id !== args.id) {
      throw new BadRequestError('Argument id must match request body id for PUT request');
    }
    return updateResource(args.id, resource, 'Library');
  }

  /**
   * result of sending a POST or GET request to:
   * {BASE_URL}/4_0_1/Library/$package or {BASE_URL}/4_0_1/Library/:id/$package
   * creates a bundle of the library (specified by parameters) and all dependent libraries
   * requires parameters id, url, and/or identifier, but also supports version as supplemental (optional)
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

    const { libraryBundle } = await createLibraryPackageBundle(query, parsedParams);

    return libraryBundle;
  }

  /**
   * result of sending a POST or GET request to:
   * {BASE_URL}/4_0_1/Library/$data-requirements or {BASE_URL}/4_0_1/Library/:id/$data-requirements
   * creates a Library with all data requirements for the specified Library
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
    const parsedParams = parseRequestSchema({ ...params, ...query }, LibraryDataRequirementsArgs);

    logger.info(`${req.method} ${req.path}`);

    const { libraryBundle, rootLibRef } = await createLibraryPackageBundle(query, parsedParams);

    const { results } = await Calculator.calculateLibraryDataRequirements(libraryBundle, {
      ...(rootLibRef && { rootLibRef })
    });

    logger.info('Successfully generated $data-requirements report');
    return results;
  }
}
