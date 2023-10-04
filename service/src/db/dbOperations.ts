import { FhirResourceType, loggers } from '@projecttacoma/node-fhir-server-core';
import { Filter } from 'mongodb';
import { Connection } from './Connection';

const logger = loggers.get('default');

/**
 * searches the database for the desired resource and returns the data
 */
export async function findResourceById<T extends fhir4.FhirResource>(id: string, resourceType: FhirResourceType) {
  const collection = Connection.db.collection(resourceType);
  return collection.findOne<T>({ id: id, _dataRequirements: { $exists: false } }, { projection: { _id: 0 } });
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
  return collection.find<T>(query, { projection: { _id: 0, _dataRequirements: 0 } }).toArray();
}

/**
 * searches the database for the data requirements Library resource of the desired artifact and parameters
 */
export async function findDataRequirementsWithQuery<T extends fhir4.Library>(query: Filter<any>) {
  const collection = Connection.db.collection('Library');
  return collection.findOne<T>({ _dataRequirements: query }, { projection: { _id: 0, _dataRequirements: 0 } });
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
