import { FhirResourceType } from '@projecttacoma/node-fhir-server-core';
import { Filter } from 'mongodb';
import { Connection } from './Connection';

/**
 * searches the database for the desired resource and returns the data
 */
export async function findResourceById<T extends fhir4.FhirResource>(id: string, resourceType: FhirResourceType) {
  const collection = Connection.db.collection(resourceType);
  return collection.findOne<T>({ id: id }, { projection: { _id: 0 } });
}

/**
 * searches the database and returns an array of all resources of the given type that match the given query
 */
export async function findResourcesWithQuery<T extends fhir4.FhirResource>(
  query: Filter<any>,
  resourceType: FhirResourceType
) {
  const collection = Connection.db.collection(resourceType);
  return collection.find<T>(query, { projection: { _id: 0 } }).toArray();
}

export async function createResource(data: any, resourceType: string) {
  const collection = Connection.db.collection(resourceType);
  await collection.insertOne(data);
  return { id: data.id };
}

export async function updateResource(id: string, data: any, resourceType: string) {
  const collection = Connection.db.collection(resourceType);
  const results = await collection.replaceOne({ id }, data, { upsert: true });

  // If the document cannot be created with the passed id, Mongo will throw an error
  // before here, so should be ok to just return the passed id
  // upsertedCount indicates that we have created a brand new document
  if (results.upsertedCount === 1) {
    return { id, created: true };
  }

  // value being present indicates an update, so set created flag to false
  return { id, created: false };
}
