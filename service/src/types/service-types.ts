import { Filter } from 'mongodb';

export type FhirLibraryWithDR = fhir4.Library & {
  _dataRequirements?: Filter<any>;
};
