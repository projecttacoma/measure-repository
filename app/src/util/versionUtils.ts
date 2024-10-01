import { coerce, inc } from 'semver';
import { FhirArtifact } from './types/fhir';
import { Bundle } from 'fhir/r4';

/**
 * Helper function that returns the new version for an artifact.
 * It increments the version if the artifact has one or sets it to
 * 0.0.1 if it does not
 */
export async function calculateVersion(resourceType: 'Library'|'Measure', url: string, version: string) {
  
  let newVersion = '0.0.1';

  // initial version coercion and increment
  // we can only increment artifacts whose versions are either semantic, can be coerced
  // to semantic, or are in x.x.xxx/x.xx.xxx format. Every other kind of version will become 0.0.1
  if (version) {
    const coerced = coerce(version);
    const incVersion = coerced !== null ? inc(coerced, 'patch') : null;
    if (checkVersionFormat(version)) {
      // check that it is x.x.xxx/x.xx.xxx, format and increment manually
      newVersion = incrementArtifactVersion(version);
    } else if (incVersion !== null) {
      // if possible, coerce the version to semver, and increment
      newVersion = incVersion;
    }
  }

  // subsequent version increments
  if (url) {
    let count = 0;
    // check for existing draft with proposed version
    let existingDraft = await getResourceByUrl(url, newVersion, resourceType);
    // only increment a limited number of times
    while (existingDraft && count < 10) {
      // increment artifact version
      const incVersion = inc(version, 'patch');
      newVersion = incVersion ?? incrementArtifactVersion(newVersion);

      existingDraft = await getResourceByUrl(url, newVersion, resourceType);
      count++;
    }
  }
  return newVersion;
}

/**
 * Increments an artifact version that is in x.x.xxx/x.xx.xxx format
 */
function incrementArtifactVersion(version: string): string {
  const stringParts = version.split('.');
  const padMinor = stringParts[1].length === 2; //pad minor version if it's x.xx.xxx format
  const versionParts = stringParts.map(Number);
  // increment the patch version
  versionParts[2]++;

  // if the patch version reaches 1000, reset it to 0 and increment the minor version
  if (versionParts[2] >= 1000) {
    versionParts[2] = 0;
    versionParts[1]++;
  }

  // if the minor version reaches 10/100 (depending on minor pad), reset it to 0 and increment the major version
  const minorLimit = padMinor ? 100 : 10;
  if (versionParts[1] >= minorLimit) {
    versionParts[1] = 0;
    versionParts[0]++;
  }

  let formattedPatch = versionParts[2].toString();
  if (versionParts[2] < 100) {
    formattedPatch = versionParts[2].toString().padStart(3, '0');
  }

  let formattedMinor = versionParts[1].toString();
  if (padMinor && versionParts[1] < 10) {
    formattedMinor = versionParts[1].toString().padStart(2, '0');
  }

  return `${versionParts[0]}.${formattedMinor}.${formattedPatch}`;
}

/**
 * Takes in an artifact version and returns true if it is in x.x.xxx
 * format and returns false if it is not
 */
function checkVersionFormat(version: string): boolean {
  const format = /^\d\.\d{1,2}\.\d{3}$/;

  return format.test(version);
}

// a function to check if the given url/version/resourceType exists on the server
// in order to decide whether to increment the version further
async function getResourceByUrl(url: string, version: string, resourceType: string) {
  const res = await fetch(`${process.env.MRS_SERVER}/${resourceType}?url=${url}&version=${version}`);
  const bundle:Bundle<FhirArtifact> = await res.json();
  // return first entry found in bundle
  return bundle.entry && bundle.entry.length > 0 ? bundle.entry[0].resource : null;
}

