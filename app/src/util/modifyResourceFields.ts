import { FhirArtifact } from './types/fhir';
import { v4 as uuidv4 } from 'uuid';

/**
 * Helper function that takes an artifact and returns it with a new id,
 * draft status, and no version
 */
export function modifyResourceToDraft(artifact: FhirArtifact) {
  artifact.id = uuidv4();
  artifact.status = 'draft';
  delete artifact.version;
  return { id: artifact.id, ...artifact };
}
