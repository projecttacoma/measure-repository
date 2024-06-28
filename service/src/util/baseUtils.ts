import { v4 as uuidv4 } from 'uuid';
import { loggers } from '@projecttacoma/node-fhir-server-core';
import { FhirResource, OperationOutcome } from 'fhir/r4';

const logger = loggers.get('default');

export type DetailedEntry = fhir4.BundleEntry<FhirResource> & {
  isPost: boolean;
  oldId?: string;
  newId: string;
  status?: number;
  statusText?: string;
  data?: string;
  outcome?: OperationOutcome;
};

/**
 * Checks entry for Measure type with library and adds isOwned extension to the main Library reference on a Measure's relatedArtifacts
 *
 * returns modified entry and url of owned library
 */
export function addIsOwnedExtension(entry: fhir4.BundleEntry<fhir4.FhirResource>) {
  if (entry.resource?.resourceType && entry.resource?.resourceType === 'Measure' && entry.resource?.library) {
    // get the main Library of the Measure from the library property and the version
    const mainLibrary = entry.resource.library[0];
    const mainLibraryVersion = entry.resource.version;

    // append the version to the end of the library
    const mainLibraryUrl = mainLibraryVersion ? mainLibrary.concat('|', mainLibraryVersion) : mainLibrary;

    // check if relatedArtifacts property exists on the measure, add it if it doesn't
    if (entry.resource.relatedArtifact === undefined) {
      entry.resource.relatedArtifact = [];
    }

    // check if the main library already exists in the relatedArtifacts
    const mainLibraryRA = entry.resource.relatedArtifact.find(
      ra => (ra.url === mainLibraryUrl || ra.resource === mainLibraryUrl) && ra.type === 'composed-of'
    );

    if (mainLibraryRA) {
      // check if the main library's extension array exists and create it if it doesn't
      if (mainLibraryRA.extension) {
        // if it does exist, check that the isOwned extension is not already on it, add it if not
        if (
          mainLibraryRA.extension.find(e => e.url === 'http://hl7.org/fhir/StructureDefinition/artifact-isOwned') ===
          undefined
        )
          mainLibraryRA.extension.push({
            url: 'http://hl7.org/fhir/StructureDefinition/artifact-isOwned',
            valueBoolean: true
          });
      } else {
        mainLibraryRA.extension = [
          { url: 'http://hl7.org/fhir/StructureDefinition/artifact-isOwned', valueBoolean: true }
        ];
      }
    } else {
      entry.resource.relatedArtifact.push({
        type: 'composed-of',
        resource: mainLibraryUrl,
        extension: [{ url: 'http://hl7.org/fhir/StructureDefinition/artifact-isOwned', valueBoolean: true }]
      });
    }
    return { modifiedEntry: entry, url: mainLibraryUrl };
  }
  return { modifiedEntry: entry, url: null };
}

/**
 * Checks ownedUrls for entry url and adds isOwned extension to the resource if found in ownedUrls
 */
export function addLibraryIsOwned(entry: fhir4.BundleEntry<fhir4.FhirResource>, ownedUrls: string[]) {
  // add owned to identified resources (currently assumes these will only be Libraries)
  if (entry.resource?.resourceType === 'Library' && entry.resource.url) {
    const libraryUrl = entry.resource.version
      ? entry.resource.url.concat('|', entry.resource.version)
      : entry.resource.url;
    if (ownedUrls.includes(libraryUrl)) {
      entry.resource.extension
        ? entry.resource.extension.push({
            url: 'http://hl7.org/fhir/StructureDefinition/artifact-isOwned',
            valueBoolean: true
          })
        : (entry.resource.extension = [
            { url: 'http://hl7.org/fhir/StructureDefinition/artifact-isOwned', valueBoolean: true }
          ]);
    }
  }
  return entry;
}

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
