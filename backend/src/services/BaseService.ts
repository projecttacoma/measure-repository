import { loggers, constants, resolveSchema } from '@projecttacoma/node-fhir-server-core';
import { BadRequestError } from '../util/errorUtils';
import { checkContentTypeHeader } from '../util/inputUtils';
import { v4 as uuidv4 } from 'uuid';
import { createResource, updateResource } from '../db/dbOperations';
import path from 'path';
import { DetailedEntry, replaceReferences } from '../util/baseUtils';

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

  if (req.body.type.toLowerCase() != 'transaction') {
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

  const requestsArray = scrubbedEntries.map(async entry => {
    const { method } = entry.request as fhir4.BundleEntryRequest;
    return insertBundleResources(entry, method);
  });
  return Promise.all(requestsArray);
}

/**
 * Inserts bundle Library or Measure resources into the database through create or update.
 */
async function insertBundleResources(entry: DetailedEntry, method: string) {
  if (entry.resource?.resourceType === 'Library' || entry.resource?.resourceType === 'Measure') {
    if (method === 'POST') {
      entry.resource.id = uuidv4();
      const { id } = await createResource(entry.resource, entry.resource.resourceType);
      if (id !== null) {
        entry.status = 201;
        entry.statusText = 'Created';
      }
    }
    if (method === 'PUT') {
      if (entry.resource.id) {
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
    } else {
      throw new BadRequestError(
        `Expected requests of type PUT or POST, received ${method} for ${entry.resource?.resourceType}/${entry.resource?.id}`
      );
    }
  } else {
    throw new BadRequestError('Resource in the entry must be of type Measure or Library.');
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
  const bundle = new Bundle({ type: 'transaction-response', id: uuidv4() });
  bundle.link = {
    url: `${res.req.protocol}://${path.join(res.req.get('host'), res.req.baseUrl)}`,
    relation: 'self'
  };

  const entries: fhir4.BundleEntry[] = [];
  requestResults.forEach(result => {
    const entry = new Bundle({ response: { status: `${result.status} ${result.statusText}` } });
    if (result.status === 200 || result.status === 201) {
      entry.response.location = `${baseVersion}/${result.resource?.resourceType}/${result.resource?.id}`;
    }
    entries.push(entry);
  });

  bundle.entry = entries;
  logger.info('Completed transaction response');
  return bundle;
}
