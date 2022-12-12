import { FhirResourceType } from '@projecttacoma/node-fhir-server-core';
import { Connection } from '../src/db/Connection';

<<<<<<< HEAD
async function createTestResource(data: fhir4.FhirResource, resourceType: FhirResourceType) {
=======
const createTestResource = async (data: fhir4.FhirResource, resourceType: FhirResourceType) => {
>>>>>>> d4c2ae7 (working minus tests and docs)
  const collection = Connection.db.collection<fhir4.FhirResource>(resourceType);
  await collection.insertOne({ ...data });
}

export async function cleanUpTestDatabase() {
  await Connection.db.dropDatabase();
  await Connection.connection?.close();
}

<<<<<<< HEAD
export async function setupTestDatabase(testFixtureList: fhir4.FhirResource[]) {
=======
export async function testSetup(testFixtureList: fhir4.FhirResource[]) {
>>>>>>> d4c2ae7 (working minus tests and docs)
  await Connection.connect((global as any).__MONGO_URI__);

  for (const resource of testFixtureList) {
    await createTestResource(resource, resource.resourceType);
  }
}
