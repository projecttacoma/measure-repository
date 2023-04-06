import { v4 as uuidv4 } from 'uuid';
import { loggers } from '@projecttacoma/node-fhir-server-core';

const logger = loggers.get('default');

export type DetailedEntry = fhir4.BundleEntry & {
  isPost: boolean;
  oldId?: string;
  newId: string;
  status?: number;
  statusText?: string;
  data?: string;
};

/**
 * For entries in a transaction bundle whose IDs will be auto-generated, replace all instances of an existing reference
 * to the old id with a reference to the newly generated one.
 *
 * Modify the request type to PUT after forcing the IDs. This will not affect return results, just internal representation
 */
export function replaceReferences(entries: DetailedEntry[]) {
  entries.forEach(e => {
    logger.debug(`Replacing resourceIds for entry: ${JSON.stringify(e)}`);
    if (e.request?.method === 'POST' && e.resource) {
      e.isPost = true;
      e.oldId = e.resource.id;
      e.newId = uuidv4();
    }
  });

  let entriesStr = JSON.stringify(entries);
  const postEntries = entries.filter(e => e.isPost);

  // For each POST entry, replace existing references across all entries
  postEntries.forEach(e => {
    logger.debug(`Replacing referenceIds for entry: ${JSON.stringify(e)}`);
    // Checking full Url and id in separate replace loops will prevent invalid ResourceType/ResourceId -> urn:uuid references
    if (e.oldId) {
      const idRegexp = new RegExp(`${e.resource?.resourceType}/${e.oldId}`, 'g');
      entriesStr = entriesStr.replace(idRegexp, `${e.resource?.resourceType}/${e.newId}`);
    }
    if (e.fullUrl) {
      const urnRegexp = new RegExp(e.fullUrl, 'g');
      entriesStr = entriesStr.replace(urnRegexp, `${e.resource?.resourceType}/${e.newId}`);
    }
  });

  // Remove metadata and modify request type/resource id
  const newEntries: DetailedEntry[] = JSON.parse(entriesStr).map((e: DetailedEntry) => {
    if (e.isPost) {
      if (e.resource) {
        logger.debug(`Removing metadata and changing request type to PUT for entry: ${JSON.stringify(e)}`);
        e.resource.id = e.newId;
        e.request = {
          method: 'PUT',
          url: `${e.resource?.resourceType}/${e.newId}`
        };
      }
    }
    return { resource: e.resource, request: e.request };
  });
  return newEntries;
}
