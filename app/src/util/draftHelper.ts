import { getDraftById, getDraftByUrl } from '@/server/db/dbOperations';
import { ArtifactResourceType } from './types/fhir';
import { FhirArtifact } from '@/util/types/fhir';
import { ChildArtifactInfo, getDraftChildren } from './serviceUtils';

export async function getParentDraftArtifactAndChildren(
  id: string,
  resourceType: ArtifactResourceType
): Promise<{ draftArtifacts: FhirArtifact[]; draftRes: FhirArtifact; children: ChildArtifactInfo[] }> {
  // get the parent draft artifact by id
  const draftRes = await getDraftById(id, resourceType);

  if (!draftRes) {
    throw new Error(`No draft artifact found for resourceType ${resourceType}, id ${id}`);
  }

  // recursively get any child artifacts from the artifact if they exist
  const children = draftRes?.relatedArtifact ? await getDraftChildren(draftRes.relatedArtifact) : [];

  const childDrafts = children.map(async child => {
    const draft = await getDraftByUrl(child.url, child.version, child.resourceType);
    if (!draft) {
      throw new Error('No artifacts found in search');
    }
    return draft;
  });

  const draftArtifacts = [draftRes].concat(await Promise.all(childDrafts));

  return { draftArtifacts, draftRes, children };
}
