import { CRMIShareableLibrary, CRMIShareableMeasure } from './types/fhir';

export const MeasureSkeleton: CRMIShareableMeasure = {
  id: 'tempMeasureId',
  resourceType: 'Measure',
  status: 'draft',
  version: '0.0.1',
  url: 'http://example.com',
  title: 'Sample title',
  description: 'Sample description'
};

export const LibrarySkeleton: CRMIShareableLibrary = {
  id: 'tempLibraryId',
  resourceType: 'Library',
  status: 'draft',
  version: '0.0.1',
  type: {
    coding: [
      {
        code: 'logic-library'
      }
    ]
  },
  url: 'http://example.com',
  title: 'Sample title',
  description: 'Sample description'
};
