import { Filter } from 'mongodb';

export type FhirLibraryWithDR = fhir4.Library & {
  _dataRequirements?: Filter<any>;
};

export interface CRMIMeasure extends fhir4.Measure {
  id: string;
  url: string;
  version: string;
  title: string;
  description: string;
}

export interface CRMILibrary extends fhir4.Library {
  id: string;
  url: string;
  version: string;
  title: string;
  description: string;
}

// type representing the resource types that are relevant to the Measure Repository Service
export type FhirArtifact = CRMIMeasure | CRMILibrary;
export type ArtifactResourceType = FhirArtifact['resourceType'];
