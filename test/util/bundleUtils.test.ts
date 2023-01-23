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

const LIB_WITH_NO_DEPS: fhir4.Library = {
  id: 'LibWithNoDeps',
  url: 'http://example.com/LibraryWithNoDeps',
  resourceType: 'Library',
  status: 'draft',
  type: { coding: [{ code: 'logic-library' }] }
};

const LIB_WITH_DEPS: fhir4.Library = {
  id: 'LibraryWithDeps',
  url: 'http://example.com/LibraryWithDeps',
  resourceType: 'Library',
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
  ]
};

const LIB_WITH_VALUESET: fhir4.Library = {
  id: 'LibraryWithValueSet',
  url: 'http://example.com/LibraryWithVS',
  resourceType: 'Library',
  status: 'draft',
  type: { coding: [{ code: 'logic-library' }] },
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
  ]
};

const LIB_WITH_EXTRA_VALUESET: fhir4.Library = {
  id: 'LibraryWithExtraValueSet',
  url: 'http://example.com/LibraryWithExtraVS',
  resourceType: 'Library',
  status: 'draft',
  type: { coding: [{ code: 'logic-library' }] },
  relatedArtifact: [
    {
      type: 'depends-on',
      resource: MOCK_VS_3.url
    }
  ]
};

const LIB_WITH_MISSING_DEPS: fhir4.Library = {
  id: 'LibraryWithMissingDeps',
  resourceType: 'Library',
  status: 'draft',
  type: { coding: [{ code: 'logic-library' }] },
  relatedArtifact: [
    {
      type: 'depends-on',
      resource: 'http://example.com/MissingLibrary'
    }
  ]
};

const MEASURE_WITH_MISSING_LIBRARY: fhir4.Measure = {
  resourceType: 'Measure',
  id: 'MeasureMissingLib',
  status: 'draft',
  library: ['http://example.com/MissingLibrary']
};

const MEASURE_WITH_NO_LIBRARY: fhir4.Measure = {
  resourceType: 'Measure',
  id: 'MeasureNoLib',
  status: 'draft',
  library: []
};

const MEASURE_WITH_LIBRARY: fhir4.Measure = {
  resourceType: 'Measure',
  id: 'MeasureWithLib',
  status: 'draft',
  library: ['http://example.com/LibraryWithDeps']
};

describe('bundleUtils', () => {
  beforeAll(() => {
    return setupTestDatabase([
      LIB_WITH_DEPS,
      LIB_WITH_NO_DEPS,
      LIB_WITH_MISSING_DEPS,
      LIB_WITH_EXTRA_VALUESET
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
        await createMeasurePackageBundle(MEASURE_WITH_MISSING_LIBRARY);
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
        await createMeasurePackageBundle(MEASURE_WITH_NO_LIBRARY);
      } catch (e: any) {
        expect(e.statusCode).toEqual(400);
        expect(e.issue[0].details.text).toEqual('Uploaded measure: MeasureNoLib does not reference a Library');
      }
    });

    it('returns a bundle including a Measure and all dependent Libraries on valid input', async () => {
      const bundle = await createMeasurePackageBundle(MEASURE_WITH_LIBRARY);
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
    it('returns a bundle including a Library and all dependent Libraries on valid input', async () => {
      const bundle = await createLibraryPackageBundle(LIB_WITH_DEPS);
      expect(bundle.resourceType).toEqual('Bundle');
      expect(bundle.entry).toHaveLength(2);
      expect(bundle.entry).toEqual(
        expect.arrayContaining([{ resource: LIB_WITH_DEPS }, { resource: LIB_WITH_NO_DEPS }])
      );
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
