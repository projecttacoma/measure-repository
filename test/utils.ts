import { FhirResourceType } from '@projecttacoma/node-fhir-server-core';
import { Connection } from '../src/db/Connection';

const createTestResource = async (data: fhir4.FhirResource, resourceType: FhirResourceType) => {
  const collection = Connection.db.collection<fhir4.FhirResource>(resourceType);
  await collection.insertOne({ ...data });
};

export async function cleanUpDb() {
  await Connection.db.dropDatabase();
  await Connection.connection?.close();
}

export async function testSetup(testFixtureList: fhir4.FhirResource[]) {
  await Connection.connect((global as any).__MONGO_URI__);

  for (const resource of testFixtureList) {
    await createTestResource(resource, resource.resourceType);
  }
}
