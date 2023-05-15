// type representing the resource types that are relevant to the Measure Repository Service
export type FhirArtifact = fhir4.Measure | fhir4.Library;
export type ArtifactResourceType = FhirArtifact['resourceType'];

/**
 * Interface containing fields pulled from the resource JSON that are used
 * to populate the Resource Info Card.
 */
export interface ResourceInfo {
  resourceType: string;
  id: string;
  identifier: string | null;
  name: string | null;
  url: string | null;
  version: string | null;
  status: string | null;
}
