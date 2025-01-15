// CRMIRepository* types implement both CRMIShareable and CRMIPublishable required fields
export interface CRMIRepositoryMeasure extends fhir4.Measure {
  id: string;
  url: string;
  version: string;
  title: string;
  description: string;
  date: string;
}

export interface CRMIRepositoryLibrary extends fhir4.Library {
  id: string;
  url: string;
  version: string;
  title: string;
  description: string;
  date: string;
  type: fhir4.CodeableConcept;
}

// type representing the resource types that are relevant to the Measure Repository Service
export type FhirArtifact = CRMIRepositoryMeasure | CRMIRepositoryLibrary;
export type ArtifactResourceType = FhirArtifact['resourceType'];

/**
 * Interface containing fields pulled from the resource JSON that are used
 * to populate the Resource Info Card.
 */
export interface ResourceInfo {
  resourceType: ArtifactResourceType;
  id: string;
  identifier: string | null;
  name: string | null;
  url: string | null;
  version: string;
  status: string | null;
  isChild: boolean;
}
