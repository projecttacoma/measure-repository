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

const LIBRARY_WITH_IDENTIFIER_VALUE: fhir4.Library = {
  resourceType: 'Library',
  type: { coding: [{ code: 'logic-library' }] },
  identifier: [{ value: 'libraryWithIdentifierValue' }],
  status: 'active'
};

const LIBRARY_WITH_IDENTIFIER_SYSTEM: fhir4.Library = {
  resourceType: 'Library',
  type: { coding: [{ code: 'logic-library' }] },
  identifier: [{ system: 'http://example.com/libraryWithIdentifierSystem' }],
  status: 'active'
};

const LIBRARY_WITH_IDENTIFIER_SYSTEM_AND_VALUE: fhir4.Library = {
  resourceType: 'Library',
  type: { coding: [{ code: 'logic-library' }] },
  identifier: [
    { system: 'http://example.com/libraryWithIdentifierSystemAndValue', value: 'libraryWithIdentifierSystemAndValue' }
  ],
  status: 'active'
};

const LIBRARY_WITH_NO_DEPS: fhir4.Library = {
  resourceType: 'Library',
  id: 'testLibraryWithNoDeps',
  status: 'active',
  url: 'http://example.com/testLibrary',
  type: { coding: [{ code: 'logic-library' }] }
};

const LIBRARY_WITH_DEPS: fhir4.Library = {
  resourceType: 'Library',
  id: 'testLibraryWithDeps2',
  status: 'draft',
  url: 'http://example.com/testLibraryWithDeps2',
  type: { coding: [{ code: 'logic-library' }] },
  relatedArtifact: [
    {
      type: 'depends-on',
      resource: 'http://example.com/testLibrary'
    }
  ]
};

const LIBRARY_WITH_NESTED_DEPS: fhir4.Library = {
  resourceType: 'Library',
  id: 'testLibraryWithDeps',
  status: 'draft',
  url: 'http://example.com/testLibraryWithDeps',
  type: { coding: [{ code: 'logic-library' }] },
  relatedArtifact: [
    {
      type: 'depends-on',
      resource: 'http://example.com/testLibraryWithDeps2'
    }
  ]
};

describe('LibraryService', () => {
  beforeAll(() => {
    server = initialize(serverConfig);
    return setupTestDatabase([
      LIBRARY_WITH_URL,
      LIBRARY_WITH_NO_DEPS,
      LIBRARY_WITH_NESTED_DEPS,
      LIBRARY_WITH_DEPS,
      LIBRARY_WITH_IDENTIFIER_VALUE,
      LIBRARY_WITH_IDENTIFIER_SYSTEM,
      LIBRARY_WITH_IDENTIFIER_SYSTEM_AND_VALUE
    ]);
  });

  describe('searchById', () => {
    it('returns 200 when passed correct headers and the id is in database', async () => {
      await supertest(server.app)
        .get('/4_0_1/Library/testLibraryWithNoDeps')
        .set('Accept', 'application/json+fhir')
        .expect(200)
        .then(response => {
          expect(response.body.id).toEqual(LIBRARY_WITH_NO_DEPS.id);
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
            `No resource found in collection: Library, with id: invalidID`
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
          expect(response.body.total).toEqual(5);
          expect(response.body.entry).toEqual(
            expect.arrayContaining([
              expect.objectContaining<fhir4.BundleEntry>({
                resource: LIBRARY_WITH_NO_DEPS
              }),
              expect.objectContaining<fhir4.BundleEntry>({
                resource: LIBRARY_WITH_URL
              })
            ])
          );
        });
    });
  });

  describe('$package', () => {
    it('returns a Bundle including the Library when the Library has no dependencies and id passed through args', async () => {
      await supertest(server.app)
        .get('/4_0_1/Library/testLibraryWithNoDeps/$package')
        .expect(200)
        .then(response => {
          expect(response.body.resourceType).toEqual('Bundle');
          expect(response.body.entry).toHaveLength(1);
          expect(response.body.entry).toEqual(expect.arrayContaining([{ resource: LIBRARY_WITH_NO_DEPS }]));
        });
    });

    it('returns a Bundle including the Library when the Library has no dependencies and id passed through body', async () => {
      await supertest(server.app)
        .post('/4_0_1/Library/$package')
        .send({ resourceType: 'Parameters', parameter: [{ name: 'id', valueString: 'testLibraryWithNoDeps' }] })
        .set('content-type', 'application/fhir+json')
        .expect(200)
        .then(response => {
          expect(response.body.resourceType).toEqual('Bundle');
          expect(response.body.entry).toHaveLength(1);
          expect(response.body.entry).toEqual(expect.arrayContaining([{ resource: LIBRARY_WITH_NO_DEPS }]));
        });
    });

    it('returns a Bundle including the Library and its dependent libraries when the Library has dependencies and id passed through args', async () => {
      await supertest(server.app)
        .get('/4_0_1/Library/testLibraryWithDeps/$package')
        .expect(200)
        .expect(200)
        .then(response => {
          expect(response.body.resourceType).toEqual('Bundle');
          expect(response.body.entry).toHaveLength(3);
          expect(response.body.entry).toEqual(
            expect.arrayContaining([
              { resource: LIBRARY_WITH_NESTED_DEPS },
              { resource: LIBRARY_WITH_NO_DEPS },
              { resource: LIBRARY_WITH_DEPS }
            ])
          );
        });
    });

    it('returns a Bundle including the Library and its dependent libraries when the Library has dependencies and id passed through body', async () => {
      await supertest(server.app)
        .post('/4_0_1/Library/$package')
        .send({ resourceType: 'Parameters', parameter: [{ name: 'id', valueString: 'testLibraryWithDeps' }] })
        .set('content-type', 'application/fhir+json')
        .expect(200)
        .then(response => {
          expect(response.body.resourceType).toEqual('Bundle');
          expect(response.body.entry).toHaveLength(3);
          expect(response.body.entry).toEqual(
            expect.arrayContaining([
              { resource: LIBRARY_WITH_NESTED_DEPS },
              { resource: LIBRARY_WITH_NO_DEPS },
              { resource: LIBRARY_WITH_DEPS }
            ])
          );
        });
    });

    it('returns a Bundle including just the Library when the Library has no dependencies and identifier with just idenifier.value passed through body', async () => {
      await supertest(server.app)
        .post('/4_0_1/Library/$package')
        .send({
          resourceType: 'Parameters',
          parameter: [{ name: 'identifier', valueString: 'libraryWithIdentifierValue' }]
        })
        .set('content-type', 'application/fhir+json')
        .expect(200)
        .then(response => {
          expect(response.body.resourceType).toEqual('Bundle');
          expect(response.body.entry).toHaveLength(1);
          expect(response.body.entry).toEqual(expect.arrayContaining([{ resource: LIBRARY_WITH_IDENTIFIER_VALUE }]));
        });
    });

    it('returns a Bundle including just the Library when the Library has no dependencies and identifier with just identifier.system passed through body', async () => {
      await supertest(server.app)
        .post('/4_0_1/Library/$package')
        .send({
          resourceType: 'Parameters',
          parameter: [{ name: 'identifier', valueString: 'http://example.com/libraryWithIdentifierSystem|' }]
        })
        .set('content-type', 'application/fhir+json')
        .expect(200)
        .then(response => {
          expect(response.body.resourceType).toEqual('Bundle');
          expect(response.body.entry).toHaveLength(1);
          expect(response.body.entry).toEqual(expect.arrayContaining([{ resource: LIBRARY_WITH_IDENTIFIER_SYSTEM }]));
        });
    });

    it('returns a Bundle including just the Library when the Library has no dependencies and identifier with both identifier.system and identifier.value passed through body', async () => {
      await supertest(server.app)
        .post('/4_0_1/Library/$package')
        .send({
          resourceType: 'Parameters',
          parameter: [
            {
              name: 'identifier',
              valueString: 'http://example.com/libraryWithIdentifierSystemAndValue|libraryWithIdentifierSystemAndValue'
            }
          ]
        })
        .set('content-type', 'application/fhir+json')
        .expect(200)
        .then(response => {
          expect(response.body.resourceType).toEqual('Bundle');
          expect(response.body.entry).toHaveLength(1);
          expect(response.body.entry).toEqual(
            expect.arrayContaining([{ resource: LIBRARY_WITH_IDENTIFIER_SYSTEM_AND_VALUE }])
          );
        });
    });

    it('throws a 400 error when no url or id included in request', async () => {
      await supertest(server.app)
        .post('/4_0_1/Library/$package')
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

    it('throws a 404 error when both the library id and url are specified but one of them is invalid', async () => {
      await supertest(server.app)
        .post('/4_0_1/Library/$package')
        .send({
          resourceType: 'Parameters',
          parameter: [
            { name: 'id', valueString: 'testLibraryWithDeps' },
            { name: 'url', valueUrl: 'invalid' }
          ]
        })
        .set('content-type', 'application/fhir+json')
        .expect(404)
        .then(response => {
          expect(response.body.issue[0].code).toEqual('ResourceNotFound');
          expect(response.body.issue[0].details.text).toEqual(
            'No resource found in collection: Library, with id: testLibraryWithDeps and url: invalid'
          );
        });
    });

    it('throws a 404 error when no library matching id and url can be found', async () => {
      await supertest(server.app)
        .post('/4_0_1/Library/$package')
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
            'No resource found in collection: Library, with id: invalid and url: invalid'
          );
        });
    });
  });
  afterAll(() => {
    return cleanUpTestDatabase();
  });
});
