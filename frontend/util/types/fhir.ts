// type representing the resource types that are relevant to the Measure Repository Service
export type FhirArtifact = fhir4.Measure | fhir4.Library;
export type ArtifactResourceType = FhirArtifact['resourceType'];
