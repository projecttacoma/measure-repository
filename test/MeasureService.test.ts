import { initialize, Server } from '@projecttacoma/node-fhir-server-core';
import { serverConfig } from '../src/config/serverConfig';
import { cleanUpDb, testSetup } from './utils';
import supertest from 'supertest';

let server: Server;

const Measure: fhir4.Measure = { resourceType: 'Measure', id: 'measure123', status: 'active' };

describe('MeasureService', () => {
  beforeAll(async () => {
    const config = serverConfig;
    server = initialize(config);

    await testSetup([Measure]);
  });

  describe('searchById', () => {
    test('test searchById with correctHeaders and the id should be in database returns 200', async () => {
      await supertest(server.app)
        .get('/4_0_1/Measure/measure123')
        .set('Accept', 'application/json+fhir')
        .set('content-type', 'application/json+fhir')
        .expect(200)
        .then((response: any) => {
          expect(response.body.id).toEqual(Measure.id);
        });
    });

    test('test searchById when the id cannot be found in the database', async () => {
      await supertest(server.app)
        .get('/4_0_1/Measure/invalidID')
        .set('Accept', 'application/json+fhir')
        .expect(404)
        .then((response: any) => {
          expect(response.body.issue[0].code).toEqual('ResourceNotFound');
          expect(response.body.issue[0].details.text).toEqual(
            `No resource found in collection: Measure, with: id invalidID`
          );
        });
    });
  });

  afterAll(cleanUpDb);
});
