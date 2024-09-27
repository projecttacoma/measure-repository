import { Connection } from '../src/db/Connection';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { MongoError } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { addIsOwnedExtension, addLibraryIsOwned } from '../src/util/baseUtils';
import { CRMIShareableLibrary, FhirArtifact } from '../src/types/service-types';
dotenv.config();

const DB_URL = process.env.DATABASE_URL || 'mongodb://localhost:27017/measure-repository';
const COLLECTION_NAMES = ['Measure', 'Library'];
const ECQM_CONTENT_PATH = 'ecqm-content-qicore-2024/bundles/measure';
const MEASURES_PATH = path.join(ECQM_CONTENT_PATH);

/**
 * Gets the paths for the bundles in ecqm-content-qicore-2024
 */
function getBundlePaths(): string[] {
  const filePaths: string[] = [];

  fs.readdirSync(MEASURES_PATH, { withFileTypes: true }).forEach(ent => {
    // if this item is a directory, look for .json files under it
    if (ent.isDirectory()) {
      fs.readdirSync(path.join(MEASURES_PATH, ent.name), { withFileTypes: true }).forEach(subEnt => {
        if (!subEnt.isDirectory() && subEnt.name.endsWith('.json')) {
          filePaths.push(path.join(MEASURES_PATH, ent.name, subEnt.name));
        }
      });
    }
  });
  return filePaths;
}

/**
 * Changes the incorrect ecqi.healthit.gov references on the Libraries in
 * ecqm-content-qicore-2024 to the correct madie.cms.gov references
 */
async function fixAndPutLibraries(bundle: fhir4.Bundle, url: string) {
  const libraries: fhir4.Library[] = bundle.entry
    ?.filter(entry => entry.resource?.resourceType === 'Library')
    .map(entry => entry.resource as fhir4.Library) as fhir4.Library[];

  for (const library of libraries) {
    console.log(`  Library ${library.id}`);
    if (library.relatedArtifact) {
      for (let index = 0; index < library.relatedArtifact.length; index++) {
        const ra = library.relatedArtifact[index];
        // if a related artifact is using a ecqi.healthit.gov reference it needs to be
        // changed to a madie.cms.gov reference to match the urls the resources use
        if (
          (ra.type === 'depends-on' || ra.type === 'composed-of') &&
          ra.resource?.startsWith('http://ecqi.healthit.gov/ecqms/Library')
        ) {
          const newRef = ra.resource.replace(
            'http://ecqi.healthit.gov/ecqms/Library',
            'https://madie.cms.gov/Library/'
          );
          console.log(`    replacing ra ${ra.resource} with ${newRef}`);
          ra.resource = newRef;
        }
      }
    }
    try {
      console.log(`    PUT ${url}/Library/${library.id}`);

      const resp = await fetch(`${url}/Library/${library.id}`, {
        method: 'PUT',
        body: JSON.stringify(library),
        headers: {
          'Content-Type': 'application/json+fhir'
        }
      });
      console.log(`      ${resp.status}`);
    } catch (e) {
      console.error(e);
    }
  }
}

/**
 * Changes the Measures in ecqm-content-qicore-2024 to have status 'active'
 * before being added to the database with a PUT
 */
async function putMeasure(bundle: fhir4.Bundle, url: string) {
  const measure: fhir4.Measure = bundle.entry?.find(entry => entry.resource?.resourceType === 'Measure')
    ?.resource as fhir4.Measure;

  console.log(`  Measure ${measure.id}`);
  try {
    console.log(`    PUT ${url}/Measure/${measure.id}`);
    measure.status = 'active';
    const resp = await fetch(`${url}/Measure/${measure.id}`, {
      method: 'PUT',
      body: JSON.stringify(measure),
      headers: {
        'Content-Type': 'application/json+fhir'
      }
    });
    console.log(`      ${resp.status}`);
    if (resp.status >= 400) {
      const responseBody = await resp.json();
      if (responseBody.resourceType === 'OperationOutcome') {
        console.log(JSON.stringify(responseBody, null, 2));
      }
    }
  } catch (e) {
    console.error(e);
  }
}

/**
 * Loads ecqm-content-qicore-2024 into the database
 */
async function loadEcqmContent(bundlePaths: string[], url: string) {
  for (const path of bundlePaths) {
    const bundle = JSON.parse(fs.readFileSync(path, 'utf8')) as fhir4.Bundle;
    if (bundle.resourceType === 'Bundle') {
      if (bundle?.entry) {
        console.log('FILE' + path);
        bundle.entry = modifyEntriesForUpload(bundle.entry);
        await fixAndPutLibraries(bundle, url);
        await putMeasure(bundle, url);
      }
    } else {
      console.warn(`${path} is not a Bundle`);
    }
  }
}

async function createCollections() {
  await Connection.connect(DB_URL);
  console.log(`Connected to ${DB_URL}`);

  const creations = COLLECTION_NAMES.map(async cn => {
    console.log(`Creating collection ${cn}`);
    const collection = await Connection.db.createCollection(cn);
    await collection.createIndex({ id: 1 }, { unique: true });
    await collection.createIndex({ url: 1, version: 1 }, { unique: true });
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
 * If a connectionURL is provided, then posts the resources to the server at the
 * connectionURL (as a transaction bundle), otherwise, loads the resources directly to the database
 */
async function loadBundle(fileOrDirectoryPath: string, connectionURL?: string) {
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
      await (connectionURL ? postBundleResources(filePath, connectionURL) : uploadBundleResources(filePath));
    }
  } else {
    await (connectionURL
      ? postBundleResources(fileOrDirectoryPath, connectionURL)
      : uploadBundleResources(fileOrDirectoryPath));
  }
}

/*
 * POSTs a transaction bundle to url
 */
async function transactBundle(bundle: fhir4.Bundle, url: string) {
  if (bundle.entry) {
    // only upload Measures and Libraries
    bundle.entry = bundle.entry.filter(
      e => e.resource?.resourceType === 'Measure' || e.resource?.resourceType === 'Library'
    );
    for (const entry of bundle.entry) {
      if (entry.request?.method === 'POST') {
        entry.request.method = 'PUT';
      }
    }
  }

  try {
    console.log(`  POST ${url}`);

    const resp = await fetch(`${url}`, {
      method: 'POST',
      body: JSON.stringify(bundle),
      headers: {
        'Content-Type': 'application/json+fhir'
      }
    });
    console.log(`    ${resp.status}`);
    if (resp.status !== 200) {
      console.log(`${JSON.stringify(await resp.json())}`);
    }
  } catch (e) {
    console.error(e);
  }
}

/*
 * Loads all resources found in the bundle at filePath, by POSTing them to the provided url
 */
async function postBundleResources(filePath: string, url: string) {
  console.log(`Loading bundle from path ${filePath}`);

  const data = fs.readFileSync(filePath, 'utf8');
  if (data) {
    console.log(`POSTing ${filePath.split('/').slice(-1)}...`);
    const bundle: fhir4.Bundle = JSON.parse(data);
    const entries = bundle.entry as fhir4.BundleEntry<FhirArtifact>[];
    // modify bundles before posting
    if (entries) {
      const modifiedEntries = modifyEntriesForUpload(entries);
      bundle.entry = modifiedEntries;
    }
    await transactBundle(bundle, url);
  }
}

/*
 * Loads all resources found in the bundle at filePath, directly to the database
 */
async function uploadBundleResources(filePath: string) {
  console.log(`Loading bundle from path ${filePath}`);

  const data = fs.readFileSync(filePath, 'utf8');
  if (data) {
    console.log(`Uploading ${filePath.split('/').slice(-1)}...`);
    const bundle: fhir4.Bundle = JSON.parse(data);
    const entries = bundle.entry as fhir4.BundleEntry<fhir4.FhirResource>[];
    // retrieve each resource and insert into database
    if (entries) {
      await Connection.connect(DB_URL);
      console.log(`Connected to ${DB_URL}`);
      let resourcesUploaded = 0;
      let notUploaded = 0;
      const modifiedEntries = modifyEntriesForUpload(entries);
      const uploads = modifiedEntries.map(async entry => {
        // add Library owned extension
        if (entry.resource?.resourceType === 'Library' || entry.resource?.resourceType === 'Measure') {
          // Only upload Library or Measure resources
          try {
            const collection = Connection.db.collection<FhirArtifact>(entry.resource.resourceType);
            console.log(`Inserting ${entry.resource.resourceType}/${entry.resource.id} into database`);
            await collection.insertOne(entry.resource as FhirArtifact);
            resourcesUploaded += 1;
          } catch (e) {
            // ignore duplicate key errors for Libraries, Note: if ValueSets added, also ignore for those
            if (!(e instanceof MongoError && e.code == 11000 && entry.resource.resourceType === 'Library')) {
              if (e instanceof Error) {
                console.error(e.message);
              } else {
                console.error(String(e));
              }
            }
          }
        } else {
          if (entry.resource?.resourceType) {
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
 * Convenience modification of an array of entries to create isOwned relationships and coerce to status active.
 * This lets us massage existing data that may not have the appropriate properties needed for a Publishable Measure Repository
 */
export function modifyEntriesForUpload(entries: fhir4.BundleEntry<fhir4.FhirResource>[]) {
  // pre-process to find owned relationships
  const ownedUrls: string[] = [];
  const modifiedEntries = entries.map(ent => {
    // if the artifact is a Measure, get the main Library from the Measure and add the is owned extension on
    // that library's entry in the relatedArtifacts of the measure
    const { modifiedEntry, url } = addIsOwnedExtension(ent);
    if (url) ownedUrls.push(url);
    // check if there are other isOwned urls but already in the relatedArtifacts
    if (ent.resource?.resourceType === 'Measure' || ent.resource?.resourceType === 'Library') {
      ent.resource.relatedArtifact?.forEach(ra => {
        if (ra.type === 'composed-of') {
          if (
            ra.extension?.some(
              e => e.url === 'http://hl7.org/fhir/StructureDefinition/artifact-isOwned' && e.valueBoolean === true
            )
          ) {
            if (ra.resource) {
              ownedUrls.push(ra.resource);
            }
          }
        }
      });
    }
    return modifiedEntry;
  });
  const updatedEntries = modifiedEntries.map(entry => {
    // add Library owned extension
    const updatedEntry = addLibraryIsOwned(entry, ownedUrls);
    if (updatedEntry.resource?.resourceType === 'Library' || updatedEntry.resource?.resourceType === 'Measure') {
      // Only upload Library or Measure resources
      if (!updatedEntry.resource.id) {
        updatedEntry.resource.id = uuidv4();
      }
      if (updatedEntry.resource.status != 'active' && process.env.AUTHORING === 'false') {
        updatedEntry.resource.status = 'active';
        console.warn(
          `Resource ${updatedEntry.resource.resourceType}/${updatedEntry.resource.id} status has been coerced to 'active' for Publishable environment.`
        );
      }
    }
    return updatedEntry;
  });
  return updatedEntries;
}

/*
 * Inserts the FHIR ModelInfo library into the database
 */
async function insertFHIRModelInfoLibrary() {
  const fhirModelInfo = fs.readFileSync('scripts/fixtures/Library-FHIR-ModelInfo.json', 'utf8');
  const fhirModelInfoLibrary: CRMIShareableLibrary = JSON.parse(fhirModelInfo);

  const qicoreModelInfo = fs.readFileSync('scripts/fixtures/Library-QICore-ModelInfo.json', 'utf8');
  const qicoreModelInfoLibrary: CRMIShareableLibrary = JSON.parse(qicoreModelInfo);

  const collection = Connection.db.collection<FhirArtifact>('Library');
  console.log(`Inserting Library/${fhirModelInfoLibrary.id} into database`);
  await collection.insertOne(fhirModelInfoLibrary);
  console.log(`Inserting Library/${qicoreModelInfoLibrary.id} into database`);
  await collection.insertOne(qicoreModelInfoLibrary);
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
} else if (process.argv[2] === 'postBundle') {
  if (process.argv.length < 4) {
    throw new Error('Filename argument required.');
  }
  let url = 'http://localhost:3000/4_0_1';
  if (process.argv.length < 5) {
    console.log('Given only filename input. Defaulting service url to http://localhost:3000/4_0_1');
  } else {
    url = process.argv[4];
  }

  loadBundle(process.argv[3], url)
    .then(() => {
      console.log('Done');
    })
    .catch(console.error);
} else if (process.argv[2] === 'loadEcqmContent') {
  let url = 'http://localhost:3000/4_0_1';
  if (process.argv.length < 4) {
    console.log('Defaulting service url to http://localhost:3000/4_0_1');
  } else {
    url = process.argv[3];
  }

  const bundlePaths = getBundlePaths();
  loadEcqmContent(bundlePaths, url);
} else {
  console.log('Usage: ts-node src/scripts/dbSetup.ts <create|delete|reset>');
}
