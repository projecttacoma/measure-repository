import { inc } from 'semver';
import { FhirArtifact } from './types/fhir';
import { v4 as uuidv4 } from 'uuid';

/**
 * Helper function that takes an artifact and returns it with a new id,
 * draft status, and no version
 */
export function modifyResourceToDraft(artifact: FhirArtifact) {
  artifact.id = uuidv4();
  artifact.status = 'draft';
  // we can assume that there will be an artifact version since every artifact uploaded
  // to the server gets a version if it does not already have one. We can also assume that
  // it will be following semantic versioning since that handling is done in service
  // TODO: right now we have FhirArtifact set to fhir4.Measure | fhir4.Library, those
  // resources are defined with a version property whose cardinality is 0..1. The
  // CQFMMeasure and CQFMLibrary resources have a version whose cardinality is 1..1.
  // Do we want to change/modify this typing?
  if (artifact.version) {
    artifact.version = inc(artifact.version, 'patch') ?? '';
  }
  return { id: artifact.id, ...artifact };
}
