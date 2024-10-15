import { CRMIRepositoryLibrary, CRMIRepositoryMeasure } from './types/fhir';

export const MeasureSkeleton: CRMIRepositoryMeasure = {
  id: 'tempMeasureId',
  resourceType: 'Measure',
  status: 'draft',
  version: '0.0.1',
  url: 'http://example.com',
  title: 'Sample title',
  description: 'Sample description',
  date: '2025-01-01T00:00:00.000Z'
};

export const LibrarySkeleton: CRMIRepositoryLibrary = {
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
  description: 'Sample description',
  date: '2025-01-01T00:00:00.000Z'
};
