import { FhirResourceType } from '@projecttacoma/node-fhir-server-core';
import { Connection } from './Connection';

/**
 * searches the database for the desired resource and returns the data
 */
export async function findResourceById<T extends fhir4.FhirResource>(id: string, resourceType: FhirResourceType) {
  const collection = Connection.db.collection(resourceType);
  return collection.findOne<T>({ id: id }, { projection: { _id: 0 } });
}
