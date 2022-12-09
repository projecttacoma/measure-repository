import { initialize, Server } from '@projecttacoma/node-fhir-server-core';
import { serverConfig } from '../../src/config/serverConfig';
import { cleanUpDb, testSetup } from '../utils';
import supertest from 'supertest';

let server: Server;

const Library: fhir4.Library = {
  resourceType: 'Library',
  type: { coding: [{ code: 'logic-library' }] },
  id: 'library123',
  status: 'active'
};

describe('LibraryService', () => {
  beforeAll(async () => {
    const config = serverConfig;
    server = initialize(config);
    await testSetup([Library]);
  });

  describe('searchById', () => {
    it('test searchById with correctHeaders and the id should be in database returns 200', async () => {
      await supertest(server.app)
        .get('/4_0_1/Library/library123')
        .set('Accept', 'application/json+fhir')
        .expect(200)
        .then(response => {
          expect(response.body.id).toEqual(Library.id);
        });
    });

    it('test searchById when the id cannot be found in the database', async () => {
      await supertest(server.app)
        .get('/4_0_1/Library/invalidID')
        .set('Accept', 'application/json+fhir')
        .expect(404)
        .then(response => {
          expect(response.body.issue[0].code).toEqual('ResourceNotFound');
          expect(response.body.issue[0].details.text).toEqual(
            `No resource found in collection: Library, with: id invalidID`
          );
        });
    });
  });

  afterAll(cleanUpDb);
});
