import { Connection } from '../src/db/Connection';

const dbUrl = process.env.DATABASE_URL || 'mongodb://localhost:27017/measure-repository-test';

const createTestResource = async (data: any, resourceType: string) => {
  const collection = Connection.db.collection(resourceType);
  await collection.insertOne(data);
  return { id: data.id };
};

export async function cleanUpDb() {
  await Connection.db.dropDatabase();
  await Connection.connection?.close();
}

export const testSetup = async (testFixtureList: fhir4.FhirResource[]) => {
  await Connection.connect(dbUrl);

  const result = testFixtureList.map(async x => {
    return await createTestResource(x, x.resourceType);
  });
  await Promise.all(result);
};
