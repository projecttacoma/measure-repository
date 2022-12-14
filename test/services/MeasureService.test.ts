import { initialize, Server } from '@projecttacoma/node-fhir-server-core';
import { serverConfig } from '../../src/config/serverConfig';
import { cleanUpTestDatabase, setupTestDatabase } from '../utils';
import supertest from 'supertest';

let server: Server;

const MEASURE: fhir4.Measure = { resourceType: 'Measure', id: 'test', status: 'active' };
const MEASURE_WITH_URL: fhir4.Measure = {
  resourceType: 'Measure',
  id: 'testWithUrl',
  status: 'active',
  url: 'http://example.com'
};

describe('MeasureService', () => {
  beforeAll(() => {
    server = initialize(serverConfig);
    return setupTestDatabase([MEASURE, MEASURE_WITH_URL]);
  });

  describe('searchById', () => {
    it('test searchById with correctHeaders and the id should be in database returns 200', async () => {
      await supertest(server.app)
        .get('/4_0_1/Measure/test')
        .set('Accept', 'application/json+fhir')
        .expect(200)
        .then(response => {
          expect(response.body.id).toEqual(MEASURE.id);
        });
    });

    it('test searchById when the id cannot be found in the database', async () => {
      await supertest(server.app)
        .get('/4_0_1/Measure/invalidID')
        .set('Accept', 'application/json+fhir')
        .expect(404)
        .then(response => {
          expect(response.body.issue[0].code).toEqual('ResourceNotFound');
          expect(response.body.issue[0].details.text).toEqual(
            `No resource found in collection: Measure, with: id invalidID`
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
        .query({ status: 'active' })
        .set('Accept', 'application/json+fhir')
        .expect(200)
        .then(response => {
          expect(response.body.resourceType).toEqual('Bundle');
          expect(response.body.total).toEqual(2);
          expect(response.body.entry.find((e: fhir4.BundleEntry) => e.resource?.id === 'test')?.resource).toEqual(
            MEASURE
          );
          expect(
            response.body.entry.find((e: fhir4.BundleEntry) => e.resource?.id === 'testWithUrl')?.resource
          ).toEqual(MEASURE_WITH_URL);
        });
    });
  });
  afterAll(() => {
    return cleanUpTestDatabase();
  });
});
