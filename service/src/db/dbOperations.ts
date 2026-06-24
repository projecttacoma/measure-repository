import { loggers } from '@projecttacoma/node-fhir-server-core';
import { Filter, MongoServerError } from 'mongodb';
import { Connection } from './Connection';
import { ArtifactResourceType, CRMIRepositoryLibrary, FhirArtifact } from '../types/service-types';
import { BadRequestError } from '../util/errorUtils';

const logger = loggers.get('default');

/**
 * searches the database for the desired resource and returns the data
 */
export async function findResourceById<T extends FhirArtifact>(id: string, resourceType: ArtifactResourceType) {
  const collection = Connection.db.collection(resourceType);
  return collection.findOne<T>({ id: id }, { projection: { _id: 0, _dataRequirements: 0 } });
}

/**
 * Retrieves the artifact of the given type with the given url and version
 */
export async function findArtifactByUrlAndVersion<T extends FhirArtifact>(
  url: string,
  version: string,
  resourceType: ArtifactResourceType
) {
  const collection = Connection.db.collection(resourceType);
  return collection.findOne<T>({ url, version }, { projection: { _id: 0 } });
}

/**
 * Searches the database and returns an object with
 * total: the total number of resources matching this query
 * data: an array of resources matching this query (using pagination)
 */
export async function findResourcesWithQuery<T extends FhirArtifact>(
  query: Filter<any>,
  resourceType: ArtifactResourceType
) {
  const collection = Connection.db.collection(resourceType);
  const projection = { _id: 0, _dataRequirements: 0 };
  const pagination: any = 'skip' in query ? [{ $skip: query.skip }, { $limit: query.limit }] : [];
  query._dataRequirements = { $exists: false };
  query._summary = { $exists: false };
  query._elements = { $exists: false };
  query.limit = { $exists: false };
  query.skip = { $exists: false };
  const idResults = await collection
    .aggregate<{ metadata: { total: number }[]; data: T[] }>([
      { $match: query },
      { $project: { _id: 1 } },
      {
        $facet: {
          metadata: [{ $count: 'total' }],
          data: pagination
        }
      }
    ])
    .toArray();
  return {
    total: idResults[0].metadata.length > 0 ? idResults[0].metadata[0].total : 0,
    data: await collection
      .find<T>({ _id: { $in: idResults[0].data.map(e => e._id) } }, { projection: projection })
      .toArray()
  };
}

/**
 * Searches the database and returns an object with
 * total: the total number of resources matching this query
 * data: an array of resources matching this query (using pagination)
 * but the resources only include the elements specified by the _elements parameter
 */
export async function findResourceElementsWithQuery<T extends FhirArtifact>(
  query: Filter<any>,
  resourceType: ArtifactResourceType
) {
  const collection = Connection.db.collection(resourceType);

  // if the resourceType is Library, then we want to include type in the projection
  const projection: any =
    resourceType === 'Library'
      ? { id: 1, status: 1, resourceType: 1, type: 1, url: 1, title: 1, description: 1, version: 1, date: 1 }
      : { id: 1, status: 1, resourceType: 1, url: 1, title: 1, description: 1, version: 1, date: 1 };

  (query._elements as string[]).forEach(elem => {
    projection[elem] = 1;
  });
  projection['_id'] = 0;

  // create pagination
  const pagination: any = 'skip' in query ? [{ $skip: query.skip }, { $limit: query.limit }] : [];

  query._dataRequirements = { $exists: false };
  query._summary = { $exists: false };
  query._elements = { $exists: false };
  query.limit = { $exists: false };
  query.skip = { $exists: false };
  const idResults = await collection
    .aggregate<{ metadata: { total: number }[]; data: T[] }>([
      { $match: query },
      { $project: { _id: 1 } },
      {
        $facet: {
          metadata: [{ $count: 'total' }],
          data: pagination
        }
      }
    ])
    .toArray();
  return {
    total: idResults[0].metadata.length > 0 ? idResults[0].metadata[0].total : 0,
    data: await collection
      .find<T>({ _id: { $in: idResults[0].data.map(e => e._id) } }, { projection: projection })
      .toArray()
  };
}

/**
 *
 * searches the database for all resources of the given type that match the given query
 * but only returns the number of matches
 */
export async function findResourceCountWithQuery(query: Filter<any>, resourceType: ArtifactResourceType) {
  const collection = Connection.db.collection(resourceType);
  query._dataRequirements = { $exists: false };
  query._summary = { $exists: false };
  query._elements = { $exists: false };
  query.limit = { $exists: false };
  query.skip = { $exists: false };
  return collection.countDocuments(query);
}

/**
 * searches the database for the data requirements Library resource of the desired artifact and parameters
 */
export async function findDataRequirementsWithQuery<T extends CRMIRepositoryLibrary>(query: Filter<any>) {
  const collection = Connection.db.collection('Library');
  return collection.findOne<T>({ _dataRequirements: query }, { projection: { _id: 0, _dataRequirements: 0, url: 0 } });
}

/**
 * Inserts one data object into database with specified FHIR resource type
 */
export async function createResource(data: FhirArtifact, resourceType: string) {
  const collection = Connection.db.collection<FhirArtifact>(resourceType);
  logger.info(`Inserting ${resourceType}/${data.id} into database`);
  try {
    await collection.insertOne(data);
    return { id: data.id as string };
  } catch (e) {
    throw handlePossibleDuplicateKeyError(e, resourceType);
  }
}

/**
 * Searches for a document for a resource and updates it if found, creates it if not
 */
export async function updateResource(id: string, data: FhirArtifact, resourceType: string) {
  const collection = Connection.db.collection(resourceType);
  logger.debug(`Finding and updating ${resourceType}/${data.id} in database`);

  try {
    const results = await collection.replaceOne({ id }, data, { upsert: true });
    // If the document cannot be created with the passed id, Mongo will throw an error
    // before here, so should be ok to just return the passed id
    // upsertedCount indicates that we have created a brand new document
    if (results?.upsertedCount === 1) {
      return { id, created: true };
    }

    return { id, created: false };
  } catch (e) {
    throw handlePossibleDuplicateKeyError(e, resourceType);
  }
}

/**
 * Inserts a parent artifact and all of its children (if applicable) in a batch
 * Error message depends on whether draft or cloned artifacts are being inserted
 */
export async function batchInsert(artifacts: FhirArtifact[], action: string) {
  let error = null;
  const results: FhirArtifact[] = [];
  const insertSession = Connection.connection?.startSession();
  try {
    await insertSession?.withTransaction(async () => {
      for (const artifact of artifacts) {
        const collection = await Connection.db.collection(artifact.resourceType);
        try {
          await collection.insertOne(artifact as any, { session: insertSession });
          results.push(artifact);
        } catch (e) {
          // this needs to be handled here to have access to the resource type
          throw handlePossibleDuplicateKeyError(e, artifact.resourceType);
        }
      }
    });
    console.log(`Batch ${action} transaction committed.`);
  } catch (err) {
    console.log(`Batch ${action} transaction failed: ` + err);
    error = err;
  } finally {
    await insertSession?.endSession();
  }
  if (error) throw error;
  return results;
}

/**
 * Updates a parent artifact and all of its children (if applicable) in a batch
 * transaction
 */
export async function batchUpdate(artifacts: FhirArtifact[], action: string) {
  let error = null;
  const results: FhirArtifact[] = [];
  const updateSession = Connection.connection?.startSession();
  try {
    await updateSession?.withTransaction(async () => {
      for (const artifact of artifacts) {
        const collection = await Connection.db.collection(artifact.resourceType);
        try {
          await collection.replaceOne({ id: artifact.id }, artifact);
          results.push(artifact);
        } catch (e) {
          // this needs to be handled here to have access to the resource type
          throw handlePossibleDuplicateKeyError(e, artifact.resourceType);
        }
      }
    });
    console.log(`Batch ${action} transaction committed.`);
  } catch (err) {
    console.log(`Batch ${action} transaction failed: ` + err);
    error = err;
  } finally {
    await updateSession?.endSession();
  }
  if (error) throw error;
  return results;
}

/**
 * Deletes a parent artifact and all of its children (if applicable) in a batch
 * Error message depends on whether the resource is being archived or withdrawn
 */
export async function batchDelete(artifacts: FhirArtifact[], action: string) {
  let error = null;
  const results: FhirArtifact[] = [];
  const deleteSession = Connection.connection?.startSession();
  try {
    await deleteSession?.withTransaction(async () => {
      for (const artifact of artifacts) {
        const collection = await Connection.db.collection(artifact.resourceType);
        await collection.deleteOne({ id: artifact.id }, { session: deleteSession });
        results.push(artifact);
      }
    });
    console.log(`Batch ${action} transaction committed.`);
  } catch (err) {
    console.log(`Batch ${action} transaction failed: ` + err);
    error = err;
  } finally {
    await deleteSession?.endSession();
  }
  if (error) throw error;
  return results;
}

function handlePossibleDuplicateKeyError(e: any, resourceType?: string) {
  if (e instanceof MongoServerError && e.code === 11000) {
    let errorString = 'Resource with primary identifiers already in repository.';
    if (e.keyValue) {
      const identifiers = Object.entries(e.keyValue).map(pair => `${pair[0]}: ${pair[1]}`);
      errorString = `${resourceType ? resourceType + ' ' : ''}Resource with identifiers (${identifiers.join(
        ', '
      )}) already exists in the repository.`;
    }
    return new BadRequestError(errorString);
  }
  return e;
}
