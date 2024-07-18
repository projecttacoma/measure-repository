import { findArtifactByUrlAndVersion } from '../db/dbOperations';
import { ArtifactResourceType, FhirArtifact } from '../types/service-types';
import { v4 as uuidv4 } from 'uuid';
import { BadRequestError } from './errorUtils';

export type ChildArtifactInfo = {
  resourceType: 'Measure' | 'Library';
  url: string;
  version: string;
};

/**
 * Helper function that takes an array of related artifacts and recursively
 * finds all of the child artifacts (related artifacts whose type is composed-of
 * and has the isOwned extension)
 */
export async function getChildren(relatedArtifacts: fhir4.RelatedArtifact[]) {
  let children: FhirArtifact[] = [];

  for (const ra of relatedArtifacts) {
    if (
      ra.type === 'composed-of' &&
      ra.resource &&
      ra.extension?.some(
        e => e.url === 'http://hl7.org/fhir/StructureDefinition/artifact-isOwned' && e.valueBoolean === true
      )
    ) {
      let resourceType: ArtifactResourceType;
      if (ra.resource.includes('Measure')) {
        resourceType = 'Measure';
      } else {
        resourceType = 'Library';
      }

      const [url, version] = ra.resource.split('|');

      // search for the related artifact in the published measure repository
      const childArtifact = (await findArtifactByUrlAndVersion(url, version, resourceType)) as FhirArtifact;
      if (!childArtifact) {
        throw new Error('No artifacts found in search');
      }

      children.push(childArtifact);

      if (childArtifact.relatedArtifact) {
        const nested = await getChildren(childArtifact.relatedArtifact);
        children = children.concat(nested);
      }
    }
  }
  return children;
}

/**
 * Helper function that takes an active artifact and returns it with a new id,
 * draft status, and version (from the $draft parameter). It also removes
 * effectivePeriod, approvalDate, and any extensions which are only valid for
 * active artifacts
 */
export async function modifyResourcesForDraft(artifacts: FhirArtifact[], version: string) {
  for (const artifact of artifacts) {
    artifact.id = uuidv4();
    artifact.status = 'draft';
    artifact.version = version;
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
          ra.resource = url + '|' + version;
        }
      });
    }

    const checkExisting = await findArtifactByUrlAndVersion(artifact.url, version, artifact.resourceType);
    if (checkExisting) {
      throw new BadRequestError(
        `A ${artifact.resourceType} with url ${artifact.url} and version ${artifact.version} already exists in the database.`
      );
    }
  }

  return artifacts;
}

/**
 * Helper function that takes an active or draft artifact and returns it with a new id,
 * same status, url (from the $clone parameter), and version (from the $clone parameter).
 */
export async function modifyResourcesForClone(artifacts: FhirArtifact[], url: string, version: string) {
  for (const artifact of artifacts) {
    artifact.id = uuidv4();
    artifact.version = version;
    artifact.url = url;
    if (artifact.relatedArtifact) {
      artifact.relatedArtifact.forEach(ra => {
        if (
          ra.type === 'composed-of' &&
          ra.resource &&
          ra.extension?.some(
            e => e.url === 'http://hl7.org/fhir/StructureDefinition/artifact-isOwned' && e.valueBoolean === true
          )
        ) {
          const oldUrl = ra.resource.split('|')[0];
          ra.resource = oldUrl + '|' + version;
        }
      });
    }

    const checkExisting = await findArtifactByUrlAndVersion(artifact.url, version, artifact.resourceType);
    if (checkExisting) {
      throw new BadRequestError(
        `A ${artifact.resourceType} with url ${artifact.url} and version ${artifact.version} already exists in the database.`
      );
    }
  }

  return artifacts;
}
