import { FhirResourceType } from '@projecttacoma/node-fhir-server-core';
import { Connection } from './Connection';

/**
 * searches the database for the desired resource and returns the data
 */
export async function findResourceById<T extends fhir4.FhirResource>(id: string, resourceType: FhirResourceType) {
  const collection = Connection.db.collection(resourceType);
  return collection.findOne<T>({ id: id }, { projection: { _id: 0 } });
}

export async function findOneResourceWithQuery<T extends fhir4.FhirResource>(
  query: any,
  resourceType: FhirResourceType
) {
  const collection = Connection.db.collection(resourceType);

  return collection.findOne<T>(query, { projection: { _id: 0 } });
}

export async function findResourcesWithQuery<T extends fhir4.FhirResource>(query: any, resourceType: FhirResourceType) {
  const collection = Connection.db.collection(resourceType);
  return (await collection.find<T>(query, { projection: { _id: 0 } })).toArray();
}
