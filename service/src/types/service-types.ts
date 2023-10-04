import { Filter } from 'mongodb';

export type FhirResourceWithDR = fhir4.Library & {
  _dataRequirements?: Filter<any>;
};
