import { initialize, Server } from '@projecttacoma/node-fhir-server-core';
import { serverConfig } from '../../src/config/serverConfig';
import { cleanUpTestDatabase, setupTestDatabase, createTestResource } from '../utils';
import supertest from 'supertest';
import { Calculator } from 'fqm-execution';
import { CRMIShareableLibrary } from '../../src/types/service-types';

let server: Server;

const LIBRARY_BASE = {
  type: { coding: [{ code: 'logic-library' }] },
  version: '1',
  title: 'Sample title',
  description: 'Sample description'
};

const ACTIVE_LIBRARY: CRMIShareableLibrary = {
  resourceType: 'Library',
  id: 'testActiveLibrary',
  url: 'http://example.com/testActiveLibrary',
  status: 'active',
  name: 'sampleName',
  ...LIBRARY_BASE
};

const ACTIVE_LIBRARY_2: CRMIShareableLibrary = {
  resourceType: 'Library',
  id: 'testActiveLibrary2',
  url: 'http://example.com/testActiveLibrary2',
  status: 'active',
  name: 'sampleName',
  ...LIBRARY_BASE
};

const ACTIVE_LIBRARY_NO_NAME: CRMIShareableLibrary = {
  resourceType: 'Library',
  id: 'testActiveLibrary',
  url: 'http://example.com/testActiveLibrary',
  status: 'active',
  meta: {
    tag: [
      {
        code: 'SUBSETTED',
        system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationValue'
      }
    ]
  },
  ...LIBRARY_BASE
};

const NEW_ACTIVE_LIBRARY: CRMIShareableLibrary = {
  resourceType: 'Library',
  id: 'newTestActiveLibrary',
  url: 'http://example.com/newTestActiveLibrary',
  status: 'active',
  ...LIBRARY_BASE
};

const DRAFT_LIBRARY: CRMIShareableLibrary = {
  resourceType: 'Library',
  id: 'testDraftLibrary',
  url: 'http://example.com/testDraftLibrary',
  status: 'draft',
  ...LIBRARY_BASE
};

const DRAFT_LIBRARY_2: CRMIShareableLibrary = {
  resourceType: 'Library',
  id: 'testDraftLibrary2',
  url: 'http://example.com/testDraftLibrary2',
  status: 'draft',
  ...LIBRARY_BASE
};

const LIBRARY_WITH_IDENTIFIER_VALUE: CRMIShareableLibrary = {
  resourceType: 'Library',
  id: 'libraryWithIdentifierValue',
  url: 'http://example.com/libraryWithIdentifierValue',
  status: 'active',
  identifier: [{ value: 'libraryWithIdentifierValue' }],
  ...LIBRARY_BASE
};

const LIBRARY_WITH_IDENTIFIER_SYSTEM: CRMIShareableLibrary = {
  resourceType: 'Library',
  id: 'libraryWithIdentifierSystem',
  url: 'http://example.com/libraryWithIdentifierSystem',
  status: 'active',
  identifier: [{ system: 'http://example.com/libraryWithIdentifierSystem' }],
  ...LIBRARY_BASE
};

const LIBRARY_WITH_IDENTIFIER_SYSTEM_AND_VALUE: CRMIShareableLibrary = {
  resourceType: 'Library',
  id: 'libraryWithIdentifierSystemAndValue',
  url: 'http://example.com/libraryWithIdentifierSystemAndValue',
  status: 'active',
  identifier: [
    { system: 'http://example.com/libraryWithIdentifierSystemAndValue', value: 'libraryWithIdentifierSystemAndValue' }
  ],
  ...LIBRARY_BASE
};

const LIBRARY_WITH_DEPS: CRMIShareableLibrary = {
  resourceType: 'Library',
  id: 'testActiveLibraryWithDeps',
  url: 'http://example.com/testActiveLibraryWithDeps',
  status: 'draft',
  relatedArtifact: [
    {
      type: 'depends-on',
      resource: 'http://example.com/testActiveLibrary'
    }
  ],
  ...LIBRARY_BASE
};

const LIBRARY_WITH_NESTED_DEPS: CRMIShareableLibrary = {
  resourceType: 'Library',
  id: 'testActiveLibraryWithDeps2',
  url: 'http://example.com/testActiveLibraryWithDeps2',
  status: 'draft',
  version: '0.0.1-test',
  type: { coding: [{ code: 'logic-library' }] },
  title: 'Sample title',
  description: 'Sample description',
  relatedArtifact: [
    {
      type: 'depends-on',
      resource: 'http://example.com/testActiveLibraryWithDeps'
    }
  ]
};

const LIBRARY_WITH_SAME_SYSTEM: CRMIShareableLibrary = {
  resourceType: 'Library',
  id: 'libraryWithSameSystem',
  url: 'http://example.com/libraryWithSameSystem',
  status: 'active',
  identifier: [{ system: 'http://example.com/libraryWithSameSystem', value: 'libraryWithValue' }],
  ...LIBRARY_BASE
};

const LIBRARY_WITH_SAME_SYSTEM2: CRMIShareableLibrary = {
  resourceType: 'Library',
  id: 'libraryWithSameSystem2',
  url: 'http://example.com/libraryWithSameSystem2',
  status: 'active',
  identifier: [{ system: 'http://example.com/libraryWithSameSystem', value: 'libraryWithDifferentValue' }],
  ...LIBRARY_BASE
};

const PARENT_ACTIVE_LIBRARY: CRMIShareableLibrary = {
  resourceType: 'Library',
  id: 'parentLibrary',
  url: 'http://parent-library.com',
  status: 'active',
  relatedArtifact: [
    {
      type: 'composed-of',
      resource: 'http://child-library.com|1',
      extension: [
        {
          url: 'http://hl7.org/fhir/StructureDefinition/artifact-isOwned',
          valueBoolean: true
        }
      ]
    }
  ],
  ...LIBRARY_BASE
};

const CHILD_ACTIVE_LIBRARY: CRMIShareableLibrary = {
  resourceType: 'Library',
  id: 'childLibrary',
  url: 'http://child-library.com',
  status: 'active',
  extension: [
    {
      url: 'http://hl7.org/fhir/StructureDefinition/artifact-isOwned',
      valueBoolean: true
    }
  ],
  ...LIBRARY_BASE
};

describe('LibraryService', () => {
  beforeAll(async () => {
    server = initialize(serverConfig);
    process.env.AUTHORING = 'true';
    await setupTestDatabase([
      ACTIVE_LIBRARY,
      ACTIVE_LIBRARY_2,
      LIBRARY_WITH_NESTED_DEPS,
      LIBRARY_WITH_DEPS,
      LIBRARY_WITH_IDENTIFIER_VALUE,
      LIBRARY_WITH_IDENTIFIER_SYSTEM,
      LIBRARY_WITH_IDENTIFIER_SYSTEM_AND_VALUE,
      LIBRARY_WITH_SAME_SYSTEM,
      LIBRARY_WITH_SAME_SYSTEM2,
      PARENT_ACTIVE_LIBRARY,
      CHILD_ACTIVE_LIBRARY
    ]);
  });

  describe('searchById', () => {
    it('returns 200 when passed correct headers and the id is in database', async () => {
      await supertest(server.app)
        .get('/4_0_1/Library/testActiveLibrary')
        .set('Accept', 'application/json+fhir')
        .expect(200)
        .then(response => {
          expect(response.body.id).toEqual(ACTIVE_LIBRARY.id);
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
        .query({ url: 'http://example.com/testActiveLibrary', status: 'active', id: 'testActiveLibrary' })
        .set('Accept', 'application/json+fhir')
        .expect(200)
        .then(response => {
          expect(response.body.resourceType).toEqual('Bundle');
          expect(response.body.total).toEqual(1);
          expect(response.body.entry[0].resource).toEqual(ACTIVE_LIBRARY);
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
          expect(response.body.total).toEqual(9);
          expect(response.body.entry).toEqual(
            expect.arrayContaining([
              expect.objectContaining<fhir4.BundleEntry>({
                resource: ACTIVE_LIBRARY
              }),
              expect.objectContaining<fhir4.BundleEntry>({
                resource: ACTIVE_LIBRARY_2
              })
            ])
          );
        });
    });

    it('returns 200 and correct searchset bundle with only id element when query matches single resource', async () => {
      await supertest(server.app)
        .get('/4_0_1/Library')
        .query({
          _elements: 'id',
          status: 'active',
          url: 'http://example.com/testActiveLibrary',
          id: 'testActiveLibrary'
        })
        .set('Accept', 'application/json+fhir')
        .expect(200)
        .then(response => {
          expect(response.body.resourceType).toEqual('Bundle');
          expect(response.body.total).toEqual(1);
          expect(response.body.entry[0].resource).toEqual(ACTIVE_LIBRARY_NO_NAME);
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
          expect(response.body.total).toEqual(9);
          expect(response.body.entry).toEqual(
            expect.arrayContaining([
              expect.objectContaining<fhir4.BundleEntry>({
                resource: ACTIVE_LIBRARY_NO_NAME
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
          expect(response.body.total).toEqual(11);
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
          id: 'publishable-retired',
          url: 'http://example.com/publishable-retired',
          status: 'retired',
          ...LIBRARY_BASE
        },
        'Library'
      );
      return createTestResource(
        {
          resourceType: 'Library',
          id: 'publishable-active',
          url: 'http://example.com/publishable-active',
          status: 'active',
          ...LIBRARY_BASE
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
          url: 'http://example.com/publishable-retired',
          status: 'active',
          ...LIBRARY_BASE
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
          url: 'http://example.com/publishable-active',
          version: '1',
          status: 'retired',
          title: 'updated',
          type: {
            coding: [{ code: 'logic-library' }]
          },
          description: 'Sample description'
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
        .send(DRAFT_LIBRARY)
        .set('content-type', 'application/json+fhir')
        .expect(201)
        .then(response => {
          expect(response.headers.location).toBeDefined();
        });
    });

    it('publish: returns 201 status with populated location when provided correct headers and a FHIR Library', async () => {
      await supertest(server.app)
        .post('/4_0_1/Library')
        .send(NEW_ACTIVE_LIBRARY)
        .set('content-type', 'application/json+fhir')
        .expect(201)
        .then(response => {
          expect(response.headers.location).toBeDefined();
        });
    });

    it('publish: returns 400 status when Library with same url and version pair already exists', async () => {
      await supertest(server.app)
        .post('/4_0_1/Library')
        .send(ACTIVE_LIBRARY)
        .set('content-type', 'application/json+fhir')
        .expect(400);
    });
  });

  describe('update', () => {
    beforeAll(() => {
      createTestResource(
        {
          resourceType: 'Library',
          id: 'exampleId-active',
          url: 'http://example.com/exampleId-active',
          status: 'active',
          ...LIBRARY_BASE
        },
        'Library'
      );
      return createTestResource(
        {
          resourceType: 'Library',
          id: 'exampleId',
          url: 'http://example.com/exampleId',
          status: 'draft',
          ...LIBRARY_BASE
        },
        'Library'
      );
    });

    it('revise: returns 200 when provided correct headers and a FHIR Library whose id is in the database', async () => {
      await supertest(server.app)
        .put('/4_0_1/Library/exampleId')
        .send({
          resourceType: 'Library',
          type: { coding: [{ code: 'logic-library' }] },
          id: 'exampleId',
          status: 'draft',
          title: 'updated',
          url: 'http://example.com',
          version: '1',
          description: 'Sample description'
        })
        .set('content-type', 'application/json+fhir')
        .expect(200)
        .then(response => {
          expect(response.headers.location).toBeDefined();
        });
    });

    it('revise: returns 400 when status changes', async () => {
      await supertest(server.app)
        .put('/4_0_1/Library/exampleId')
        .send({
          resourceType: 'Library',
          id: 'exampleId',
          status: 'active',
          title: 'updated',
          url: 'http://example.com',
          version: '1',
          description: 'Sample description'
        })
        .set('content-type', 'application/json+fhir')
        .expect(400);
    });

    it('retire: returns 200 when provided updated status for retiring', async () => {
      await supertest(server.app)
        .put('/4_0_1/Library/exampleId-active')
        .send({
          resourceType: 'Library',
          id: 'exampleId-active',
          url: 'http://example.com/exampleId-active',
          status: 'retired',
          ...LIBRARY_BASE
        })
        .set('content-type', 'application/json+fhir')
        .expect(200)
        .then(response => {
          expect(response.headers.location).toBeDefined();
        });
    });

    it('returns 201 when provided correct headers and a FHIR Library whose id is not in the database', async () => {
      await supertest(server.app)
        .put('/4_0_1/Library/testDraftLibrary2')
        .send(DRAFT_LIBRARY_2)
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
          id: 'delete-active',
          url: 'http://example.com/delete-active',
          status: 'active',
          ...LIBRARY_BASE
        },
        'Library'
      );
      createTestResource(
        {
          resourceType: 'Library',
          id: 'delete-retired',
          url: 'http://example.com/delete-retired',
          status: 'retired',
          ...LIBRARY_BASE
        },
        'Library'
      );
      return createTestResource(
        {
          resourceType: 'Library',
          id: 'delete-draft',
          url: 'http://example.com/delete-draft',
          status: 'draft',
          ...LIBRARY_BASE
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

  describe('$draft', () => {
    it('returns 200 status with a Bundle result containing the created parent Library artifact and any children it has', async () => {
      await supertest(server.app)
        .get('/4_0_1/Library/$draft')
        .query({ id: 'parentLibrary', version: '1.0.0.1' })
        .set('Accept', 'application/json+fhir')
        .expect(200);
    });

    it('returns 200 status with a Bundle result containing the created parent Library artifact and any children it has for GET /Library/:id/$draft', async () => {
      await supertest(server.app)
        .get('/4_0_1/Library/parentLibrary/$draft')
        .query({ version: '1.0.0.2' })
        .set('Accept', 'application/json+fhir')
        .expect(200);
    });

    it('returns 200 status with a Bundle result containing the created parent Library artifact and any children it has for POST /Library/$draft', async () => {
      await supertest(server.app)
        .post('/4_0_1/Library/$draft')
        .send({
          resourceType: 'Parameters',
          parameter: [
            { name: 'id', valueString: 'parentLibrary' },
            { name: 'version', valueString: '1.0.0.3' }
          ]
        })
        .set('content-type', 'application/fhir+json')
        .expect(200);
    });

    it('returns 200 status with a Bundle result containing the created parent Library artifact and any children it has for POST /Library/:id/$draft', async () => {
      await supertest(server.app)
        .post('/4_0_1/Library/parentLibrary/$draft')
        .send({ resourceType: 'Parameters', parameter: [{ name: 'version', valueString: '1.0.0.4' }] })
        .set('content-type', 'application/fhir+json')
        .expect(200);
    });
  });

  describe('$clone', () => {
    it('returns 200 status with a Bundle result containing the created parent Library artifact and any children it has for GET /Library/$clone', async () => {
      await supertest(server.app)
        .get('/4_0_1/Library/$clone')
        .query({ id: 'parentLibrary', version: '1.0.0.5', url: 'http://clone-example.com' })
        .set('Accept', 'application/json+fhir')
        .expect(200);
    });

    it('returns 200 status with a Bundle result containing the created parent Library artifact and any children it has for GET /Library/:id/$draft', async () => {
      await supertest(server.app)
        .get('/4_0_1/Library/parentLibrary/$clone')
        .query({ version: '1.0.0.6', url: 'http://clone-example.com' })
        .set('Accept', 'application/json+fhir')
        .expect(200);
    });

    it('returns 200 status with a Bundle result containing the created parent Library artifact and any children it has for POST/Library/$clone', async () => {
      await supertest(server.app)
        .post('/4_0_1/Library/$clone')
        .send({
          resourceType: 'Parameters',
          parameter: [
            { name: 'id', valueString: 'parentLibrary' },
            { name: 'version', valueString: '1.0.0.7' },
            { name: 'url', valueString: 'http://clone-example.com' }
          ]
        })
        .set('content-type', 'application/fhir+json')
        .expect(200);
    });

    it('returns 200 status with a Bundle result containing the created parent Library artifact and any children it has for POST /Library/:id/$clone', async () => {
      await supertest(server.app)
        .post('/4_0_1/Library/parentLibrary/$clone')
        .send({
          resourceType: 'Parameters',
          parameter: [
            { name: 'version', valueString: '1.0.0.8' },
            { name: 'url', valueString: 'http://clone-example.com' }
          ]
        })
        .set('content-type', 'application/fhir+json')
        .expect(200);
    });
  });

  describe('$cqfm.package', () => {
    it('returns a Bundle including the Library when the Library has no dependencies and id passed through args', async () => {
      await supertest(server.app)
        .get('/4_0_1/Library/testActiveLibrary/$cqfm.package')
        .expect(200)
        .then(response => {
          expect(response.body.resourceType).toEqual('Bundle');
          expect(response.body.entry).toHaveLength(1);
          expect(response.body.entry).toEqual(expect.arrayContaining([{ resource: ACTIVE_LIBRARY }]));
        });
    });

    it('returns a Bundle including the Library when the Library has no dependencies and id passed through body', async () => {
      await supertest(server.app)
        .post('/4_0_1/Library/$cqfm.package')
        .send({ resourceType: 'Parameters', parameter: [{ name: 'id', valueString: 'testActiveLibrary' }] })
        .set('content-type', 'application/fhir+json')
        .expect(200)
        .then(response => {
          expect(response.body.resourceType).toEqual('Bundle');
          expect(response.body.entry).toHaveLength(1);
          expect(response.body.entry).toEqual(expect.arrayContaining([{ resource: ACTIVE_LIBRARY }]));
        });
    });

    it('returns a Bundle including the Library and its dependent libraries when the Library has dependencies and id passed through args', async () => {
      await supertest(server.app)
        .get('/4_0_1/Library/testActiveLibraryWithDeps2/$cqfm.package')
        .expect(200)
        .expect(200)
        .then(response => {
          expect(response.body.resourceType).toEqual('Bundle');
          expect(response.body.entry).toHaveLength(3);
          expect(response.body.entry).toEqual(
            expect.arrayContaining([
              { resource: LIBRARY_WITH_NESTED_DEPS },
              { resource: ACTIVE_LIBRARY },
              { resource: LIBRARY_WITH_DEPS }
            ])
          );
        });
    });

    it('returns a Bundle including the Library and its dependent libraries when the Library has dependencies and id passed through body', async () => {
      await supertest(server.app)
        .post('/4_0_1/Library/$cqfm.package')
        .send({ resourceType: 'Parameters', parameter: [{ name: 'id', valueString: 'testActiveLibraryWithDeps2' }] })
        .set('content-type', 'application/fhir+json')
        .expect(200)
        .then(response => {
          expect(response.body.resourceType).toEqual('Bundle');
          expect(response.body.entry).toHaveLength(3);
          expect(response.body.entry).toEqual(
            expect.arrayContaining([
              { resource: LIBRARY_WITH_NESTED_DEPS },
              { resource: ACTIVE_LIBRARY },
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
        .send({ resourceType: 'Parameters', parameter: [{ name: 'id', valueString: 'testActiveLibraryWithDeps2' }] })
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
            { rootLibRef: 'http://example.com/testActiveLibraryWithDeps2|0.0.1-test' }
          );
        });
    });

    it('returns 200 and a Library for a request with id in the url', async () => {
      await supertest(server.app)
        .get('/4_0_1/Library/testActiveLibraryWithDeps2/$data-requirements')
        .expect(200)
        .then(response => {
          expect(response.body.resourceType).toEqual('Library');
          expect(response.body.type.coding[0].code).toEqual('module-definition');
          expect(response.body.dataRequirement).toHaveLength(0);
          expect(calc).toBeCalledWith(
            expect.objectContaining({
              resourceType: 'Bundle'
            }),
            { rootLibRef: 'http://example.com/testActiveLibraryWithDeps2|0.0.1-test' }
          );
        });
    });

    it('returns 200 with query params', async () => {
      await supertest(server.app)
        .get('/4_0_1/Library/$data-requirements')
        .query({ id: 'testActiveLibraryWithDeps2' })
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
              rootLibRef: 'http://example.com/testActiveLibraryWithDeps2|0.0.1-test'
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
            { name: 'id', valueString: 'testActiveLibraryWithDeps2' },
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
            { name: 'id', valueString: 'tesActivetLibraryWithDeps2' },
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
        .post('/4_0_1/Library/testActiveLibraryWithDeps/$data-requirements')
        .send({ resourceType: 'Parameters', parameter: [{ name: 'id', valueString: 'testLibraryWithDeps2' }] })
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
        .get('/4_0_1/Library/testActiveLibraryWithDeps2/$data-requirements')
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

  describe('$approve', () => {
    beforeEach(() => {
      createTestResource(
        {
          resourceType: 'Library',
          id: 'approve-child1',
          url: 'http://example.com/approve-child1',
          status: 'active',
          relatedArtifact: [
            {
              type: 'composed-of',
              resource: 'http://example.com/approve-child2|1',
              extension: [
                {
                  url: 'http://hl7.org/fhir/StructureDefinition/artifact-isOwned',
                  valueBoolean: true
                }
              ]
            }
          ],
          ...LIBRARY_BASE
        },
        'Library'
      );
      return createTestResource(
        {
          resourceType: 'Library',
          id: 'approve-child2',
          url: 'http://example.com/approve-child2',
          status: 'active',
          extension: [
            {
              url: 'http://hl7.org/fhir/StructureDefinition/artifact-isOwned',
              valueBoolean: true
            }
          ],
          ...LIBRARY_BASE
        },
        'Library'
      );
    });

    it('returns 200 status with a Bundle result containing the updated parent Library artifact and any children it has for GET /Library/$approve', async () => {
      await supertest(server.app)
        .get('/4_0_1/Library/$approve')
        .query({
          id: 'approve-child1',
          artifactAssessmentType: 'guidance',
          artifactAssessmentSummary: 'Sample summary',
          artifactAssessmentAuthor: { reference: 'Sample Author' }
        })
        .set('Accept', 'application/json+fhir')
        .expect(200)
        .then(response => {
          expect(response.body.total).toEqual(2);
          expect(response.body.entry[0].resource.date).toBeDefined();
          expect(response.body.entry[0].resource.extension[0].extension[2].valueString).toEqual('Sample Author');
          expect(response.body.entry[1].resource.date).toBeDefined();
          expect(response.body.entry[1].resource.extension[1].extension[2].valueString).toEqual('Sample Author');
        });
    });

    it('returns 200 status with a Bundle result containing the updated parent Library artifact and any children it has for GET /Library/[id]/$approve', async () => {
      await supertest(server.app)
        .get('/4_0_1/Library/approve-child1/$approve')
        .set('Accept', 'application/json+fhir')
        .expect(200)
        .then(response => {
          expect(response.body.total).toEqual(2);
          expect(response.body.entry[0].resource.date).toBeDefined();
          expect(response.body.entry[1].resource.date).toBeDefined();
        });
    });

    it('returns 200 status with a Bundle result containing the updated parent Library artifact and any children it has for POST /Library/$approve', async () => {
      await supertest(server.app)
        .post('/4_0_1/Library/$approve')
        .send({
          resourceType: 'Parameters',
          parameter: [
            { name: 'id', valueString: 'approve-child1' },
            { name: 'artifactAssessmentType', valueCode: 'documentation' },
            { name: 'artifactAssessmentSummary', valueString: 'Hello' },
            { name: 'approvalDate', valueDate: '2024-08-14T17:29:34.344Z' }
          ]
        })
        .set('content-type', 'application/fhir+json')
        .expect(200)
        .then(response => {
          expect(response.body.total).toEqual(2);
          expect(response.body.entry[0].resource.date).toBeDefined();
          expect(response.body.entry[0].resource.extension[0].url).toEqual(
            'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-artifactComment'
          );
          expect(response.body.entry[0].resource.approvalDate).toEqual('2024-08-14T17:29:34.344Z');
          expect(response.body.entry[1].resource.date).toBeDefined();
          expect(response.body.entry[1].resource.extension[1].url).toEqual(
            'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-artifactComment'
          );
          expect(response.body.entry[1].resource.approvalDate).toEqual('2024-08-14T17:29:34.344Z');
        });
    });

    it('returns 200 status with a Bundle result containing the updated parent Library artifact and any children it has for POST /Library/[id]/$approve', async () => {
      await supertest(server.app)
        .post('/4_0_1/Library/approve-child1/$approve')
        .set('content-type', 'application/fhir+json')
        .expect(200)
        .then(response => {
          expect(response.body.total).toEqual(2);
          expect(response.body.entry[0].resource.date).toBeDefined();
          expect(response.body.entry[1].resource.date).toBeDefined();
        });
    });
  });

  describe('$review', () => {
    beforeEach(() => {
      createTestResource(
        {
          resourceType: 'Library',
          id: 'review-child1',
          url: 'http://example.com/review-child1',
          status: 'active',
          relatedArtifact: [
            {
              type: 'composed-of',
              resource: 'http://example.com/review-child2|1',
              extension: [
                {
                  url: 'http://hl7.org/fhir/StructureDefinition/artifact-isOwned',
                  valueBoolean: true
                }
              ]
            }
          ],
          ...LIBRARY_BASE
        },
        'Library'
      );
      return createTestResource(
        {
          resourceType: 'Library',
          id: 'review-child2',
          url: 'http://example.com/review-child2',
          status: 'active',
          extension: [
            {
              url: 'http://hl7.org/fhir/StructureDefinition/artifact-isOwned',
              valueBoolean: true
            }
          ],
          ...LIBRARY_BASE
        },
        'Library'
      );
    });

    it('returns 200 status with a Bundle result containing the updated parent Library artifact and any children it has for GET /Library/$review', async () => {
      await supertest(server.app)
        .get('/4_0_1/Library/$review')
        .query({
          id: 'review-child1',
          artifactAssessmentType: 'guidance',
          artifactAssessmentSummary: 'Sample summary',
          artifactAssessmentAuthor: { reference: 'Sample Author' }
        })
        .set('Accept', 'application/json+fhir')
        .expect(200)
        .then(response => {
          expect(response.body.total).toEqual(2);
          expect(response.body.entry[0].resource.date).toBeDefined();
          expect(response.body.entry[0].resource.extension[0].extension[2].valueString).toEqual('Sample Author');
          expect(response.body.entry[1].resource.date).toBeDefined();
          expect(response.body.entry[1].resource.extension[1].extension[2].valueString).toEqual('Sample Author');
        });
    });

    it('returns 200 status with a Bundle result containing the updated parent Library artifact and any children it has for GET /Library/[id]/$review', async () => {
      await supertest(server.app)
        .get('/4_0_1/Library/review-child1/$review')
        .set('Accept', 'application/json+fhir')
        .expect(200)
        .then(response => {
          expect(response.body.total).toEqual(2);
          expect(response.body.entry[0].resource.date).toBeDefined();
          expect(response.body.entry[1].resource.date).toBeDefined();
        });
    });

    it('returns 200 status with a Bundle result containing the updated parent Library artifact and any children it has for POST /Library/$review', async () => {
      await supertest(server.app)
        .post('/4_0_1/Library/$review')
        .send({
          resourceType: 'Parameters',
          parameter: [
            { name: 'id', valueString: 'review-child1' },
            { name: 'artifactAssessmentType', valueCode: 'documentation' },
            { name: 'artifactAssessmentSummary', valueString: 'Hello' },
            { name: 'reviewDate', valueDate: '2024-08-14T17:29:34.344Z' }
          ]
        })
        .set('content-type', 'application/fhir+json')
        .expect(200)
        .then(response => {
          expect(response.body.total).toEqual(2);
          expect(response.body.entry[0].resource.date).toBeDefined();
          expect(response.body.entry[0].resource.extension[0].url).toEqual(
            'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-artifactComment'
          );
          expect(response.body.entry[0].resource.lastReviewDate).toEqual('2024-08-14T17:29:34.344Z');
          expect(response.body.entry[1].resource.date).toBeDefined();
          expect(response.body.entry[1].resource.extension[1].url).toEqual(
            'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-artifactComment'
          );
          expect(response.body.entry[1].resource.lastReviewDate).toEqual('2024-08-14T17:29:34.344Z');
        });
    });

    it('returns 200 status with a Bundle result containing the updated parent Library artifact and any children it has for POST /Library/[id]/$review', async () => {
      await supertest(server.app)
        .post('/4_0_1/Library/review-child1/$review')
        .set('content-type', 'application/fhir+json')
        .expect(200)
        .then(response => {
          expect(response.body.total).toEqual(2);
          expect(response.body.entry[0].resource.date).toBeDefined();
          expect(response.body.entry[1].resource.date).toBeDefined();
        });
    });
  });

  afterAll(() => {
    return cleanUpTestDatabase();
  });
});
