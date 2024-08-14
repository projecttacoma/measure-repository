import { Filter } from 'mongodb';

export type FhirLibraryWithDR = CRMIShareableLibrary & {
  _dataRequirements?: Filter<any>;
};

export interface CRMIShareableMeasure extends fhir4.Measure {
  id: string;
  url: string;
  version: string;
  title: string;
  description: string;
}

export interface CRMIShareableLibrary extends fhir4.Library {
  id: string;
  url: string;
  version: string;
  title: string;
  description: string;
}

// type representing the resource types that are relevant to the Measure Repository Service
export type FhirArtifact = CRMIShareableMeasure | CRMIShareableLibrary;
export type ArtifactResourceType = FhirArtifact['resourceType'];
