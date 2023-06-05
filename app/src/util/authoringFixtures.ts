export const MeasureSkeleton: fhir4.Measure = {
  resourceType: 'Measure',
  status: 'draft'
};

export const LibrarySkeleton: fhir4.Library = {
  resourceType: 'Library',
  status: 'draft',
  type: {
    coding: [
      {
        code: 'logic-library'
      }
    ]
  }
};
