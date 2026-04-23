import nock from 'nock';
import {
  createDepLibraryBundle,
  createLibraryPackageBundle,
  createMeasurePackageBundle,
  getAllDependentLibraries,
  getDependentValueSets,
  getQueryFromReference
} from '../../src/util/bundleUtils';
import { cleanUpTestDatabase, setupTestDatabase } from '../utils';
import { CRMIRepositoryLibrary, CRMIRepositoryMeasure } from '../../src/types/service-types';

const LIBRARY_BASE = {
  type: { coding: [{ code: 'logic-library' }] },
  version: '1',
  title: 'Sample title',
  description: 'Sample description',
  date: '2025-01-01T00:00:00.000Z'
};

const MEASURE_BASE = {
  version: '1',
  title: 'Sample title',
  description: 'Sample description',
  date: '2025-01-01T00:00:00.000Z'
};

const MOCK_VS_1: fhir4.ValueSet = {
  resourceType: 'ValueSet',
  status: 'unknown',
  url: 'http://example.com/ValueSet/1'
};

const MOCK_VS_2: fhir4.ValueSet = {
  resourceType: 'ValueSet',
  status: 'unknown',
  url: 'http://example.com/ValueSet/2'
};

const MOCK_VS_3: fhir4.ValueSet = {
  resourceType: 'ValueSet',
  status: 'unknown',
  url: 'http://example.com/ValueSet/4'
};

const LIB_WITH_NO_DEPS: CRMIRepositoryLibrary = {
  resourceType: 'Library',
  id: 'LibWithNoDeps',
  url: 'http://example.com/LibraryWithNoDeps',
  status: 'draft',
  ...LIBRARY_BASE
};

const LIB_WITH_DEPS: CRMIRepositoryLibrary = {
  resourceType: 'Library',
  id: 'LibraryWithDeps',
  url: 'http://example.com/LibraryWithDeps',
  version: '0.0.1-test',
  status: 'draft',
  type: { coding: [{ code: 'logic-library' }] },
  relatedArtifact: [
    {
      type: 'depends-on',
      resource: 'http://example.com/LibraryWithNoDeps'
    },
    {
      type: 'depends-on',
      resource: MOCK_VS_1.url
    },
    {
      type: 'depends-on',
      resource: MOCK_VS_2.url
    }
  ],
  title: 'Sample title',
  description: 'Sample description',
  date: '2025-01-01T00:00:00.000Z'
};

const LIB_WITH_VALUESET: CRMIRepositoryLibrary = {
  resourceType: 'Library',
  id: 'LibraryWithValueSet',
  url: 'http://example.com/LibraryWithVS',
  status: 'draft',
  relatedArtifact: [
    {
      type: 'depends-on',
      resource: 'http://example.com/LibraryWithExtraVS'
    },
    {
      type: 'depends-on',
      resource: MOCK_VS_1.url
    },
    {
      type: 'depends-on',
      resource: MOCK_VS_2.url
    }
  ],
  ...LIBRARY_BASE
};

const LIB_WITH_EXTRA_VALUESET: CRMIRepositoryLibrary = {
  resourceType: 'Library',
  id: 'LibraryWithExtraValueSet',
  url: 'http://example.com/LibraryWithExtraVS',
  status: 'draft',
  relatedArtifact: [
    {
      type: 'depends-on',
      resource: MOCK_VS_3.url
    }
  ],
  ...LIBRARY_BASE
};

const LIB_WITH_MISSING_DEPS: CRMIRepositoryLibrary = {
  resourceType: 'Library',
  id: 'LibraryWithMissingDeps',
  url: 'http://example.com/LibraryWithMissingDeps',
  status: 'draft',
  relatedArtifact: [
    {
      type: 'depends-on',
      resource: 'http://example.com/MissingLibrary'
    }
  ],
  ...LIBRARY_BASE
};

const MEASURE_WITH_MISSING_LIBRARY: CRMIRepositoryMeasure = {
  resourceType: 'Measure',
  id: 'MeasureMissingLib',
  url: 'http://example.com/MeasureMissingLib',
  status: 'draft',
  library: ['http://example.com/MissingLibrary'],
  ...MEASURE_BASE
};

const MEASURE_WITH_NO_LIBRARY: CRMIRepositoryMeasure = {
  resourceType: 'Measure',
  id: 'MeasureNoLib',
  url: 'http://example.com/MeasureNoLib',
  status: 'draft',
  library: [],
  ...MEASURE_BASE
};

const MEASURE_WITH_LIBRARY: CRMIRepositoryMeasure = {
  resourceType: 'Measure',
  id: 'MeasureWithLib',
  url: 'http://example.com/MeasureWithLib',
  status: 'draft',
  library: ['http://example.com/LibraryWithDeps'],
  ...MEASURE_BASE
};

describe('bundleUtils', () => {
  beforeAll(async () => {
    await setupTestDatabase([
      LIB_WITH_DEPS,
      LIB_WITH_NO_DEPS,
      LIB_WITH_MISSING_DEPS,
      LIB_WITH_EXTRA_VALUESET,
      MEASURE_WITH_MISSING_LIBRARY,
      MEASURE_WITH_NO_LIBRARY,
      MEASURE_WITH_LIBRARY
    ]);
  });

  describe('Testing getAllDependentLibraries()', () => {
    it('returns just the lib when no relatedArtifacts present', async () => {
      expect(await getAllDependentLibraries(LIB_WITH_NO_DEPS)).toEqual([LIB_WITH_NO_DEPS]);
    });

    it('returns lib and dependent libs when both exist', async () => {
      expect(await getAllDependentLibraries(LIB_WITH_DEPS)).toEqual(
        expect.arrayContaining([LIB_WITH_DEPS, LIB_WITH_NO_DEPS])
      );
    });

    it('throws 404 error when dependent lib is missing', async () => {
      expect.assertions(2);
      try {
        await getAllDependentLibraries(LIB_WITH_MISSING_DEPS);
      } catch (e: any) {
        expect(e.statusCode).toEqual(404);
        expect(e.issue[0].details.text).toEqual(
          'Failed to find dependent library with canonical url: http://example.com/MissingLibrary'
        );
      }
    });
  });

  describe('getQueryFromReference', () => {
    it('splits reference into url and version on | operator', () => {
      expect(getQueryFromReference('http://example.com/Measure|Version')).toEqual({
        url: 'http://example.com/Measure',
        version: 'Version'
      });
    });
    it('returns just url when no | operator', () => {
      expect(getQueryFromReference('http://example.com/Measure')).toEqual({
        url: 'http://example.com/Measure'
      });
    });
  });

  describe('createDepLibraryBundle', () => {
    it('returns just the main lib when the main lib has no dependencies', async () => {
      const libBundle = await createDepLibraryBundle(LIB_WITH_NO_DEPS);
      expect(libBundle.resourceType).toEqual('Bundle');
      expect(libBundle.entry).toHaveLength(1);
      expect(libBundle.entry).toEqual(expect.arrayContaining([{ resource: LIB_WITH_NO_DEPS }]));
    });

    it('returns the main lib and its dependent libraries', async () => {
      const libBundle = await createDepLibraryBundle(LIB_WITH_DEPS);
      expect(libBundle.resourceType).toEqual('Bundle');
      expect(libBundle.entry).toHaveLength(2);
      expect(libBundle.entry).toEqual(
        expect.arrayContaining([{ resource: LIB_WITH_DEPS }, { resource: LIB_WITH_NO_DEPS }])
      );
    });

    it('should include all valuesets across libraries when using terminology', async () => {
      nock(MOCK_VS_1.url as string)
        .get('/$expand')
        .reply(200, MOCK_VS_1);
      nock(MOCK_VS_2.url as string)
        .get('/$expand')
        .reply(200, MOCK_VS_2);
      nock(MOCK_VS_3.url as string)
        .get('/$expand')
        .reply(200, MOCK_VS_3);

      const libBundle = await createDepLibraryBundle(LIB_WITH_VALUESET, true);
      expect(libBundle.resourceType).toEqual('Bundle');
      expect(libBundle.entry).toHaveLength(5);
      expect(libBundle.entry).toEqual(
        expect.arrayContaining([
          { resource: LIB_WITH_VALUESET },
          { resource: LIB_WITH_EXTRA_VALUESET },
          { resource: MOCK_VS_1 },
          { resource: MOCK_VS_2 },
          { resource: MOCK_VS_3 }
        ])
      );
    });
  });

  describe('createMeasurePackageBundle', () => {
    it('throws a 404 error when dependent Library does not exist', async () => {
      expect.assertions(2);
      try {
        await createMeasurePackageBundle({ id: 'MeasureMissingLib' }, {});
      } catch (e: any) {
        expect(e.statusCode).toEqual(404);
        expect(e.issue[0].details.text).toEqual(
          `Could not find Library http://example.com/MissingLibrary referenced by Measure MeasureMissingLib`
        );
      }
    });

    it('throws a 400 error when uploaded measure does not reference a library', async () => {
      expect.assertions(2);
      try {
        await createMeasurePackageBundle({ id: 'MeasureNoLib' }, {});
      } catch (e: any) {
        expect(e.statusCode).toEqual(400);
        expect(e.issue[0].details.text).toEqual('Uploaded measure: MeasureNoLib does not reference a Library');
      }
    });

    it('returns a bundle including a Measure and all dependent Libraries on valid input', async () => {
      const bundle = await createMeasurePackageBundle({ id: 'MeasureWithLib' }, {});
      expect(bundle.resourceType).toEqual('Bundle');
      expect(bundle.entry).toHaveLength(3);
      expect(bundle.entry).toEqual(
        expect.arrayContaining([
          { resource: MEASURE_WITH_LIBRARY },
          { resource: LIB_WITH_DEPS },
          { resource: LIB_WITH_NO_DEPS }
        ])
      );
    });
  });

  describe('createLibraryPackageBundle', () => {
    it('returns bundle including a Library and all dependent Libraries on valid input', async () => {
      const { libraryBundle } = await createLibraryPackageBundle({ id: 'LibraryWithDeps' }, {});
      expect(libraryBundle.resourceType).toEqual('Bundle');
      expect(libraryBundle.entry).toHaveLength(2);
      expect(libraryBundle.entry).toEqual(
        expect.arrayContaining([{ resource: LIB_WITH_DEPS }, { resource: LIB_WITH_NO_DEPS }])
      );
    });

    it('returns rootLibRef with url and version when both present', async () => {
      const { rootLibRef } = await createLibraryPackageBundle({ id: 'LibraryWithDeps' }, {});
      expect(rootLibRef).toEqual('http://example.com/LibraryWithDeps|0.0.1-test');
    });
  });

  describe('getDependentValueSets', () => {
    it('should return [] for library with no dependent valuesets', async () => {
      const vs = await getDependentValueSets(LIB_WITH_NO_DEPS);
      expect(vs).toEqual([]);
    });

    it('should include valuesets resolved with $expand requests', async () => {
      nock(MOCK_VS_1.url as string)
        .get('/$expand')
        .reply(200, MOCK_VS_1);
      nock(MOCK_VS_2.url as string)
        .get('/$expand')
        .reply(200, MOCK_VS_2);

      const vs = await getDependentValueSets(LIB_WITH_VALUESET, false);

      expect(vs).toHaveLength(2);
      expect(vs).toEqual(expect.arrayContaining([MOCK_VS_1, MOCK_VS_2]));
    });
  });

  afterAll(cleanUpTestDatabase);
});
