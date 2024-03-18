import { getDraftByUrl } from '@/server/db/dbOperations';
import { ArtifactResourceType, FhirArtifact } from './types/fhir';

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
  let children: ChildArtifactInfo[] = [];

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

      // add child artifact info to the array of child artifact info
      children.push({ resourceType, url, version });

      // search for the related artifact in the published measure repository
      const artifactBundle = await fetch(
        `${process.env.MRS_SERVER}/${resourceType}?` + new URLSearchParams({ url: url, version: version })
      ).then(resArtifacts => resArtifacts.json() as Promise<fhir4.Bundle<FhirArtifact>>);

      // if the related artifact exists in the published measure repository, then we
      // want to recursively look for its child artifacts as well
      if (artifactBundle.entry?.[0]?.resource) {
        const draftRes = artifactBundle.entry?.[0].resource as FhirArtifact;

        if (draftRes.relatedArtifact) {
          const nested = await getChildren(draftRes.relatedArtifact);
          children = children.concat(nested);
        }
      }
    }
  }

  return children;
}

export async function getDraftChildren(relatedArtifacts: fhir4.RelatedArtifact[]) {
  let children: ChildArtifactInfo[] = [];

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

      // add child artifact info to the array of child artifact info
      children.push({ resourceType, url, version });

      // search for the related artifact in the draft repository
      const childArtifact = await getDraftByUrl(url, version, resourceType);

      // if the related artifact exists in the draft repository, then we
      // want to recursively look for its child artifacts as well
      if (childArtifact?.relatedArtifact) {
        const nested = await getDraftChildren(childArtifact.relatedArtifact);
        children = children.concat(nested);
      }
    }
  }

  return children;
}
