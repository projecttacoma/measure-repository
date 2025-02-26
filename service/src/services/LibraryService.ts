import { loggers, RequestArgs, RequestCtx } from '@projecttacoma/node-fhir-server-core';
import {
  batchDelete,
  batchInsert,
  batchUpdate,
  createResource,
  findDataRequirementsWithQuery,
  findResourceById,
  findResourceCountWithQuery,
  findResourceElementsWithQuery,
  findResourcesWithQuery,
  updateResource
} from '../db/dbOperations';
import {
  LibrarySearchArgs,
  LibraryDataRequirementsArgs,
  PackageArgs,
  parseRequestSchema,
  DraftArgs,
  CloneArgs,
  ApproveArgs,
  ReviewArgs,
  ReleaseArgs
} from '../requestSchemas';
import { Service } from '../types/service';
import {
  createBatchResponseBundle,
  createLibraryPackageBundle,
  createPaginationLinks,
  createSearchsetBundle,
  createSummarySearchsetBundle,
  createTransactionResponseBundle
} from '../util/bundleUtils';
import { BadRequestError, ResourceNotFoundError } from '../util/errorUtils';
import { getMongoQueryFromRequest } from '../util/queryUtils';
import {
  extractIdentificationForQuery,
  gatherParams,
  validateParamIdSource,
  checkContentTypeHeader,
  checkExpectedResourceType,
  checkFieldsForCreate,
  checkFieldsForUpdate,
  checkFieldsForDelete,
  checkIsOwned,
  checkAuthoring
} from '../util/inputUtils';
import { v4 as uuidv4 } from 'uuid';
import { Calculator } from 'fqm-execution';
const logger = loggers.get('default');
import { Filter } from 'mongodb';
import { CRMIShareableLibrary, FhirLibraryWithDR } from '../types/service-types';
import {
  createArtifactComment,
  getChildren,
  modifyResourcesForClone,
  modifyResourcesForDraft
} from '../util/serviceUtils';

/*
 * Implementation of a service for the `Library` resource
 * The Service interface contains all possible functions
 */
export class LibraryService implements Service<CRMIShareableLibrary> {
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

    // if the _summary parameter with a value of count is included, then
    // return a searchset bundle that excludes the entries
    // if _count has the value 0, this shall be treated the same as _summary=count
    if (
      (parsedQuery._summary && parsedQuery._summary === 'count') ||
      (parsedQuery._count && parsedQuery._count === '0')
    ) {
      const count = await findResourceCountWithQuery(mongoQuery, 'Library');
      return createSummarySearchsetBundle<CRMIShareableLibrary>(count);
    }
    // if the _elements parameter with a comma-separated string is included
    // then return a searchset bundle that includes only those elements
    // on those resource entries
    else if (parsedQuery._elements) {
      const result = await findResourceElementsWithQuery<CRMIShareableLibrary>(mongoQuery, 'Library');
      // add the SUBSETTED tag to the resources returned by the _elements parameter
      result.data.map(e => {
        if (e.meta) {
          if (e.meta.tag) {
            e.meta.tag.push({ code: 'SUBSETTED', system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationValue' });
          } else {
            e.meta.tag = [{ code: 'SUBSETTED', system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationValue' }];
          }
        } else {
          e.meta = {
            tag: [{ code: 'SUBSETTED', system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationValue' }]
          };
        }
      });
      const bundle = createSearchsetBundle(result.data);
      if (parsedQuery._count) {
        bundle.link = createPaginationLinks(
          `http://${req.headers.host}/${req.params.base_version}/`,
          'Library',
          new URLSearchParams(req.query),
          {
            numberOfPages: Math.ceil(result.total / parseInt(parsedQuery._count)),
            page: parseInt(parsedQuery.page || '1')
          }
        );
      }
      return bundle;
    } else {
      const result = await findResourcesWithQuery<CRMIShareableLibrary>(mongoQuery, 'Library');
      const bundle = createSearchsetBundle(result.data);
      if (parsedQuery._count) {
        bundle.link = createPaginationLinks(
          `http://${req.headers.host}/${req.params.base_version}/`,
          'Library',
          new URLSearchParams(req.query),
          {
            numberOfPages: Math.ceil(result.total / parseInt(parsedQuery._count)),
            page: parseInt(parsedQuery.page || '1')
          }
        );
      }
      return bundle;
    }
  }

  /**
   * result of sending a GET request to {BASE_URL}/4_0_1/Library/{id}
   * searches for the library with the passed in id
   */
  async searchById(args: RequestArgs) {
    logger.info(`GET /Library/${args.id}`);
    const result = await findResourceById<CRMIShareableLibrary>(args.id, 'Library');
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
    checkFieldsForCreate(resource);
    resource['id'] = uuidv4();
    return createResource(resource, 'Library');
  }

  /**
   * retire: only updates a library with status 'active' to have status 'retired'
   * and any resources it is composed of
   *
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
    const oldResource = (await findResourceById(resource.id, resource.resourceType)) as CRMIShareableLibrary | null;
    // note: the distance between this database call and the update resource call, could cause a race condition
    if (oldResource) {
      checkFieldsForUpdate(resource, oldResource);

      if (resource.status === 'retired') {
        // because we are changing the status/date of artifact, we want to also do so for
        // any resources it is composed of
        const children = oldResource.relatedArtifact ? await getChildren(oldResource.relatedArtifact) : [];
        children.forEach(child => {
          child.status = resource.status;
          child.date = resource.date;
        });

        // now we want to batch update the retired parent Library and any of its children
        await batchUpdate([resource, ...(await Promise.all(children))], 'retire');

        return { id: args.id, created: false };
      }
    } else {
      checkFieldsForCreate(resource);
    }

    return updateResource(args.id, resource, 'Library');
  }

  /**
   * archive: deletes a library and any resources it is composed of with 'retried' status
   * withdraw: deletes a library and any resources it is composed of with 'draft' status
   * result of sending a DELETE request to {BASE_URL}/4_0_1/Library/{id}
   * deletes the library with the passed in id if it exists in the database
   * as well as all resources it is composed of
   * requires id parameter
   */
  async remove(args: RequestArgs) {
    const library = await findResourceById<CRMIShareableLibrary>(args.id, 'Library');
    if (!library) {
      throw new ResourceNotFoundError(`No resource found in collection: Library, with id: ${args.id}`);
    }
    checkFieldsForDelete(library);
    const archiveOrWithdraw = library.status === 'retired' ? 'archive' : 'withdraw';
    checkIsOwned(
      library,
      `Child artifacts cannot be directly ${archiveOrWithdraw === 'archive' ? 'archived' : 'withdrawn'}`
    );

    // recursively get any child artifacts from the artifact if they exist
    const children = library.relatedArtifact ? await getChildren(library.relatedArtifact) : [];

    // now we want to batch delete (archive/withdraw) the Library artifact and any of its children
    const newDeletes = await batchDelete([library, ...children], archiveOrWithdraw);

    // we want to return a Bundle containing the deleted artifacts
    return createTransactionResponseBundle(newDeletes);
  }

  /**
   * result of sending a POST or GET request to:
   * {BASE_URL}/4_0_1/Library/$draft or {BASE_URL}/4_0_1/Library/[id]/$draft
   * drafts a new version of an existing Library artifact in active status,
   * as well as for all resource it is composed of
   * requires id and version parameters
   */
  async draft(args: RequestArgs, { req }: RequestCtx) {
    logger.info(`${req.method} ${req.path}`);

    // checks that the authoring environment variable is true
    checkAuthoring();

    if (req.method === 'POST') {
      const contentType: string | undefined = req.headers['content-type'];
      checkContentTypeHeader(contentType);
    }

    const params = gatherParams(req.query, args.resource);
    validateParamIdSource(req.params.id, params.id);

    const query = extractIdentificationForQuery(args, params);

    const parsedParams = parseRequestSchema({ ...params, ...query }, DraftArgs);

    const activeLibrary = await findResourceById<CRMIShareableLibrary>(parsedParams.id, 'Library');
    if (!activeLibrary) {
      throw new ResourceNotFoundError(`No resource found in collection: Library, with id: ${args.id}`);
    }
    if (activeLibrary.status !== 'active') {
      throw new BadRequestError('Authoring repository service drafting may only be made to active status resources.');
    }
    checkIsOwned(activeLibrary, 'Child artifacts cannot be directly drafted');

    // recursively get any child artifacts from the artifact if they exist
    const children = activeLibrary.relatedArtifact ? await getChildren(activeLibrary.relatedArtifact) : [];

    const draftArtifacts = await modifyResourcesForDraft(
      [activeLibrary, ...(await Promise.all(children))],
      params.version
    );

    // now we want to batch insert the parent Library artifact and any of its children
    const newDrafts = await batchInsert(draftArtifacts, 'draft');

    // we want to return a Bundle containing the created artifacts
    return createBatchResponseBundle(newDrafts);
  }

  /**
   * result of sending a POST or GET request to:
   * {BASE_URL}/4_0_1/Library/$clone or {BASE_URL}/4_0_1/Library/[id]/$clone
   * clones a new knowledge artifact based on the contents of an existing artifact,
   * as well as for all resources it is composed of
   * requires id, url, and version parameters
   */
  async clone(args: RequestArgs, { req }: RequestCtx) {
    logger.info(`${req.method} ${req.path}`);

    // checks that the authoring environment variable is true
    checkAuthoring();

    if (req.method === 'POST') {
      const contentType: string | undefined = req.headers['content-type'];
      checkContentTypeHeader(contentType);
    }

    const params = gatherParams(req.query, args.resource);
    validateParamIdSource(req.params.id, params.id);

    const query = extractIdentificationForQuery(args, params);

    const parsedParams = parseRequestSchema({ ...params, ...query }, CloneArgs);

    const library = await findResourceById<CRMIShareableLibrary>(parsedParams.id, 'Library');
    if (!library) {
      throw new ResourceNotFoundError(`No resource found in collection: Library, with id: ${parsedParams.id}`);
    }
    library.url = parsedParams.url;
    checkIsOwned(library, 'Child artifacts cannot be directly cloned.');

    // recursively get any child artifacts from the artifact if they exist
    const children = library.relatedArtifact ? await getChildren(library.relatedArtifact) : [];
    children.forEach(child => {
      child.url = child.url + '-clone';
    });

    const clonedArtifacts = await modifyResourcesForClone([library, ...(await Promise.all(children))], params.version);

    // now we want to batch insert the cloned parent Library artifact and any of its children
    const newClones = await batchInsert(clonedArtifacts, 'clone');

    // we want to return a Bundle containing the created artifacts
    return createBatchResponseBundle(newClones);
  }

  /**
   * result of sending a POST or GET request to:
   * {BASE_URL}/4_0_1/Library/$approve or {BASE_URL}/4_0_1/Library/[id]/$approve
   * applies an approval to an existing artifact, regardless of status, and sets the
   * date and approvalDate elements of the approved artifact as well as for all resources
   * it is composed of. The user can optionally provide an artifactAssessmentType and an
   * artifactAssessmentSummary for an cqfm-artifactComment extension.
   */
  async approve(args: RequestArgs, { req }: RequestCtx) {
    logger.info(`${req.method} ${req.path}`);

    // checks that the authoring environment variable is true
    checkAuthoring();

    if (req.method === 'POST') {
      const contentType: string | undefined = req.headers['content-type'];
      checkContentTypeHeader(contentType);
    }

    const params = gatherParams(req.query, args.resource);
    validateParamIdSource(req.params.id, params.id);

    const query = extractIdentificationForQuery(args, params);

    const parsedParams = parseRequestSchema({ ...params, ...query }, ApproveArgs);

    const library = await findResourceById<CRMIShareableLibrary>(parsedParams.id, 'Library');
    if (!library) {
      throw new ResourceNotFoundError(`No resource found in collection: Library, with id: ${parsedParams.id}`);
    }
    if (parsedParams.artifactAssessmentType && parsedParams.artifactAssessmentSummary) {
      const comment = createArtifactComment(
        parsedParams.artifactAssessmentType,
        parsedParams.artifactAssessmentSummary,
        parsedParams.artifactAssessmentTarget,
        parsedParams.artifactAssessmentRelatedArtifact,
        parsedParams.artifactAssessmentAuthor
      );
      if (library.extension) {
        library.extension.push(comment);
      } else {
        library.extension = [comment];
      }
    }
    library.date = new Date().toISOString();
    library.approvalDate = parsedParams.approvalDate ?? new Date().toISOString();
    checkIsOwned(library, 'Child artifacts cannot be directly approved.');

    // recursively get any child artifacts from the artifact if they exist
    const children = library.relatedArtifact ? await getChildren(library.relatedArtifact) : [];
    children.forEach(child => {
      if (parsedParams.artifactAssessmentType && parsedParams.artifactAssessmentSummary) {
        const comment = createArtifactComment(
          parsedParams.artifactAssessmentType,
          parsedParams.artifactAssessmentSummary,
          parsedParams.artifactAssessmentTarget,
          parsedParams.artifactAssessmentRelatedArtifact,
          parsedParams.artifactAssessmentAuthor
        );
        if (child.extension) {
          child.extension.push(comment);
        } else {
          child.extension = [comment];
        }
      }
      child.date = new Date().toISOString();
      child.approvalDate = parsedParams.approvalDate ?? new Date().toISOString();
    });

    // now we want to batch update the approved parent Library and any of its children
    const approvedArtifacts = await batchUpdate([library, ...(await Promise.all(children))], 'approve');

    // we want to return a Bundle containing the updated artifacts
    return createBatchResponseBundle(approvedArtifacts);
  }

  /**
   * result of sending a POST or GET request to:
   * {BASE_URL}/4_0_1/Library/$review or {BASE_URL}/4_0_1/Library/[id]/$review
   * applies a review to an existing artifact, regardless of status, and sets the
   * date and lastReviewDate elements of the reviewed artifact as well as for all resources
   * it is composed of. The user can optionally provide an artifactAssessmentType and an
   * artifactAssessmentSummary for an cqfm-artifactComment extension.
   */
  async review(args: RequestArgs, { req }: RequestCtx) {
    logger.info(`${req.method} ${req.path}`);

    // checks that the authoring environment variable is true
    checkAuthoring();

    if (req.method === 'POST') {
      const contentType: string | undefined = req.headers['content-type'];
      checkContentTypeHeader(contentType);
    }

    const params = gatherParams(req.query, args.resource);
    validateParamIdSource(req.params.id, params.id);

    const query = extractIdentificationForQuery(args, params);

    const parsedParams = parseRequestSchema({ ...params, ...query }, ReviewArgs);

    const library = await findResourceById<CRMIShareableLibrary>(parsedParams.id, 'Library');
    if (!library) {
      throw new ResourceNotFoundError(`No resource found in collection: Library, with id: ${parsedParams.id}`);
    }
    if (parsedParams.artifactAssessmentType && parsedParams.artifactAssessmentSummary) {
      const comment = createArtifactComment(
        parsedParams.artifactAssessmentType,
        parsedParams.artifactAssessmentSummary,
        parsedParams.artifactAssessmentTarget,
        parsedParams.artifactAssessmentRelatedArtifact,
        parsedParams.artifactAssessmentAuthor
      );
      if (library.extension) {
        library.extension.push(comment);
      } else {
        library.extension = [comment];
      }
    }
    library.date = new Date().toISOString();
    library.lastReviewDate = parsedParams.reviewDate ?? new Date().toISOString();
    checkIsOwned(library, 'Child artifacts cannot be directly reviewed.');

    // recursively get any child artifacts from the artifact if they exist
    const children = library.relatedArtifact ? await getChildren(library.relatedArtifact) : [];
    children.forEach(child => {
      if (parsedParams.artifactAssessmentType && parsedParams.artifactAssessmentSummary) {
        const comment = createArtifactComment(
          parsedParams.artifactAssessmentType,
          parsedParams.artifactAssessmentSummary,
          parsedParams.artifactAssessmentTarget,
          parsedParams.artifactAssessmentRelatedArtifact,
          parsedParams.artifactAssessmentAuthor
        );
        if (child.extension) {
          child.extension.push(comment);
        } else {
          child.extension = [comment];
        }
      }
      child.date = new Date().toISOString();
      child.lastReviewDate = parsedParams.reviewDate ?? new Date().toISOString();
    });

    // now we want to batch update the reviewed parent Library and any of its children
    const reviewedArtifacts = await batchUpdate([library, ...(await Promise.all(children))], 'review');

    // we want to return a Bundle containing the updated artifacts
    return createBatchResponseBundle(reviewedArtifacts);
  }

  /**
   * result of sending a POST or GET request to:
   * {BASE_URL}/4_0_1/Library/$release or {BASE_URL}/4_0_1/Library/[id]/$release
   * releases an artifact, updating the status of an existing draft artifact to active and
   * setting the date element of the resource. Also sets the version and recursively releases
   * child artifacts according to the versionBehavior parameter.
   */
  async release(args: RequestArgs, { req }: RequestCtx) {
    logger.info(`${req.method} ${req.path}`);

    // checks that the authoring environment variable is true
    checkAuthoring();

    if (req.method === 'POST') {
      const contentType: string | undefined = req.headers['content-type'];
      checkContentTypeHeader(contentType);
    }

    const params = gatherParams(req.query, args.resource);
    validateParamIdSource(req.params.id, params.id);
    const query = extractIdentificationForQuery(args, params);
    const parsedParams = parseRequestSchema({ ...params, ...query }, ReleaseArgs);

    const library = await findResourceById<CRMIShareableLibrary>(parsedParams.id, 'Library');
    if (!library) {
      throw new ResourceNotFoundError(`No resource found in collection: Library, with id: ${parsedParams.id}`);
    }
    if (library.status !== 'draft') {
      throw new BadRequestError(
        `Library with id: ${library.id} has status ${library.status}. $release may only be used on draft artifacts.`
      );
    }
    checkIsOwned(library, 'Child artifacts cannot be directly released.');

    library.status = 'active';
    library.date = new Date().toISOString();

    // Version behavior source: https://hl7.org/fhir/uv/crmi/1.0.0-snapshot/CodeSystem-crmi-release-version-behavior-codes.html
    if (parsedParams.versionBehavior === 'check') {
      logger.info('Applying check version behavior');
      // check: if the root artifact has a specified version different from the version passed in, an error will be returned
      // Developer note: this is assumed to be the behavior for child artifacts as well
      if (parsedParams.releaseVersion !== library.version) {
        throw new BadRequestError(
          `Library with id: ${library.id} has version ${library.version}, which does not match the passed release version ${parsedParams.releaseVersion}`
        );
      }
    } else if (parsedParams.versionBehavior === 'force') {
      logger.info('Applying force version behavior');
      // force: version provided will be applied to the root and all children, regardless of whether a version was already specified
      library.version = parsedParams.releaseVersion;
    } else {
      logger.info('Applying default version behavior');
      // default: version provided will be applied to the root artifact and all children if a version is not specified.
      // Developer note: this is currently a null operation because version is a required field
    }

    // recursively get any child artifacts from the artifact if they exist
    const children = library.relatedArtifact ? await getChildren(library.relatedArtifact) : [];
    children.forEach(child => {
      child.status = 'active';
      child.date = new Date().toISOString();
      if (parsedParams.versionBehavior === 'check') {
        if (parsedParams.releaseVersion !== child.version) {
          throw new BadRequestError(
            `Child artifact with id: ${child.id} has version ${child.version}, which does not match the passed release version ${parsedParams.releaseVersion}`
          );
        }
      } else if (parsedParams.versionBehavior === 'force') {
        child.version = parsedParams.releaseVersion;
      }
    });

    // batch update the released parent Library and any of its children
    const releasedArtifacts = await batchUpdate([library, ...(await Promise.all(children))], 'release');

    // return a Bundle containing the updated artifacts
    return createBatchResponseBundle(releasedArtifacts);
  }

  /**
   * result of sending a POST or GET request to:
   * {BASE_URL}/4_0_1/Library/$cqfm.package or {BASE_URL}/4_0_1/Library/:id/$cqfm.package
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

    // check to see if data requirements were already calculated for this Library and params
    const dataReqsQuery: Filter<any> = {};
    Object.entries(parsedParams).forEach(p => {
      if (p[0] === 'id') {
        dataReqsQuery.resourceId = p[1] as string;
      } else {
        dataReqsQuery[p[0]] = p[1] as string;
      }
    });

    const dataReqs = await findDataRequirementsWithQuery(dataReqsQuery);

    // if data requirements were already calculated for this Library and params, return them
    if (dataReqs) {
      logger.info('Successfully retrieved $data-requirements report from cache.');
      return dataReqs;
    }

    logger.info(`${req.method} ${req.path}`);

    const { libraryBundle, rootLibRef } = await createLibraryPackageBundle(query, parsedParams);

    const dataRequirements = await Calculator.calculateLibraryDataRequirements(libraryBundle, {
      ...(rootLibRef && { rootLibRef })
    });

    dataRequirements.results['id'] = uuidv4();

    // add the data requirements query params to the data requirements Library resource and add to the Library collection
    const results = { ...dataRequirements.results } as FhirLibraryWithDR;
    results['_dataRequirements'] = dataReqsQuery;
    results.url = `Library/${dataRequirements.results.id}`;
    createResource(results, 'Library');

    logger.info('Successfully generated $data-requirements report');
    return dataRequirements.results;
  }
}
