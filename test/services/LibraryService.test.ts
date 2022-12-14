import { initialize, Server } from '@projecttacoma/node-fhir-server-core';
import { serverConfig } from '../../src/config/serverConfig';
import { cleanUpTestDatabase, setupTestDatabase } from '../utils';
import supertest from 'supertest';

let server: Server;

const LIBRARY_WITH_URL: fhir4.Library = {
  resourceType: 'Library',
  type: { coding: [{ code: 'logic-library' }] },
  id: 'testWithUrl',
  status: 'active',
  url: 'http://example.com'
};

const LIBRARY: fhir4.Library = {
  resourceType: 'Library',
  type: { coding: [{ code: 'logic-library' }] },
  id: 'test',
  status: 'active'
};

describe('LibraryService', () => {
  beforeAll(() => {
    server = initialize(serverConfig);
    return setupTestDatabase([LIBRARY, LIBRARY_WITH_URL]);
  });

  describe('searchById', () => {
    it('returns 200 when passed correct headers and the id is in database', async () => {
      await supertest(server.app)
        .get('/4_0_1/Library/test')
        .set('Accept', 'application/json+fhir')
        .expect(200)
        .then(response => {
          expect(response.body.id).toEqual(LIBRARY.id);
        });
    });

    it('returns 404 when passed correct headers and id is not in database', async () => {
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
  describe('search', () => {
    it('returns 200 and correct searchset bundle when query matches single resource', async () => {
      await supertest(server.app)
        .get('/4_0_1/Library')
        .query({ url: 'http://example.com', status: 'active' })
        .set('Accept', 'application/json+fhir')
        .expect(200)
        .then(response => {
          expect(response.body.resourceType).toEqual('Bundle');
          expect(response.body.total).toEqual(1);
          expect(response.body.entry[0].resource).toEqual(LIBRARY_WITH_URL);
        });
    });

    it('returns 200 and correct searchset bundle when query matches multiple resources', async () => {
      await supertest(server.app)
        .get('/4_0_1/Library')
        .query({ status: 'active' })
        .set('Accept', 'application/json+fhir')
        .expect(200)
        .then(response => {
          expect(response.body.resourceType).toEqual('Bundle');
          expect(response.body.total).toEqual(2);
          expect(response.body.entry).toEqual(
            expect.arrayContaining([
              expect.objectContaining<fhir4.BundleEntry>({
                resource: LIBRARY
              }),
              expect.objectContaining<fhir4.BundleEntry>({
                resource: LIBRARY_WITH_URL
              })
            ])
          );
        });
    });
  });
  afterAll(() => {
    return cleanUpTestDatabase();
  });
});
