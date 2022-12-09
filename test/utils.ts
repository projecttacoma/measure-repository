import { FhirResourceType } from '@projecttacoma/node-fhir-server-core';
import { Connection } from '../src/db/Connection';

const dbUrl = process.env.DATABASE_URL || 'mongodb://localhost:27017/measure-repository-test';

const createTestResource = async (data: fhir4.FhirResource, resourceType: FhirResourceType) => {
  const collection = Connection.db.collection<fhir4.FhirResource>(resourceType);
  await collection.insertOne(data);
  return { id: data.id };
};

export async function cleanUpDb() {
  await Connection.db.dropDatabase();
  await Connection.connection?.close();
}

export async function testSetup(testFixtureList: fhir4.FhirResource[]) {
  await Connection.connect(dbUrl);

  for (const resource of testFixtureList) {
    await createTestResource(resource, resource.resourceType);
  }
}
