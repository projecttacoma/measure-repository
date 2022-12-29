import { initialize, Server } from '@projecttacoma/node-fhir-server-core';
import { serverConfig } from '../../src/config/serverConfig';
import { cleanUpTestDatabase, setupTestDatabase } from '../utils';
import supertest from 'supertest';

let server: Server;

const MEASURE: fhir4.Measure = { resourceType: 'Measure', id: 'test', status: 'active', version: 'searchable' };

const MEASURE_WITH_URL: fhir4.Measure = {
  resourceType: 'Measure',
  id: 'testWithUrl',
  status: 'active',
  url: 'http://example.com',
  version: 'searchable'
};

const MEASURE_WITH_ROOT_LIB: fhir4.Measure = {
  resourceType: 'Measure',
  id: 'testWithRootLib',
  status: 'active',
  url: 'http://example.com/testMeasureWithRootLib',
  library: ['http://example.com/testLibrary']
};

const MEASURE_WITH_ROOT_LIB_AND_DEPS: fhir4.Measure = {
  resourceType: 'Measure',
  id: 'testWithRootLibAndDeps',
  status: 'active',
  url: 'http://example.com/testMeasureWithDeps',
  library: ['http://example.com/testLibraryWithDeps']
};

const LIBRARY_WITH_NO_DEPS: fhir4.Library = {
  resourceType: 'Library',
  id: 'testLibraryWithNoDeps',
  status: 'draft',
  url: 'http://example.com/testLibrary',
  type: { coding: [{ code: 'logic-library' }] }
};

const LIBRARY_WITH_DEPS: fhir4.Library = {
  resourceType: 'Library',
  id: 'testLibraryWithDeps',
  status: 'draft',
  url: 'http://example.com/testLibraryWithDeps',
  type: { coding: [{ code: 'logic-library' }] },
  relatedArtifact: [
    {
      type: 'depends-on',
      resource: 'http://example.com/testLibrary'
    }
  ]
};

describe('MeasureService', () => {
  beforeAll(() => {
    server = initialize(serverConfig);
    return setupTestDatabase([
      MEASURE,
      MEASURE_WITH_URL,
      MEASURE_WITH_ROOT_LIB,
      MEASURE_WITH_ROOT_LIB_AND_DEPS,
      LIBRARY_WITH_NO_DEPS,
      LIBRARY_WITH_DEPS
    ]);
  });

  describe('searchById', () => {
    it('returns 200 when passed correct headers and the id is in database', async () => {
      await supertest(server.app)
        .get('/4_0_1/Measure/test')
        .set('Accept', 'application/json+fhir')
        .expect(200)
        .then(response => {
          expect(response.body.id).toEqual(MEASURE.id);
        });
    });

    it('returns 404 when passed correct headers and id is not in database', async () => {
      await supertest(server.app)
        .get('/4_0_1/Measure/invalidID')
        .set('Accept', 'application/json+fhir')
        .expect(404)
        .then(response => {
          expect(response.body.issue[0].code).toEqual('ResourceNotFound');
          expect(response.body.issue[0].details.text).toEqual(
            `No resource found in collection: Measure, with id: invalidID`
          );
        });
    });
  });

  describe('search', () => {
    it('returns 200 and correct searchset bundle when query matches single resource', async () => {
      await supertest(server.app)
        .get('/4_0_1/Measure')
        .query({ url: 'http://example.com', status: 'active' })
        .set('Accept', 'application/json+fhir')
        .expect(200)
        .then(response => {
          expect(response.body.resourceType).toEqual('Bundle');
          expect(response.body.total).toEqual(1);
          expect(response.body.entry[0].resource).toEqual(MEASURE_WITH_URL);
        });
    });

    it('returns 200 and correct searchset bundle when query matches multiple resources', async () => {
      await supertest(server.app)
        .get('/4_0_1/Measure')
        .query({ status: 'active', version: 'searchable' })
        .set('Accept', 'application/json+fhir')
        .expect(200)
        .then(response => {
          expect(response.body.resourceType).toEqual('Bundle');
          expect(response.body.total).toEqual(2);
          expect(response.body.entry).toEqual(
            expect.arrayContaining([
              expect.objectContaining<fhir4.BundleEntry>({
                resource: MEASURE
              }),
              expect.objectContaining<fhir4.BundleEntry>({
                resource: MEASURE_WITH_URL
              })
            ])
          );
        });
    });
  });

  describe('$package', () => {
    it('returns a Bundle including the root lib and Measure when root lib has no dependencies and id passed through args', async () => {
      await supertest(server.app)
        .get('/4_0_1/Measure/testWithRootLib/$package')
        .expect(200)
        .then(response => {
          expect(response.body.resourceType).toEqual('Bundle');
          expect(response.body.entry).toHaveLength(2);
          expect(response.body.entry).toEqual(
            expect.arrayContaining([{ resource: LIBRARY_WITH_NO_DEPS }, { resource: MEASURE_WITH_ROOT_LIB }])
          );
        });
    });

    it('returns a Bundle including the root lib, Measure, and when root lib has no dependencies and id passed through body', async () => {
      await supertest(server.app)
        .post('/4_0_1/Measure/$package')
        .send({ resourceType: 'Parameters', parameter: [{ name: 'id', valueString: 'testWithRootLib' }] })
        .set('content-type', 'application/fhir+json')
        .expect(200)
        .then(response => {
          expect(response.body.resourceType).toEqual('Bundle');
          expect(response.body.entry).toHaveLength(2);
          expect(response.body.entry).toEqual(
            expect.arrayContaining([{ resource: LIBRARY_WITH_NO_DEPS }, { resource: MEASURE_WITH_ROOT_LIB }])
          );
        });
    });

    it('returns a Bundle including the root lib and Measure when root lib has dependencies and id passed through args', async () => {
      await supertest(server.app)
        .get('/4_0_1/Measure/testWithRootLibAndDeps/$package')
        .expect(200)
        .then(response => {
          expect(response.body.resourceType).toEqual('Bundle');
          expect(response.body.entry).toHaveLength(3);
          expect(response.body.entry).toEqual(
            expect.arrayContaining([
              { resource: LIBRARY_WITH_DEPS },
              { resource: LIBRARY_WITH_NO_DEPS },
              { resource: MEASURE_WITH_ROOT_LIB_AND_DEPS }
            ])
          );
        });
    });

    it('returns a Bundle including the root lib, Measure, and when root lib has dependencies and id passed through body', async () => {
      await supertest(server.app)
        .post('/4_0_1/Measure/$package')
        .send({ resourceType: 'Parameters', parameter: [{ name: 'id', valueString: 'testWithRootLibAndDeps' }] })
        .set('content-type', 'application/fhir+json')
        .expect(200)
        .then(response => {
          expect(response.body.resourceType).toEqual('Bundle');
          expect(response.body.entry).toHaveLength(3);
          expect(response.body.entry).toEqual(
            expect.arrayContaining([
              { resource: LIBRARY_WITH_DEPS },
              { resource: LIBRARY_WITH_NO_DEPS },
              { resource: MEASURE_WITH_ROOT_LIB_AND_DEPS }
            ])
          );
        });
    });

    it('throws a 400 error when no url or id included in request', async () => {
      await supertest(server.app)
        .post('/4_0_1/Measure/$package')
        .send({ resourceType: 'Parameters', parameter: [] })
        .set('content-type', 'application/fhir+json')
        .expect(400)
        .then(response => {
          expect(response.body.issue[0].code).toEqual('BadRequest');
          expect(response.body.issue[0].details.text).toEqual(
            'Must provide identifying information via either id or url parameters'
          );
        });
    });

    it('throws a 404 error when no measure matching id and url can be found', async () => {
      await supertest(server.app)
        .post('/4_0_1/Measure/$package')
        .send({
          resourceType: 'Parameters',
          parameter: [
            { name: 'id', valueString: 'invalid' },
            { name: 'url', valueUrl: 'invalid' }
          ]
        })
        .set('content-type', 'application/fhir+json')
        .expect(404)
        .then(response => {
          expect(response.body.issue[0].code).toEqual('ResourceNotFound');
          expect(response.body.issue[0].details.text).toEqual(
            'No resource found in collection: Measure, with id: invalid and url: invalid'
          );
        });
    });
  });
  afterAll(() => {
    return cleanUpTestDatabase();
  });
});
