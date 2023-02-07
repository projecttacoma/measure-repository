import { loggers, RequestArgs, RequestCtx, constants } from '@projecttacoma/node-fhir-server-core';
import { createResource, findResourceById, findResourcesWithQuery } from '../db/dbOperations';
import { LibrarySearchArgs, PackageArgs, parseRequestSchema } from '../requestSchemas';
import { Service } from '../types/service';
import { createLibraryPackageBundle, createSearchsetBundle } from '../util/bundleUtils';
import { BadRequestError, ResourceNotFoundError } from '../util/errorUtils';
import { getMongoQueryFromRequest } from '../util/queryUtils';
import { extractIdentificationForQuery, gatherParams, validateParamIdSource, checkContentTypeHeader, checkExpectedResourceType } from '../util/inputUtils';
import { v4 as uuidv4 } from 'uuid';
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
   * result of sending a POST or GET request to:
   * {BASE_URL}/4_0_1/Library/$package or {BASE_URL}/4_0_1/Library/:id/$package
   * creates a bundle of the library (specified by parameters) and all dependent libraries
   * requires parameters id, url, and/or identifier, but also supports version as supplemental (optional)
   */
  async package(args: RequestArgs, { req }: RequestCtx) {
    logger.info(`${req.method} ${req.path}`);

    const params = gatherParams(req.query, args.resource);
    validateParamIdSource(req.params.id, params.id);

    const query = extractIdentificationForQuery(args, params);

    const parsedParams = parseRequestSchema({ ...params, ...query }, PackageArgs);

    return createLibraryPackageBundle(query, parsedParams);
  }

  /**
   * result of sending a POST request to:
   * {BASE_URL}/4_0_1/Library/$submit or a PUT request to: {BASE_URL}/4_0_1/Library/:id/$submit
   * POSTs/PUTs a new artifact in "draft" status. The operation results in an error if the artifact
   * does not have status set to "draft."
   */
  async submit(args: RequestArgs, { req }: RequestCtx) {
    logger.info(`${req.method} ${req.path}`);

    const contentType: string | undefined = req.headers['content-type'];
    checkContentTypeHeader(contentType);

    const resource = req.body;
    checkExpectedResourceType(resource.resourceType, 'Library');

    // check for "draft" status on the resource
    if (resource.status !== 'draft') {
      throw new BadRequestError(`The artifact must be in 'draft' status.`);
    }

    // lastUpdated should be second because it should overwrite a meta.lastUpdated tag in the request body
    resource['meta'] = { ...resource['meta'], lastUpdated: new Date().toISOString() };

    const res = req.res;
    // create new resource with server-defined id
    resource['id'] = uuidv4();
    await createResource(resource, 'Library');
    res.status(201);
    const location = `${constants.VERSIONS['4_0_1']}/Library/${resource.id}`;
    res.set('Content-Location', `${process.env.HOST}/${process.env.PORT}/${location}`);
  }
}
