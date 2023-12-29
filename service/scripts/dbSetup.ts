import { Connection } from '../src/db/Connection';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { MongoError } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
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
 * Gathers necessary file path(s) for bundle(s) to upload, then uploads all measure and
 * library resources found in the bundle(s).
 */
async function loadBundle(fileOrDirectoryPath: string) {
  await Connection.connect(DB_URL);
  console.log(`Connected to ${DB_URL}`);
  const status = fs.statSync(fileOrDirectoryPath);
  if (status.isDirectory()) {
    const filePaths: string[] = [];
    fs.readdirSync(fileOrDirectoryPath, { withFileTypes: true }).forEach(ent => {
      // if this item is a directory, look for .json files under it
      if (ent.isDirectory()) {
        fs.readdirSync(path.join(fileOrDirectoryPath, ent.name), { withFileTypes: true }).forEach(subEnt => {
          if (!subEnt.isDirectory() && subEnt.name.endsWith('.json')) {
            filePaths.push(path.join(fileOrDirectoryPath, ent.name, subEnt.name));
          }
        });
      } else if (ent.name.endsWith('.json')) {
        filePaths.push(path.join(fileOrDirectoryPath, ent.name));
      }
    });

    for (const filePath of filePaths) {
      await uploadBundleResources(filePath);
    }
  } else {
    await uploadBundleResources(fileOrDirectoryPath);
  }
}

/*
 * Loads all measure or library resources found in the bundle located at param filePath
 */
async function uploadBundleResources(filePath: string) {
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
        // Get the main library from the Measure and add the isOwned extension on that library's
        // entry in the relatedArtifacts of the measure
        if (res?.resource?.resourceType && res?.resource?.resourceType === 'Measure' && res?.resource?.library) {

          // TODO: should we throw an error when the status is not 'active'? or coerce to 'active'?
          // get the main library of the measure from the library property and the version
          const mainLibrary = res.resource.library?.[0];
          const mainLibraryVersion = res.resource.version;

          // append the version to the end of the library
          const mainLibraryUrl = mainLibraryVersion ? mainLibrary.concat('|', mainLibraryVersion) : mainLibrary;

          // check if relatedArtifacts property exists on the measure, add it if it doesn't
          if (res.resource.relatedArtifact === undefined) {
            res.resource.relatedArtifact = [];
          }

          // check if the main library already exists in the relatedArtifacts
          const mainLibraryRA = res.resource.relatedArtifact.find(
            ra => (ra.url === mainLibraryUrl || ra.resource === mainLibraryUrl) && ra.type === 'composed-of'
          );

          if (mainLibraryRA) {
            // check if the main library's extension array exists and create it if it doesn't
            if (mainLibraryRA.extension) {
              // if it does exist, check that the isOwned extension is not already on it, add it if not
              if (
                mainLibraryRA.extension.find(
                  e => e.url === 'http://hl7.org/fhir/StructureDefinition/artifact-isOwned'
                ) === undefined
              )
                mainLibraryRA.extension.push({
                  url: 'http://hl7.org/fhir/StructureDefinition/artifact-isOwned',
                  valueBoolean: true
                });
            } else {
              mainLibraryRA.extension = [
                { url: 'http://hl7.org/fhir/StructureDefinition/artifact-isOwned', valueBoolean: true }
              ];
            }
          } else {
            res.resource.relatedArtifact.push({
              type: 'composed-of',
              resource: mainLibraryUrl,
              extension: [{ url: 'http://hl7.org/fhir/StructureDefinition/artifact-isOwned', valueBoolean: true }]
            });
          }
        }

        // Only upload Library or Measure resources
        if (
          res?.resource?.resourceType &&
          (res?.resource?.resourceType === 'Library' || res?.resource?.resourceType === 'Measure')
        ) {
          try {
            if (!res.resource.id) {
              res.resource.id = uuidv4();
            }
            const collection = Connection.db.collection<fhir4.FhirResource>(res.resource.resourceType);
            console.log(`Inserting ${res?.resource?.resourceType}/${res.resource.id} into database`);
            await collection.insertOne(res.resource);
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
      console.log(`${notUploaded} non-Measure/non-Library resources skipped.\n`);
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

  const collection = Connection.db.collection<fhir4.FhirResource>('Library');
  console.log(`Inserting Library/${fhirModelInfoLibrary.id} into database`);
  await collection.insertOne(fhirModelInfoLibrary);
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
    })
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
