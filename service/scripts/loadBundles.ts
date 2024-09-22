import * as fs from 'fs';
import path from 'path';
import { modifyEntriesForUpload } from './dbSetup';

//const SERVER_URL = 'https://abacus-demo.c3ib.org/mrs/4_0_1';
const SERVER_URL = 'http://localhost:3000/4_0_1';
//const ECQM_CONTENT_PATH = '/Users/hossenlopp/Downloads/May 2024 Connectathon';
const ECQM_CONTENT_PATH = '../../ecqm-content-qicore-2024/bundles/measure';
const MEASURES_PATH = path.join(ECQM_CONTENT_PATH);

function getBundlePaths(): string[] {
  const filePaths: string[] = [];

  fs.readdirSync(MEASURES_PATH, { withFileTypes: true }).forEach(ent => {
    // if this item is a directory, look for .json files under it
    if (ent.isDirectory()) {
      fs.readdirSync(path.join(MEASURES_PATH, ent.name), { withFileTypes: true }).forEach(subEnt => {
        if (!subEnt.isDirectory() && subEnt.name.endsWith('.json')) {
          filePaths.push(path.join(MEASURES_PATH, ent.name, subEnt.name));
        } else if (subEnt.isDirectory()) {
          // fs.readdirSync(path.join(MEASURES_PATH, ent.name, subEnt.name), { withFileTypes: true }).forEach(
          //   subSubEnt => {
          //     if (!subSubEnt.isDirectory() && subSubEnt.name.endsWith('.json')) {
          //       filePaths.push(path.join(MEASURES_PATH, ent.name, subEnt.name, subSubEnt.name));
          //     }
          //   }
          // );
        }
      });
    }
  });
  console.log(filePaths);
  return filePaths;
}

function loadBundle(path: string): fhir4.Bundle | null {
  const bundle = JSON.parse(fs.readFileSync(path, 'utf8'));
  if (bundle.resourceType === 'Bundle') {
    return bundle as fhir4.Bundle;
  } else {
    console.warn(`${path} is not a Bundle`);
    return null;
  }
}

async function putLibraries(bundle: fhir4.Bundle) {
  const libraries: fhir4.Library[] = bundle.entry
    ?.filter(entry => entry.resource?.resourceType === 'Library')
    .map(entry => entry.resource as fhir4.Library) as fhir4.Library[];

  for (const library of libraries) {
    console.log(`  Library ${library.id}`);
    if (library.relatedArtifact) {
      for (let index = 0; index < library.relatedArtifact.length; index++) {
        const ra = library.relatedArtifact[index];
        if (
          (ra.type === 'depends-on' || ra.type === 'composed-of') &&
          ra.resource?.startsWith('http://ecqi.healthit.gov/ecqms/Library/')
        ) {
          const newRef = ra.resource.replace(
            'http://ecqi.healthit.gov/ecqms/Library/',
            'https://madie.cms.gov/Library/'
          );
          console.log(`    replacing ra ${ra.resource} with ${newRef}`);
          ra.resource = newRef;
        }
      }
    }

    try {
      console.log(`    PUT ${SERVER_URL}/Library/${library.id}`);

      const resp = await fetch(`${SERVER_URL}/Library/${library.id}`, {
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

async function fixAndPUTMeasure(bundle: fhir4.Bundle) {
  const measure: fhir4.Measure = bundle.entry?.find(entry => entry.resource?.resourceType === 'Measure')
    ?.resource as fhir4.Measure;

  console.log(`  Measure ${measure.id}`);
  try {
    console.log(`    PUT ${SERVER_URL}/Measure/${measure.id}`);
    measure.status = 'active';
    const resp = await fetch(`${SERVER_URL}/Measure/${measure.id}`, {
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

async function transactBundle(bundle: fhir4.Bundle) {
  if (bundle.entry) {
    for (const entry of bundle.entry) {
      if (entry.request?.method === 'POST') {
        entry.request.method = 'PUT';
      }
    }
  }

  try {
    console.log(`  POST ${SERVER_URL}`);

    const resp = await fetch(`${SERVER_URL}`, {
      method: 'POST',
      body: JSON.stringify(bundle),
      headers: {
        'Content-Type': 'application/json+fhir'
      }
    });
    console.log(`    ${resp.status}`);
  } catch (e) {
    console.error(e);
  }
}

async function loadBundles(bundlePaths: string[]) {
  for (const path of bundlePaths) {
    const bundle = loadBundle(path);
    if (bundle?.entry) {
      console.log('FILE ' + path);
      bundle.entry = modifyEntriesForUpload(bundle.entry);
      //await transactBundle(bundle);
      await putLibraries(bundle);
      await fixAndPUTMeasure(bundle);
    }
  }
}

const bundlePaths = getBundlePaths();

loadBundles(bundlePaths);
