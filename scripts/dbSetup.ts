import { Connection } from '../src/db/Connection';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { MongoError } from 'mongodb';
import { createResource } from '../src/db/dbOperations';

dotenv.config();

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
    const bundle: fhir4.Bundle = JSON.parse(data);
    // retrieve each resource and insert into database
    if (bundle.entry) {
      let resourcesUploaded = 0;
      let notUploaded = 0;
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
          if (res?.resource?.resourceType) {
            notUploaded += 1;
          } else {
            console.log('Resource or resource type undefined');
          }
        }
      });
      await Promise.all(uploads);
      console.log(`${resourcesUploaded} resources uploaded.`);
      console.log(`${notUploaded} non-Measure/non-Library resources skipped.`);
    } else {
      console.error('Unable to identify bundle entries.');
    }
  }
}

/*
 * Inserts the FHIR ModelInfo library into the database 
 */
async function insertFHIRModelInfoLibrary() {
  const fhirModelInfo = fs.readFileSync('scripts/fixtures/Library-FHIR-ModelInfo.json', 'utf8');
  const fhirModelInfoLibrary: fhir4.Library = JSON.parse(fhirModelInfo); 

  await createResource(fhirModelInfoLibrary, 'Library');
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
      return insertFHIRModelInfoLibrary();
    }).then(() => {
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
    }).then(() => {
      return insertFHIRModelInfoLibrary();
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
