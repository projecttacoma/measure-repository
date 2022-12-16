import { Connection } from '../src/db/Connection';
import * as fs from 'fs';
import { Bundle, FhirResource } from 'fhir/r4';
import { MongoError, OptionalId } from 'mongodb';

const DB_URL = process.env.DATABASE_URL || 'mongodb://localhost:27017/measure-repository';
const COLLECTION_NAMES = ['Measure', 'Library', 'MeasureReport'];

async function createCollections() {
  await Connection.connect(DB_URL);
  console.log(`Connected to ${DB_URL}`);

  const creations = COLLECTION_NAMES.map(async cn => {
    console.log(`Creating collection ${cn}`);
    await (await Connection.db.createCollection(cn)).createIndex({ id: 1 }, { unique: true });
  });

  await Promise.all(creations);
}

async function deleteCollections() {
  await Connection.connect(DB_URL);
  console.log(`Connected to ${DB_URL}`);

  const collections = await Connection.db.listCollections().toArray();
  const deletions = collections.map(async c => {
    console.log(`Deleting collection ${c.name}`);
    await Connection.db.dropCollection(c.name);
  });
  await Promise.all(deletions);
}

/*
 * Loads all measure or library resources found in the bundle located at param filePath
 */
async function loadBundle(filePath: string) {
  await Connection.connect(DB_URL);
  console.log(`Connected to ${DB_URL}`);
  console.log(`Loading bundle from path ${filePath}`);

  const data = fs.readFileSync(filePath, 'utf8');
  if (data) {
    console.log(`Uploading ${filePath.split('/').slice(-1)}...`);
    const bundle: Bundle = JSON.parse(data);
    // retrieve each resource and insert into database
    if (bundle.entry) {
      let resourcesUploaded = 0;
      const uploads = bundle.entry.map(async res => {
        // Only upload Library or Measure resources
        if (
          res?.resource?.resourceType &&
          (res?.resource?.resourceType === 'Library' || res?.resource?.resourceType === 'Measure')
        ) {
          try {
            await createResource(res.resource, res.resource.resourceType);
            resourcesUploaded += 1;
          } catch (e) {
            // ignore duplicate key errors for Libraries, Note: if ValueSets added, also ignore for those
            if (!(e instanceof MongoError && e.code == 11000 && res.resource.resourceType === 'Library')) {
              if (e instanceof Error) {
                console.error(e.message);
              } else {
                console.error(String(e));
              }
            }
          }
        } else {
          console.log(
            res?.resource?.resourceType
              ? `Not loading resource of type ${res?.resource?.resourceType}`
              : 'Resource or resource type undefined'
          );
        }
      });
      await Promise.all(uploads);
      console.log(`${resourcesUploaded} resources uploaded.`);
    } else {
      console.error('Unable to identify bundle entries.');
    }
  }
}

/*
 * Inserts one data object into database with specified FHIR resource type
 */
async function createResource(data: FhirResource, resourceType: string) {
  const collection = Connection.db.collection<fhir4.FhirResource>(resourceType);
  console.log(`Inserting ${resourceType}/${data.id} into database`);
  await collection.insertOne(data);
  return { id: data.id };
}

if (process.argv[2] === 'delete') {
  deleteCollections()
    .then(() => {
      console.log('Done');
    })
    .catch(console.error)
    .finally(() => {
      Connection.connection?.close();
    });
} else if (process.argv[2] === 'create') {
  createCollections()
    .then(() => {
      console.log('Done');
    })
    .catch(console.error)
    .finally(() => {
      Connection.connection?.close();
    });
} else if (process.argv[2] === 'reset') {
  deleteCollections()
    .then(() => {
      return createCollections();
    })
    .then(() => {
      console.log('Done');
    })
    .catch(console.error)
    .finally(() => {
      Connection.connection?.close();
    });
} else if (process.argv[2] === 'loadBundle') {
  if (process.argv.length < 4) {
    throw new Error('Filename argument required.');
  }
  loadBundle(process.argv[3])
    .then(() => {
      console.log('Done');
    })
    .catch(console.error)
    .finally(() => {
      Connection.connection?.close();
    });
} else {
  console.log('Usage: ts-node src/scripts/dbSetup.ts <create|delete|reset>');
}
