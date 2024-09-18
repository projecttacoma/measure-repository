import { coerce, inc } from 'semver';
import { FhirArtifact } from './types/fhir';
import { v4 as uuidv4 } from 'uuid';

/**
 * Helper function that takes an artifact and returns it with a new id,
 * draft status, and increments the version if it has one or sets it to
 * 0.0.1 if it does not
 */
// export async function modifyResource(artifact: FhirArtifact, action: string) {
//   artifact.id = uuidv4();
//   if (action === 'draft') {
//     artifact.status = 'draft';
//   }

//   let count = 0;

//   // initial version coercion and increment
//   // we can only increment artifacts whose versions are either semantic, can be coerced
//   // to semantic, or are in x.x.xxx/x.xx.xxx format. Every other kind of version will become 0.0.1
//   if (artifact.version) {
//     const coerced = coerce(artifact.version);
//     const incVersion = coerced !== null ? inc(coerced, 'patch') : null;
//     if (checkVersionFormat(artifact.version)) {
//       // check that it is x.x.xxx/x.xx.xxx, format and increment manually
//       artifact.version = incrementArtifactVersion(artifact.version);
//     } else if (incVersion !== null) {
//       // if possible, coerce the version to semver, and increment
//       artifact.version = incVersion;
//     } else {
//       // if it cannot be coerced and is not x.x.xxx/x.xx.xxx format, then set to 0.0.1
//       artifact.version = '0.0.1';
//     }
//   }

//   // subsequent version increments
//   if (artifact.url) {
//     // check for existing draft with proposed version
//     let existingDraft = await getDraftByUrl(artifact.url, artifact.version, artifact.resourceType);
//     // only increment a limited number of times
//     while (existingDraft && count < 10) {
//       // increment artifact version
//       const incVersion = inc(artifact.version, 'patch');
//       artifact.version = incVersion ?? incrementArtifactVersion(artifact.version);

//       existingDraft = await getDraftByUrl(artifact.url, artifact.version, artifact.resourceType);
//       count++;
//     }
//   }

//   if (artifact.relatedArtifact) {
//     artifact.relatedArtifact.forEach(ra => {
//       if (
//         ra.type === 'composed-of' &&
//         ra.resource &&
//         ra.extension?.some(
//           e => e.url === 'http://hl7.org/fhir/StructureDefinition/artifact-isOwned' && e.valueBoolean === true
//         )
//       ) {
//         const url = ra.resource.split('|')[0];
//         let version = ra.resource.split('|')[1];
//         while (count !== 0) {
//           version = incrementArtifactVersion(version);
//           count--;
//         }
//         ra.resource = url + '|' + incrementArtifactVersion(version);
//       }
//     });
//   }
//   return artifact;
// }

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
