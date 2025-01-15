import { Filter } from 'mongodb';

export type FhirLibraryWithDR = CRMIRepositoryLibrary & {
  _dataRequirements?: Filter<any>;
};

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
