import { Connection } from '../src/db/Connection';
import { ArtifactResourceType, FhirArtifact } from '../src/types/service-types';

export async function createTestResource(data: FhirArtifact, resourceType: ArtifactResourceType) {
  const collection = Connection.db.collection<FhirArtifact>(resourceType);
  await collection.insertOne({ ...data });
}

export async function cleanUpTestDatabase() {
  await Connection.db.dropDatabase();
  await Connection.connection?.close();
}

export async function setupTestDatabase(testFixtureList: FhirArtifact[]) {
  await Connection.connect((global as any).__MONGO_URI__);

  for (const resource of testFixtureList) {
    await createTestResource(resource, resource.resourceType);
  }
}
