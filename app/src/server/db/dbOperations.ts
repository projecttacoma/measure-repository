import { ArtifactResourceType, FhirArtifact } from '@/util/types/fhir';
import clientPromise from './mongodb';

/**
 * Retrieves all draft resources of the given type
 */
export async function getAllDraftsByType<T extends FhirArtifact>(resourceType: ArtifactResourceType) {
  const client = await clientPromise;
  const collection = client.db().collection(resourceType);
  return collection.find<T>({}, { projection: { _id: 0 } }).toArray();
}

/**
 * Retrieves the draft resource of the given type with the given id
 */
export async function getDraftById<T extends FhirArtifact>(id: string, resourceType: ArtifactResourceType) {
  const client = await clientPromise;
  const collection = client.db().collection(resourceType);
  return collection.findOne<T>({ id }, { projection: { _id: 0 } });
}

/**
 * Retrieves the draft resource of the given type with the given url and version
 */
export async function getDraftByUrl<T extends FhirArtifact>(
  url: string,
  version: string,
  resourceType: ArtifactResourceType
) {
  const client = await clientPromise;
  const collection = client.db().collection(resourceType);
  return collection.findOne<T>({ url, version }, { projection: { _id: 0 } });
}

/**
 * Creates a new draft resource of the given type
 */
export async function createDraft(resourceType: ArtifactResourceType, draft: any) {
  const client = await clientPromise;
  const collection = client.db().collection(resourceType);
  return collection.insertOne(draft);
}

/**
 * Creates several new draft resources in a batch
 */
export async function batchCreateDraft(drafts: FhirArtifact[]) {
  let error = null;
  const client = await clientPromise;
  const session = client.startSession();
  try {
    session.startTransaction();
    const inserts = drafts.map(draft => {
      const collection = client.db().collection(draft.resourceType);
      return collection.insertOne(draft as any, { session });
    });
    await Promise.all(inserts);
    await session.commitTransaction();
    console.log('Batch drafts transaction committed.');
  } catch (err) {
    console.error('Batch drafts transaction failed: ' + err);
    await session.abortTransaction();
    error = err;
  } finally {
    await session.endSession();
  }
  if (error) throw error;
}

/**
 * Updates the resource of the given type with the given id
 */
export async function updateDraft(resourceType: ArtifactResourceType, id: string, additions: any, deletions: any) {
  const client = await clientPromise;
  const collection = client.db().collection(resourceType);
  return collection.updateOne({ id }, { $set: additions, $unset: deletions });
}

/**
 * Counts the number of artifact resources present for a given resource type
 */
export async function getDraftCount(resourceType: ArtifactResourceType) {
  const client = await clientPromise;
  const collection = client.db().collection(resourceType);
  return collection.countDocuments();
}

/**
 * Deletes the draft resource of the given type with the given id
 */
export async function deleteDraft(resourceType: ArtifactResourceType, id: string) {
  const client = await clientPromise;
  const collection = client.db().collection(resourceType);
  return collection.deleteOne({ id });
}
