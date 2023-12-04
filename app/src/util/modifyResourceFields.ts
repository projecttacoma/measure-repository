import { coerce, inc } from 'semver';
import { FhirArtifact } from './types/fhir';
import { v4 as uuidv4 } from 'uuid';

/**
 * Helper function that takes an artifact and returns it with a new id,
 * draft status, and increments the version if it has one or sets it to
 * 0.0.1 if it does not
 */
export function modifyResourceToDraft(artifact: FhirArtifact) {
  artifact.id = uuidv4();
  artifact.status = 'draft';
  // we can only increment artifacts whose versions are either semantic, can be coerced
  // to semantic, or are in x.x.xxx format. Every other kind of version will become 0.0.1
  if (artifact.version) {
    const coerced = coerce(artifact.version);
    const incVersion = coerced !== null ? inc(coerced, 'patch') : null;
    if (incVersion !== null) {
      artifact.version = incVersion;
      // if we can't coerce the version to semver, then check that it is x.x.xxx
      // format and increment manually
    } else if (checkVersionFormat(artifact.version)) {
      artifact.version = incrementArtifactVersion(artifact.version);
    } else {
      // if it cannot be coerced and is not x.x.xxx format, then set to 0.0.1
      artifact.version = '0.0.1';
    }
  }
  if (artifact.relatedArtifact) {
    artifact.relatedArtifact.forEach(ra => {
      if (
        ra.type === 'composed-of' &&
        ra.resource &&
        ra.extension?.some(
          e => e.url === 'http://hl7.org/fhir/StructureDefinition/artifact-isOwned' && e.valueBoolean === true
        )
      ) {
        const url = ra.resource.split('|')[0];
        ra.resource = url + '|' + artifact.version;
      }
    });
  }
  return artifact;
}

/**
 * Increments an artifact version that is in x.x.xxx format
 */
function incrementArtifactVersion(version: string): string {
  const versionParts = version.split('.').map(Number);

  // increment the patch version
  versionParts[2]++;

  // if the patch version reaches 1000, reset it to 0 and increment the minor version
  if (versionParts[2] >= 1000) {
    versionParts[2] = 0;
    versionParts[1]++;
  }

  // if the minor version reaches 10, reset it to 0 and increment the major version
  if (versionParts[1] >= 10) {
    versionParts[1] = 0;
    versionParts[0]++;
  }

  let formattedPatch;
  if (versionParts[2] < 10) {
    formattedPatch = versionParts[2].toString().padStart(3, '0');
  } else if (versionParts[2] < 100) {
    formattedPatch = versionParts[2].toString().padStart(2, '0');
  } else {
    formattedPatch = versionParts[2].toString();
  }

  return `${versionParts[0]}.${versionParts[1]}.${formattedPatch}`;
}

/**
 * Takes in an artifact version and returns true if it is in x.x.xxx
 * format and returns false if it is not
 */
function checkVersionFormat(version: string): boolean {
  const format = /^\d\.\d\.\d{3}$/;

  return format.test(version);
}
