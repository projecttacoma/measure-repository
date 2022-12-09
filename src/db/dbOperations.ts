import { FhirResourceType } from '@projecttacoma/node-fhir-server-core';
import { Connection } from './Connection';

/**
 * searches the database for the desired resource and returns the data
 */
export const findResourceById = async (id: string, resourceType: FhirResourceType) => {
  const collection = Connection.db.collection(resourceType);
  return collection.findOne({ id: id }, { projection: { _id: 0 } }) as any;
};
