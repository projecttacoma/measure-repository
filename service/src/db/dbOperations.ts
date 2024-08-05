import { FhirResourceType, loggers } from '@projecttacoma/node-fhir-server-core';
import { Filter } from 'mongodb';
import { Connection } from './Connection';
import { ArtifactResourceType, FhirArtifact } from '../types/service-types';

const logger = loggers.get('default');

/**
 * searches the database for the desired resource and returns the data
 */
export async function findResourceById<T extends fhir4.FhirResource>(id: string, resourceType: FhirResourceType) {
  const collection = Connection.db.collection(resourceType);
  return collection.findOne<T>({ id: id }, { projection: { _id: 0, _dataRequirements: 0 } });
}

/**
 * Retrieves the artifact of the given type with the given url and version
 */
export async function findArtifactByUrlAndVersion<T extends FhirArtifact>(
  url: string,
  version: string,
  resourceType: ArtifactResourceType
) {
  const collection = Connection.db.collection(resourceType);
  return collection.findOne<T>({ url, version }, { projection: { _id: 0 } });
}

/**
 * searches the database and returns an array of all resources of the given type that match the given query
 */
export async function findResourcesWithQuery<T extends fhir4.FhirResource>(
  query: Filter<any>,
  resourceType: FhirResourceType
) {
  const collection = Connection.db.collection(resourceType);
  query._dataRequirements = { $exists: false };
  query._summary = { $exists: false };
  query._elements = { $exists: false };
  return collection.find<T>(query, { projection: { _id: 0, _dataRequirements: 0 } }).toArray();
}

/**
 * searches the database and returns an array of all resources of the given type that match the given query
 * but the resources only include the elements specified by the _elements parameter
 */
export async function findResourceElementsWithQuery<T extends fhir4.FhirResource>(
  query: Filter<any>,
  resourceType: FhirResourceType
) {
  const collection = Connection.db.collection(resourceType);

  // if the resourceType is Library, then we want to include type in the projection
  const projection: any =
    resourceType === 'Library' ? { status: 1, resourceType: 1, type: 1 } : { status: 1, resourceType: 1 };

  (query._elements as string[]).forEach(elem => {
    projection[elem] = 1;
  });
  projection['_id'] = 0;
  query._dataRequirements = { $exists: false };
  query._summary = { $exists: false };
  query._elements = { $exists: false };
  return collection.find<T>(query, { projection: projection }).toArray();
}

/**
 *
 * searches the database for all resources of the given type that match the given query
 * but only returns the number of matches
 */
export async function findResourceCountWithQuery(query: Filter<any>, resourceType: FhirResourceType) {
  const collection = Connection.db.collection(resourceType);
  query._dataRequirements = { $exists: false };
  query._summary = { $exists: false };
  query._elements = { $exists: false };
  return collection.countDocuments(query);
}

/**
 * searches the database for the data requirements Library resource of the desired artifact and parameters
 */
export async function findDataRequirementsWithQuery<T extends fhir4.Library>(query: Filter<any>) {
  const collection = Connection.db.collection('Library');
  return collection.findOne<T>({ _dataRequirements: query }, { projection: { _id: 0, _dataRequirements: 0, url: 0 } });
}

/**
 * Inserts one data object into database with specified FHIR resource type
 */
export async function createResource(data: fhir4.FhirResource, resourceType: string) {
  const collection = Connection.db.collection<fhir4.FhirResource>(resourceType);
  logger.info(`Inserting ${resourceType}/${data.id} into database`);
  await collection.insertOne(data);
  return { id: data.id as string };
}

/**
 * Searches for a document for a resource and updates it if found, creates it if not
 */
export async function updateResource(id: string, data: fhir4.FhirResource, resourceType: string) {
  const collection = Connection.db.collection(resourceType);
  logger.debug(`Finding and updating ${resourceType}/${data.id} in database`);

  const results = await collection.replaceOne({ id }, data, { upsert: true });

  // If the document cannot be created with the passed id, Mongo will throw an error
  // before here, so should be ok to just return the passed id
  // upsertedCount indicates that we have created a brand new document
  if (results.upsertedCount === 1) {
    return { id, created: true };
  }

  return { id, created: false };
}

/**
 * Searches for a document for a resource and deletes it if found
 */
export async function deleteResource(id: string, resourceType: string) {
  const collection = Connection.db.collection(resourceType);
  logger.debug(`Finding and deleting ${resourceType}/${id} from database`);
  const results = await collection.deleteOne({ id });
  if (results.deletedCount === 1) {
    return { id, deleted: true };
  }
  return { id, deleted: false };
}

/**
 * Inserts a parent artifact and all of its children (if applicable) in a batch
 * Error message depends on whether draft or cloned artifacts are being inserted
 */
export async function batchInsert(artifacts: FhirArtifact[], action: string) {
  let error = null;
  const results: FhirArtifact[] = [];
  const insertSession = Connection.connection?.startSession();
  try {
    await insertSession?.withTransaction(async () => {
      for (const artifact of artifacts) {
        const collection = await Connection.db.collection(artifact.resourceType);
        await collection.insertOne(artifact as any, { session: insertSession });
        results.push(artifact);
      }
    });
    console.log(`Batch ${action} transaction committed.`);
  } catch (err) {
    console.log(`Batch ${action} transaction failed: ` + err);
    error = err;
  } finally {
    await insertSession?.endSession();
  }
  if (error) throw error;
  return results;
}
