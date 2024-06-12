import { initialize, Server } from '@projecttacoma/node-fhir-server-core';
import { serverConfig } from '../../src/config/serverConfig';
import { cleanUpTestDatabase, setupTestDatabase, createTestResource } from '../utils';
import supertest from 'supertest';
import { Calculator } from 'fqm-execution';

let server: Server;

const LIBRARY_WITH_URL: fhir4.Library = {
  resourceType: 'Library',
  type: { coding: [{ code: 'logic-library' }] },
  id: 'testWithUrl',
  status: 'active',
  url: 'http://example.com'
};

const LIBRARY_WITH_URL_ONLY_ID: fhir4.Library = {
  resourceType: 'Library',
  type: { coding: [{ code: 'logic-library' }] },
  id: 'testWithUrl',
  status: 'active',
  meta: {
    tag: [
      {
        code: 'SUBSETTED',
        system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationValue'
      }
    ]
  }
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
  version: '0.0.1-test',
  url: 'http://example.com/testLibraryWithDeps',
  type: { coding: [{ code: 'logic-library' }] },
  relatedArtifact: [
    {
      type: 'depends-on',
      resource: 'http://example.com/testLibraryWithDeps2'
    }
  ]
};

const LIBRARY_WITH_SAME_SYSTEM: fhir4.Library = {
  resourceType: 'Library',
  type: { coding: [{ code: 'logic-library' }] },
  identifier: [{ system: 'http://example.com/libraryWithSameSystem', value: 'libraryWithValue' }],
  status: 'active'
};

const LIBRARY_WITH_SAME_SYSTEM2: fhir4.Library = {
  resourceType: 'Library',
  type: { coding: [{ code: 'logic-library' }] },
  identifier: [{ system: 'http://example.com/libraryWithSameSystem', value: 'libraryWithDifferentValue' }],
  status: 'active'
};

describe('LibraryService', () => {
  beforeAll(() => {
    server = initialize(serverConfig);
    process.env.AUTHORING = 'true';
    return setupTestDatabase([
      LIBRARY_WITH_URL,
      LIBRARY_WITH_NO_DEPS,
      LIBRARY_WITH_NESTED_DEPS,
      LIBRARY_WITH_DEPS,
      LIBRARY_WITH_IDENTIFIER_VALUE,
      LIBRARY_WITH_IDENTIFIER_SYSTEM,
      LIBRARY_WITH_IDENTIFIER_SYSTEM_AND_VALUE,
      LIBRARY_WITH_SAME_SYSTEM,
      LIBRARY_WITH_SAME_SYSTEM2
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
          expect(response.body.issue[0].code).toEqual('not-found');
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
          expect(response.body.total).toEqual(7);
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

    it('returns 200 and correct searchset bundle with only id element when query matches single resource', async () => {
      await supertest(server.app)
        .get('/4_0_1/Library')
        .query({ _elements: 'id', status: 'active', url: 'http://example.com' })
        .set('Accept', 'application/json+fhir')
        .expect(200)
        .then(response => {
          expect(response.body.resourceType).toEqual('Bundle');
          expect(response.body.total).toEqual(1);
          expect(response.body.entry[0].resource).toEqual(LIBRARY_WITH_URL_ONLY_ID);
        });
    });

    it('returns 200 and correct searchset bundle with only id element when query matches multiple resources', async () => {
      await supertest(server.app)
        .get('/4_0_1/Library')
        .query({ _elements: 'id', status: 'active' })
        .set('Accept', 'application/json+fhir')
        .expect(200)
        .then(response => {
          expect(response.body.resourceType).toEqual('Bundle');
          expect(response.body.total).toEqual(7);
          expect(response.body.entry).toEqual(
            expect.arrayContaining([
              expect.objectContaining<fhir4.BundleEntry>({
                resource: LIBRARY_WITH_URL_ONLY_ID
              })
            ])
          );
        });
    });

    it('returns 200 and correct searchset bundle that does not have entries only the count when the _summary=count parameter is provided', async () => {
      await supertest(server.app)
        .get('/4_0_1/Library')
        .query({ _summary: 'count' })
        .set('Accept', 'application/json+fhir')
        .expect(200)
        .then(response => {
          expect(response.body.resourceType).toEqual('Bundle');
          expect(response.body.total).toEqual(9);
          expect(response.body.entry).toBeUndefined;
        });
    });

    it('returns 400 when query contains version without url', async () => {
      await supertest(server.app)
        .get('/4_0_1/Library')
        .query({ status: 'active', version: 'searchable' })
        .set('Accept', 'application/json+fhir')
        .expect(400)
        .then(response => {
          expect(response.body.issue[0].code).toEqual('invalid');
          expect(response.body.issue[0].details.text).toEqual(
            'Version can only appear in combination with a url search'
          );
        });
    });
  });

  describe('publishable repository validation', () => {
    const ORIGINAL_AUTHORING = process.env.AUTHORING;
    beforeAll(() => {
      process.env.AUTHORING = 'false';
      createTestResource(
        {
          resourceType: 'Library',
          type: { coding: [{ code: 'logic-library' }] },
          id: 'publishable-retired',
          status: 'retired',
          title: 'test'
        },
        'Library'
      );
      return createTestResource(
        {
          resourceType: 'Library',
          type: { coding: [{ code: 'logic-library' }] },
          id: 'publishable-active',
          status: 'active',
          title: 'test'
        },
        'Library'
      );
    });
    it('publish: returns 400 status when provided with artifact in non-active status', async () => {
      await supertest(server.app)
        .post('/4_0_1/Library')
        .send({ resourceType: 'Library', status: 'draft' })
        .set('content-type', 'application/json+fhir')
        .expect(400);
    });
    it('retire: returns 400 when artifact to update is not in active status', async () => {
      await supertest(server.app)
        .put('/4_0_1/Library/publishable-retired')
        .send({
          resourceType: 'Library',
          id: 'publishable-retired',
          status: 'active',
          title: 'test',
          type: { coding: [{ code: 'logic-library' }] }
        })
        .set('content-type', 'application/json+fhir')
        .expect(400);
    });

    it('retire: returns 400 when attempting to update non-date/non-status fields', async () => {
      await supertest(server.app)
        .put('/4_0_1/Library/publishable-active')
        .send({
          resourceType: 'Library',
          id: 'publishable-active',
          status: 'retired',
          title: 'updated',
          type: { coding: [{ code: 'logic-library' }] }
        })
        .set('content-type', 'application/json+fhir')
        .expect(400);
    });
    it('archive: returns 400 status when deleting an active artifact', async () => {
      await supertest(server.app)
        .delete('/4_0_1/Library/publishable-active')
        .send()
        .set('content-type', 'application/json+fhir')
        .expect(400);
    });
    afterAll(() => {
      process.env.AUTHORING = ORIGINAL_AUTHORING;
    });
  });

  describe('create', () => {
    it('submit: returns 201 status with populated location when provided correct headers and a FHIR Library', async () => {
      await supertest(server.app)
        .post('/4_0_1/Library')
        .send({ resourceType: 'Library', status: 'draft' })
        .set('content-type', 'application/json+fhir')
        .expect(201)
        .then(response => {
          expect(response.headers.location).toBeDefined();
        });
    });

    it('publish: returns 201 status with populated location when provided correct headers and a FHIR Library', async () => {
      await supertest(server.app)
        .post('/4_0_1/Library')
        .send({ resourceType: 'Library', status: 'active' })
        .set('content-type', 'application/json+fhir')
        .expect(201)
        .then(response => {
          expect(response.headers.location).toBeDefined();
        });
    });
  });

  describe('update', () => {
    beforeAll(() => {
      createTestResource(
        {
          resourceType: 'Library',
          type: { coding: [{ code: 'logic-library' }] },
          id: 'exampleId-active',
          status: 'active',
          title: 'test'
        },
        'Library'
      );
      return createTestResource(
        {
          resourceType: 'Library',
          type: { coding: [{ code: 'logic-library' }] },
          id: 'exampleId',
          status: 'draft',
          title: 'test'
        },
        'Library'
      );
    });

    it('revise: returns 200 when provided correct headers and a FHIR Library whose id is in the database', async () => {
      await supertest(server.app)
        .put('/4_0_1/Library/exampleId')
        .send({ resourceType: 'Library', id: 'exampleId', status: 'draft', title: 'updated' })
        .set('content-type', 'application/json+fhir')
        .expect(200)
        .then(response => {
          expect(response.headers.location).toBeDefined();
        });
    });

    it('revise: returns 400 when status changes', async () => {
      await supertest(server.app)
        .put('/4_0_1/Library/exampleId')
        .send({ resourceType: 'Library', id: 'exampleId', status: 'active', title: 'updated' })
        .set('content-type', 'application/json+fhir')
        .expect(400);
    });

    it('retire: returns 200 when provided updated status for retiring', async () => {
      await supertest(server.app)
        .put('/4_0_1/Library/exampleId-active')
        .send({
          resourceType: 'Library',
          id: 'exampleId-active',
          status: 'retired',
          title: 'test',
          type: { coding: [{ code: 'logic-library' }] }
        })
        .set('content-type', 'application/json+fhir')
        .expect(200)
        .then(response => {
          expect(response.headers.location).toBeDefined();
        });
    });

    it('returns 201 when provided correct headers and a FHIR Library whose id is not in the database', async () => {
      await supertest(server.app)
        .put('/4_0_1/Library/newId')
        .send({ resourceType: 'Library', id: 'newId', status: 'draft' })
        .set('content-type', 'application/json+fhir')
        .expect(201)
        .then(response => {
          expect(response.headers.location).toBeDefined();
        });
    });

    it('returns 400 when the argument id does not match the id in the body', async () => {
      await supertest(server.app)
        .put('/4_0_1/Library/invalidId')
        .send({
          resourceType: 'Library',
          id: 'exampleId',
          status: 'draft'
        })
        .set('content-type', 'application/json+fhir')
        .expect(400)
        .then(response => {
          expect(response.body.issue[0].code).toEqual('invalid');
          expect(response.body.issue[0].details.text).toEqual('Argument id must match request body id for PUT request');
        });
    });
  });

  describe('delete', () => {
    beforeAll(() => {
      createTestResource(
        {
          resourceType: 'Library',
          type: { coding: [{ code: 'logic-library' }] },
          id: 'delete-active',
          status: 'active',
          title: 'test'
        },
        'Library'
      );
      createTestResource(
        {
          resourceType: 'Library',
          type: { coding: [{ code: 'logic-library' }] },
          id: 'delete-retired',
          status: 'retired',
          title: 'test'
        },
        'Library'
      );
      return createTestResource(
        {
          resourceType: 'Library',
          type: { coding: [{ code: 'logic-library' }] },
          id: 'delete-draft',
          status: 'draft',
          title: 'test'
        },
        'Library'
      );
    });
    it('withdraw: returns 204 status when deleting a draft artifact', async () => {
      await supertest(server.app)
        .delete('/4_0_1/Library/delete-draft')
        .send()
        .set('content-type', 'application/json+fhir')
        .expect(204);
    });
    it('archive: returns 204 status when deleting a retired artifact', async () => {
      await supertest(server.app)
        .delete('/4_0_1/Library/delete-retired')
        .send()
        .set('content-type', 'application/json+fhir')
        .expect(204);
    });
    it('archive: returns 400 status when deleting an active artifact', async () => {
      await supertest(server.app)
        .delete('/4_0_1/Library/delete-active')
        .send()
        .set('content-type', 'application/json+fhir')
        .expect(400);
    });
  });

  describe('$cqfm.package', () => {
    it('returns a Bundle including the Library when the Library has no dependencies and id passed through args', async () => {
      await supertest(server.app)
        .get('/4_0_1/Library/testLibraryWithNoDeps/$cqfm.package')
        .expect(200)
        .then(response => {
          expect(response.body.resourceType).toEqual('Bundle');
          expect(response.body.entry).toHaveLength(1);
          expect(response.body.entry).toEqual(expect.arrayContaining([{ resource: LIBRARY_WITH_NO_DEPS }]));
        });
    });

    it('returns a Bundle including the Library when the Library has no dependencies and id passed through body', async () => {
      await supertest(server.app)
        .post('/4_0_1/Library/$cqfm.package')
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
        .get('/4_0_1/Library/testLibraryWithDeps/$cqfm.package')
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
        .post('/4_0_1/Library/$cqfm.package')
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
        .post('/4_0_1/Library/$cqfm.package')
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
        .post('/4_0_1/Library/$cqfm.package')
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
        .post('/4_0_1/Library/$cqfm.package')
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

    it('throws a 400 error when only an identifier system is included in the body but there are two libraries with that identifier.system', async () => {
      await supertest(server.app)
        .post('/4_0_1/Library/$cqfm.package')
        .send({
          resourceType: 'Parameters',
          parameter: [
            {
              name: 'identifier',
              valueString: 'http://example.com/libraryWithSameSystem|'
            }
          ]
        })
        .set('content-type', 'application/fhir+json')
        .expect(400)
        .then(response => {
          expect(response.body.issue[0].code).toEqual('invalid');
          expect(response.body.issue[0].details.text).toEqual(
            'Multiple resources found in collection: Library, with identifier: http://example.com/libraryWithSameSystem|. /Library/$cqfm.package operation must specify a single Library'
          );
        });
    });

    it('throws a 400 error when no url or id included in request', async () => {
      await supertest(server.app)
        .post('/4_0_1/Library/$cqfm.package')
        .send({ resourceType: 'Parameters', parameter: [] })
        .set('content-type', 'application/fhir+json')
        .expect(400)
        .then(response => {
          expect(response.body.issue[0].code).toEqual('required');
          expect(response.body.issue[0].details.text).toEqual(
            'Must provide identifying information via either id, url, or identifier parameters'
          );
        });
    });

    it('throws a 400 error when an id is included in both the path and a FHIR parameter', async () => {
      await supertest(server.app)
        .post('/4_0_1/Library/testLibraryWithDeps/$cqfm.package')
        .send({ resourceType: 'Parameters', parameter: [{ name: 'id', valueString: 'testLibraryWithDeps' }] })
        .set('content-type', 'application/fhir+json')
        .expect(400)
        .then(response => {
          expect(response.body.issue[0].code).toEqual('invalid');
          expect(response.body.issue[0].details.text).toEqual(
            'Id argument may not be sourced from both a path parameter and a query or FHIR parameter.'
          );
        });
    });

    it('throws a 400 error when an id is included in both the path and a query parameter', async () => {
      await supertest(server.app)
        .get('/4_0_1/Library/testLibraryWithDeps/$cqfm.package')
        .query({ id: 'testLibraryWithDeps' })
        .set('content-type', 'application/fhir+json')
        .expect(400)
        .then(response => {
          expect(response.body.issue[0].code).toEqual('invalid');
          expect(response.body.issue[0].details.text).toEqual(
            'Id argument may not be sourced from both a path parameter and a query or FHIR parameter.'
          );
        });
    });

    it('throws a 404 error when both the library id and url are specified but one of them is invalid', async () => {
      await supertest(server.app)
        .post('/4_0_1/Library/$cqfm.package')
        .send({
          resourceType: 'Parameters',
          parameter: [
            { name: 'id', valueString: 'testLibraryWithDeps' },
            { name: 'url', valueUrl: 'http://example.com/invalid' }
          ]
        })
        .set('content-type', 'application/fhir+json')
        .expect(404)
        .then(response => {
          expect(response.body.issue[0].code).toEqual('not-found');
          expect(response.body.issue[0].details.text).toEqual(
            'No resource found in collection: Library, with id: testLibraryWithDeps and url: http://example.com/invalid'
          );
        });
    });

    it('throws a 404 error when no library matching id and url can be found', async () => {
      await supertest(server.app)
        .post('/4_0_1/Library/$cqfm.package')
        .send({
          resourceType: 'Parameters',
          parameter: [
            { name: 'id', valueString: 'invalid' },
            { name: 'url', valueUrl: 'http://example.com/invalid' }
          ]
        })
        .set('content-type', 'application/fhir+json')
        .expect(404)
        .then(response => {
          expect(response.body.issue[0].code).toEqual('not-found');
          expect(response.body.issue[0].details.text).toEqual(
            'No resource found in collection: Library, with id: invalid and url: http://example.com/invalid'
          );
        });
    });
  });

  describe('$data-requirements', () => {
    let calc: any;
    beforeEach(() => {
      // spy on calculation function
      calc = jest.spyOn(Calculator, 'calculateLibraryDataRequirements').mockResolvedValue({
        results: {
          resourceType: 'Library',
          type: {
            coding: [{ code: 'module-definition', system: 'http://terminology.hl7.org/CodeSystem/library-type' }]
          },
          status: 'draft',
          dataRequirement: []
        }
      });
    });

    it('returns 200 and a Library for a simple Library with url, version, dependencies', async () => {
      await supertest(server.app)
        .post('/4_0_1/Library/$data-requirements')
        .send({ resourceType: 'Parameters', parameter: [{ name: 'id', valueString: 'testLibraryWithDeps' }] })
        .set('content-type', 'application/fhir+json')
        .expect(200)
        .then(response => {
          expect(response.body.resourceType).toEqual('Library');
          expect(response.body.type.coding[0].code).toEqual('module-definition');
          expect(response.body.dataRequirement).toHaveLength(0);
          expect(calc).toBeCalledWith(
            expect.objectContaining({
              resourceType: 'Bundle'
            }),
            { rootLibRef: 'http://example.com/testLibraryWithDeps|0.0.1-test' }
          );
        });
    });

    it('returns 200 and a Library for a request with id in the url', async () => {
      await supertest(server.app)
        .get('/4_0_1/Library/testLibraryWithDeps/$data-requirements')
        .expect(200)
        .then(response => {
          expect(response.body.resourceType).toEqual('Library');
          expect(response.body.type.coding[0].code).toEqual('module-definition');
          expect(response.body.dataRequirement).toHaveLength(0);
          expect(calc).toBeCalledWith(
            expect.objectContaining({
              resourceType: 'Bundle'
            }),
            { rootLibRef: 'http://example.com/testLibraryWithDeps|0.0.1-test' }
          );
        });
    });

    it('returns 200 with query params', async () => {
      await supertest(server.app)
        .get('/4_0_1/Library/$data-requirements')
        .query({ id: 'testLibraryWithDeps' })
        .expect(200)
        .then(response => {
          expect(response.body.resourceType).toEqual('Library');
          expect(response.body.type.coding[0].code).toEqual('module-definition');
          expect(response.body.dataRequirement).toHaveLength(0);
          expect(calc).toBeCalledWith(
            expect.objectContaining({
              resourceType: 'Bundle'
            }),
            expect.objectContaining({
              rootLibRef: 'http://example.com/testLibraryWithDeps|0.0.1-test'
            })
          );
        });
    });

    it('throws a 400 with passed period start', async () => {
      await supertest(server.app)
        .post('/4_0_1/Library/$data-requirements')
        .send({
          resourceType: 'Parameters',
          parameter: [
            { name: 'id', valueString: 'testLibraryWithDeps' },
            { name: 'periodStart', valueDate: '2021-01-01' }
          ]
        })
        .set('content-type', 'application/fhir+json')
        .expect(400)
        .then(response => {
          expect(response.body.issue[0].code).toEqual('value');
          expect(response.body.issue[0].details.text).toEqual(`Unrecognized key(s) in object: 'periodStart'`);
        });
    });

    it('throws a 400 with passed period end', async () => {
      await supertest(server.app)
        .post('/4_0_1/Library/$data-requirements')
        .send({
          resourceType: 'Parameters',
          parameter: [
            { name: 'id', valueString: 'testLibraryWithDeps' },
            { name: 'periodEnd', valueDate: '2021-12-31' }
          ]
        })
        .set('content-type', 'application/fhir+json')
        .expect(400)
        .then(response => {
          expect(response.body.issue[0].code).toEqual('value');
          expect(response.body.issue[0].details.text).toEqual(`Unrecognized key(s) in object: 'periodEnd'`);
        });
    });

    it('throws a 400 error when an id is included in both the path and a FHIR parameter', async () => {
      await supertest(server.app)
        .post('/4_0_1/Library/testLibraryWithDeps/$data-requirements')
        .send({ resourceType: 'Parameters', parameter: [{ name: 'id', valueString: 'testLibraryWithDeps' }] })
        .set('content-type', 'application/fhir+json')
        .expect(400)
        .then(response => {
          expect(response.body.issue[0].code).toEqual('invalid');
          expect(response.body.issue[0].details.text).toEqual(
            'Id argument may not be sourced from both a path parameter and a query or FHIR parameter.'
          );
        });
    });

    it('throws a 400 error when an id is included in both the path and a query parameter', async () => {
      await supertest(server.app)
        .get('/4_0_1/Library/testLibraryWithDeps/$data-requirements')
        .query({ id: 'testLibraryWithDeps' })
        .set('content-type', 'application/fhir+json')
        .expect(400)
        .then(response => {
          expect(response.body.issue[0].code).toEqual('invalid');
          expect(response.body.issue[0].details.text).toEqual(
            'Id argument may not be sourced from both a path parameter and a query or FHIR parameter.'
          );
        });
    });
  });
  afterAll(() => {
    return cleanUpTestDatabase();
  });
});
