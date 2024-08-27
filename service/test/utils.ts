import { Connection } from '../src/db/Connection';
import { ArtifactResourceType, FhirArtifact } from '../src/types/service-types';

export async function createTestResource(data: FhirArtifact, resourceType: ArtifactResourceType) {
  const collection = Connection.db.collection<FhirArtifact>(resourceType);
  await collection.insertOne({ ...data });
}

export async function removeTestResource(id: string, resourceType: ArtifactResourceType) {
  const collection = Connection.db.collection(resourceType);
  await collection.deleteOne({ id });
}

export async function cleanUpTestDatabase() {
  await Connection.db.dropDatabase();
  await Connection.connection?.close();
}

export async function setupTestDatabase(testFixtureList: FhirArtifact[]) {
  await Connection.connect((global as any).__MONGO_URI__);

  for (const cn of ['Library', 'Measure']) {
    const collection = await Connection.db.createCollection(cn);
    await collection.createIndex({ id: 1 }, { unique: true });
    await collection.createIndex({ url: 1, version: 1 }, { unique: true });
  }

  for (const resource of testFixtureList) {
    await createTestResource(resource, resource.resourceType);
  }
}
