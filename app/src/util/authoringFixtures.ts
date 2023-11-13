export const MeasureSkeleton: fhir4.Measure = {
  resourceType: 'Measure',
  status: 'draft',
  version: '0.0.1'
};

export const LibrarySkeleton: fhir4.Library = {
  resourceType: 'Library',
  status: 'draft',
  version: '0.0.1',
  type: {
    coding: [
      {
        code: 'logic-library'
      }
    ]
  }
};
