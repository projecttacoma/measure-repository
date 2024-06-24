import { loggers, constants, resolveSchema } from '@projecttacoma/node-fhir-server-core';
import { BadRequestError } from '../util/errorUtils';
import { checkContentTypeHeader, checkFieldsForCreate, checkFieldsForUpdate } from '../util/inputUtils';
import { v4 as uuidv4 } from 'uuid';
import { createResource, findResourceById, updateResource } from '../db/dbOperations';
import path from 'path';
import { DetailedEntry, addIsOwnedExtension, addLibraryIsOwned, replaceReferences } from '../util/baseUtils';

const logger = loggers.get('default');

/**
 * Uploads a transaction bundle to the server and returns the transaction-response bundle.
 */
export async function uploadTransactionBundle(req: any, res: any) {
  logger.info('POST /');
  const contentType: string | undefined = req.headers['content-type'];
  checkContentTypeHeader(contentType);

  const entries: DetailedEntry[] = req.body.entry;
  const baseVersion: keyof typeof constants.VERSIONS = req.params.base_version;

  if (req.body.resourceType !== 'Bundle') {
    throw new BadRequestError(`Expected 'resourceType: Bundle'. Received 'resourceType: ${req.body.resourceType}'.`);
  }

  if (req.body.type.toLowerCase() !== 'transaction') {
    throw new BadRequestError(`Expected 'type: transaction'. Received 'type: ${req.body.type}'.`);
  }

  const requestResults = await uploadResourcesFromBundle(entries);

  const bundle = makeTransactionResponseBundle(requestResults, res, baseVersion);
  logger.info('Transaction bundle successfully uploaded.');
  return bundle;
}

/**
 * Uploads Library and Measure resources from a transaction bundle to the server.
 */
async function uploadResourcesFromBundle(entries: DetailedEntry[]) {
  logger.info('Inserting Measure and Library resources from transaction bundle');
  const scrubbedEntries = replaceReferences(entries);

  // pre-process to find owned relationships and error as needed
  const ownedUrls: string[] = [];
  const modifiedRequestsArray = scrubbedEntries.map(entry => {
    if (entry.request) {
      const { method } = entry.request;
      if (method !== 'PUT' && method !== 'POST') {
        throw new BadRequestError(
          `Expected requests of type PUT or POST, received ${method} for ${entry.resource?.resourceType}/${entry.resource?.id}`
        );
      } else {
        // if the entry is a Measure, check to see if the isOwned extension needs to be added
        const { modifiedEntry, url } = addIsOwnedExtension(entry);
        if (url) ownedUrls.push(url);
        return modifiedEntry;
      }
    } else {
      throw new BadRequestError('Each entry must contain request details that provide the HTTP details of the action.');
    }
  });

  const requestsArray = modifiedRequestsArray.map(async entry => {
    // add library owned extension
    entry = addLibraryIsOwned(entry, ownedUrls);
    return insertBundleResources(entry as DetailedEntry);
  });
  return Promise.all(requestsArray);
}

/**
 * Inserts Library or Measure resources from Bundle into the database through create or update.
 */
async function insertBundleResources(entry: DetailedEntry) {
  if (entry.resource?.resourceType === 'Library' || entry.resource?.resourceType === 'Measure') {
    if (entry.isPost) {
      checkFieldsForCreate(entry.resource);
      entry.resource.id = uuidv4();
      const { id } = await createResource(entry.resource, entry.resource.resourceType);
      if (id != null) {
        entry.status = 201;
        entry.statusText = 'Created';
      }
    } else {
      if (entry.resource.id) {
        const oldResource = (await findResourceById(entry.resource.id, entry.resource.resourceType)) as
          | fhir4.Library
          | fhir4.Measure
          | null;
        if (oldResource) {
          checkFieldsForUpdate(entry.resource, oldResource);
        } else {
          checkFieldsForCreate(entry.resource);
        }
        const { id, created } = await updateResource(entry.resource.id, entry.resource, entry.resource.resourceType);
        if (created === true) {
          entry.status = 201;
          entry.statusText = 'Created';
        } else if (id != null && created === false) {
          entry.status = 200;
          entry.statusText = 'OK';
        }
      } else {
        throw new BadRequestError('Requests of type PUT must have an id associated with the resource.');
      }
    }
  } else {
    throw new BadRequestError(
      entry.resource
        ? `All resource entries must be of either resourceType 'Measure' or 'Library'. Received resourceType ${entry.resource?.resourceType}.`
        : `All entries must contain resources of resourceType 'Measure' or 'Library'.`
    );
  }
  return entry;
}

/**
 * Creates transaction-response bundle.
 */
function makeTransactionResponseBundle(
  requestResults: DetailedEntry[],
  res: any,
  baseVersion: keyof typeof constants.VERSIONS
) {
  logger.info('Compiling transaction-response bundle');
  const Bundle = resolveSchema(baseVersion, 'bundle');
  const responseBundle = new Bundle({ type: 'transaction-response', id: uuidv4() });
  responseBundle.link = {
    url: `${res.req.protocol}://${path.join(res.req.get('host'), res.req.baseUrl)}`,
    relation: 'self'
  };

  const entries: fhir4.BundleEntry[] = [];
  requestResults.forEach(result => {
    const entry = new Bundle({ response: { status: `${result.status} ${result.statusText}` } });
    if (result.status === 200 || result.status === 201) {
      entry.response.location = `${baseVersion}/${result.resource?.resourceType}/${result.resource?.id}`;
    }
    entry.response.outcome = result.outcome;

    entries.push(entry);
  });

  responseBundle.entry = entries;
  logger.info('Completed transaction response');
  return responseBundle;
}
