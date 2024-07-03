import { initialize, Server } from '@projecttacoma/node-fhir-server-core';
import { serverConfig } from '../../src/config/serverConfig';
import { cleanUpTestDatabase, createTestResource, setupTestDatabase } from '../utils';
import supertest from 'supertest';
import { Calculator } from 'fqm-execution';
import { CRMILibrary, CRMIMeasure } from '../../src/types/service-types';

let server: Server;
// boiler plate required fields
const MEASURE_BASE = {
  url: 'http://example.com',
  version: '1',
  title: 'Sample title',
  description: 'Sample description'
};

const MEASURE: fhir4.Measure = { resourceType: 'Measure', id: 'test', status: 'active', ...MEASURE_BASE };

const MEASURE_WITH_URL: fhir4.Measure = {
  resourceType: 'Measure',
  id: 'testWithUrl',
  status: 'active',
  ...MEASURE_BASE
};

const MEASURE_WITH_URL_2: fhir4.Measure = {
  resourceType: 'Measure',
  id: 'testWithUrl2',
  status: 'draft',
  ...MEASURE_BASE
};

const DRAFT_MEASURE_WITH_URL: fhir4.Measure = {
  resourceType: 'Measure',
  id: 'testWithUrl',
  status: 'active',
  ...MEASURE_BASE
};

const MEASURE_WITH_URL_ONLY_ID: fhir4.Measure = {
  resourceType: 'Measure',
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

const MEASURE_WITH_IDENTIFIER_VALUE_ROOT_LIB: fhir4.Measure = {
  resourceType: 'Measure',
  identifier: [{ value: 'measureWithIdentifierValueRootLib' }],
  library: ['http://example.com/testLibrary'],
  status: 'active',
  ...MEASURE_BASE
};

const MEASURE_WITH_IDENTIFIER_SYSTEM_ROOT_LIB: fhir4.Measure = {
  resourceType: 'Measure',
  identifier: [{ system: 'http://example.com/measureWithIdentifierSystemRootLib' }],
  library: ['http://example.com/testLibrary'],
  status: 'active',
  ...MEASURE_BASE
};

const MEASURE_WITH_IDENTIFIER_SYSTEM_AND_VALUE_ROOT_LIB: fhir4.Measure = {
  resourceType: 'Measure',
  identifier: [
    {
      value: 'measureWithIdentifierSystemAndValueRootLib',
      system: 'http://example.com/measureWithIdentifierSystemAndValueRootLib'
    }
  ],
  library: ['http://example.com/testLibrary'],
  status: 'active',
  ...MEASURE_BASE
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

const PARENT_ACTIVE_MEASURE: CRMIMeasure = {
  resourceType: 'Measure',
  status: 'active',
  id: 'parentMeasure',
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
  url: 'http://parent-measure.com',
  version: '1',
  description: 'Example description',
  title: 'Parent Active Measure'
};

const CHILD_ACTIVE_LIBRARY: CRMILibrary = {
  resourceType: 'Library',
  id: 'childLibrary',
  type: { coding: [{ code: 'logic-library' }] },
  extension: [
    {
      url: 'http://hl7.org/fhir/StructureDefinition/artifact-isOwned',
      valueBoolean: true
    }
  ],
  status: 'active',
  version: '1',
  url: 'http://child-library.com',
  description: 'Example description',
  title: 'Child Active Library'
};

describe('MeasureService', () => {
  beforeAll(() => {
    server = initialize(serverConfig);
    process.env.AUTHORING = 'true';
    return setupTestDatabase([
      MEASURE,
      MEASURE_WITH_URL,
      MEASURE_WITH_ROOT_LIB,
      MEASURE_WITH_ROOT_LIB_AND_DEPS,
      LIBRARY_WITH_NO_DEPS,
      LIBRARY_WITH_DEPS,
      MEASURE_WITH_IDENTIFIER_VALUE_ROOT_LIB,
      MEASURE_WITH_IDENTIFIER_SYSTEM_AND_VALUE_ROOT_LIB,
      MEASURE_WITH_IDENTIFIER_SYSTEM_ROOT_LIB,
      PARENT_ACTIVE_MEASURE,
      CHILD_ACTIVE_LIBRARY
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
          expect(response.body.issue[0].code).toEqual('not-found');
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
        .query({ url: 'http://example.com', status: 'active', id: 'testWithUrl' })
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
          expect(response.body.total).toEqual(8);
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

    it('returns 200 and correct searchset bundle with only id element when query matches single resource', async () => {
      await supertest(server.app)
        .get('/4_0_1/Measure')
        .query({ _elements: 'id', status: 'active', url: 'http://example.com', id: 'testWithUrl' })
        .set('Accept', 'application/json+fhir')
        .expect(200)
        .then(response => {
          expect(response.body.resourceType).toEqual('Bundle');
          expect(response.body.total).toEqual(1);
          expect(response.body.entry[0].resource).toEqual(MEASURE_WITH_URL_ONLY_ID);
        });
    });

    it('returns 200 and correct searchset bundle with only id element when query matches multiple resources', async () => {
      await supertest(server.app)
        .get('/4_0_1/Measure')
        .query({ _elements: 'id', status: 'active' })
        .set('Accept', 'application/json+fhir')
        .expect(200)
        .then(response => {
          expect(response.body.resourceType).toEqual('Bundle');
          expect(response.body.total).toEqual(8);
          expect(response.body.entry).toEqual(
            expect.arrayContaining([
              expect.objectContaining<fhir4.BundleEntry>({
                resource: MEASURE_WITH_URL_ONLY_ID
              })
            ])
          );
        });
    });

    it('returns 200 and correct searchset bundle that does not have entries only the count when the _summary=count parameter is provided', async () => {
      await supertest(server.app)
        .get('/4_0_1/Measure')
        .query({ _summary: 'count' })
        .set('Accept', 'application/json+fhir')
        .expect(200)
        .then(response => {
          expect(response.body.resourceType).toEqual('Bundle');
          expect(response.body.total).toEqual(8);
          expect(response.body.entry).toBeUndefined;
        });
    });

    it('returns 400 when query contains version without url', async () => {
      await supertest(server.app)
        .get('/4_0_1/Measure')
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
          resourceType: 'Measure',
          id: 'publishable-retired',
          status: 'retired',
          ...MEASURE_BASE
        },
        'Measure'
      );
      return createTestResource(
        {
          resourceType: 'Measure',
          id: 'publishable-active',
          status: 'active',
          ...MEASURE_BASE
        },
        'Measure'
      );
    });
    it('publish: returns 400 status when provided with artifact in non-active status', async () => {
      await supertest(server.app)
        .post('/4_0_1/Measure')
        .send({ resourceType: 'Measure', status: 'draft' })
        .set('content-type', 'application/json+fhir')
        .expect(400);
    });
    it('retire: returns 400 when artifact to update is not in active status', async () => {
      await supertest(server.app)
        .put('/4_0_1/Measure/publishable-retired')
        .send({
          resourceType: 'Measure',
          id: 'publishable-retired',
          status: 'active',
          ...MEASURE_BASE
        })
        .set('content-type', 'application/json+fhir')
        .expect(400);
    });

    it('retire: returns 400 when attempting to update non-date/non-status fields', async () => {
      await supertest(server.app)
        .put('/4_0_1/Measure/publishable-active')
        .send({
          resourceType: 'Measure',
          id: 'publishable-active',
          status: 'retired',
          title: 'updated',
          url: 'http://example.com',
          version: '1',
          description: 'Sample description'
        })
        .set('content-type', 'application/json+fhir')
        .expect(400);
    });
    it('archive: returns 400 status when deleting an active artifact', async () => {
      await supertest(server.app)
        .delete('/4_0_1/Measure/publishable-active')
        .send()
        .set('content-type', 'application/json+fhir')
        .expect(400);
    });
    afterAll(() => {
      process.env.AUTHORING = ORIGINAL_AUTHORING;
    });
  });

  describe('create', () => {
    it('submit: returns 201 status with populated location when provided correct headers and a FHIR Measure', async () => {
      await supertest(server.app)
        .post('/4_0_1/Measure')
        .send(DRAFT_MEASURE_WITH_URL)
        .set('content-type', 'application/json+fhir')
        .expect(201)
        .then(response => {
          expect(response.headers.location).toBeDefined();
        });
    });
    it('publish: returns 201 status with populated location when provided correct headers and a FHIR Measure', async () => {
      await supertest(server.app)
        .post('/4_0_1/Measure')
        .send(MEASURE_WITH_URL)
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
        { resourceType: 'Measure', id: 'exampleId-active', status: 'active', ...MEASURE_BASE },
        'Measure'
      );
      return createTestResource(
        { resourceType: 'Measure', id: 'exampleId', status: 'draft', ...MEASURE_BASE },
        'Measure'
      );
    });

    it('revise: returns 200 when provided correct headers and a FHIR Measure whose id is in the database', async () => {
      await supertest(server.app)
        .put('/4_0_1/Measure/exampleId')
        .send({
          resourceType: 'Measure',
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
        .put('/4_0_1/Measure/exampleId')
        .send({
          resourceType: 'Measure',
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
        .put('/4_0_1/Measure/exampleId-active')
        .send({ resourceType: 'Measure', id: 'exampleId-active', status: 'retired', ...MEASURE_BASE })
        .set('content-type', 'application/json+fhir')
        .expect(200)
        .then(response => {
          expect(response.headers.location).toBeDefined();
        });
    });

    it('returns 201 when provided correct headers and a FHIR Measure whose id is not in the database', async () => {
      await supertest(server.app)
        .put('/4_0_1/Measure/testWithUrl2')
        .send(MEASURE_WITH_URL_2)
        .set('content-type', 'application/json+fhir')
        .expect(201)
        .then(response => {
          expect(response.headers.location).toBeDefined();
        });
    });

    it('returns 400 when the argument id does not match the id in the body', async () => {
      await supertest(server.app)
        .put('/4_0_1/Measure/invalidId')
        .send({
          resourceType: 'Measure',
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
          resourceType: 'Measure',
          id: 'delete-active',
          status: 'active',
          ...MEASURE_BASE
        },
        'Measure'
      );
      createTestResource(
        {
          resourceType: 'Measure',
          id: 'delete-retired',
          status: 'retired',
          ...MEASURE_BASE
        },
        'Measure'
      );
      return createTestResource(
        {
          resourceType: 'Measure',
          id: 'delete-draft',
          status: 'draft',
          ...MEASURE_BASE
        },
        'Measure'
      );
    });
    it('withdraw: returns 204 status when deleting a draft artifact', async () => {
      await supertest(server.app)
        .delete('/4_0_1/Measure/delete-draft')
        .send()
        .set('content-type', 'application/json+fhir')
        .expect(204);
    });
    it('archive: returns 204 status when deleting a retired artifact', async () => {
      await supertest(server.app)
        .delete('/4_0_1/Measure/delete-retired')
        .send()
        .set('content-type', 'application/json+fhir')
        .expect(204);
    });
    it('archive: returns 400 status when deleting an active artifact', async () => {
      await supertest(server.app)
        .delete('/4_0_1/Measure/delete-active')
        .send()
        .set('content-type', 'application/json+fhir')
        .expect(400);
    });
  });

  describe('$draft', () => {
    it('returns 200 status with a Bundle result containing the created parent Measure artifact and any children it has for GET /Measure/$draft', async () => {
      await supertest(server.app)
        .get('/4_0_1/Measure/$draft')
        .query({ id: 'parentMeasure', version: '1.0.0.1' })
        .set('Accept', 'application/json+fhir')
        .expect(200);
    });

    it('returns 200 status with a Bundle result containing the created parent Measure artifact and any children it has for GET /Measure/:id/$draft', async () => {
      await supertest(server.app)
        .get('/4_0_1/Measure/parentMeasure/$draft')
        .query({ version: '1.0.0.2' })
        .set('Accept', 'application/json+fhir')
        .expect(200);
    });

    it('returns 200 status with a Bundle result containing the created parent Measure artifact and any children it has for POST /Measure/$draft', async () => {
      await supertest(server.app)
        .post('/4_0_1/Measure/$draft')
        .send({
          resourceType: 'Parameters',
          parameter: [
            { name: 'id', valueString: 'parentMeasure' },
            { name: 'version', valueString: '1.0.0.3' }
          ]
        })
        .set('content-type', 'application/fhir+json')
        .expect(200);
    });

    it('returns 200 status with a Bundle result containing the created parent Measure artifact and any children it has for POST /Measure/:id/$draft', async () => {
      await supertest(server.app)
        .post('/4_0_1/Measure/parentMeasure/$draft')
        .send({ resourceType: 'Parameters', parameter: [{ name: 'version', valueString: '1.0.0.4' }] })
        .set('content-type', 'application/fhir+json')
        .expect(200);
    });
  });

  describe('$cqfm.package', () => {
    it('returns a Bundle including the root lib and Measure when root lib has no dependencies and id passed through args', async () => {
      await supertest(server.app)
        .get('/4_0_1/Measure/testWithRootLib/$cqfm.package')
        .expect(200)
        .then(response => {
          expect(response.body.resourceType).toEqual('Bundle');
          expect(response.body.entry).toHaveLength(2);
          expect(response.body.entry).toEqual(
            expect.arrayContaining([{ resource: LIBRARY_WITH_NO_DEPS }, { resource: MEASURE_WITH_ROOT_LIB }])
          );
        });
    });

    it('returns a Bundle including the root lib and Measure when root lib has no dependencies and id passed through body', async () => {
      await supertest(server.app)
        .post('/4_0_1/Measure/$cqfm.package')
        .send({ resourceType: 'Parameters', parameter: [{ name: 'id', valueUrl: 'testWithRootLib' }] })
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

    it('returns a Bundle including the root lib, Measure and dependent libraries when root lib has dependencies and id passed through args', async () => {
      await supertest(server.app)
        .get('/4_0_1/Measure/testWithRootLibAndDeps/$cqfm.package')
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

    it('returns a Bundle including the root lib, Measure, and dependent libraries when root lib has dependencies and id passed through body', async () => {
      await supertest(server.app)
        .post('/4_0_1/Measure/$cqfm.package')
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

    it('returns a Bundle including the root lib and Measure when root lib has no dependencies and identifier with just identifier.value passed through body', async () => {
      await supertest(server.app)
        .post('/4_0_1/Measure/$cqfm.package')
        .send({
          resourceType: 'Parameters',
          parameter: [{ name: 'identifier', valueString: 'measureWithIdentifierValueRootLib' }]
        })
        .set('content-type', 'application/fhir+json')
        .expect(200)
        .then(response => {
          expect(response.body.resourceType).toEqual('Bundle');
          expect(response.body.entry).toHaveLength(2);
          expect(response.body.entry).toEqual(
            expect.arrayContaining([
              { resource: LIBRARY_WITH_NO_DEPS },
              { resource: MEASURE_WITH_IDENTIFIER_VALUE_ROOT_LIB }
            ])
          );
        });
    });

    it('returns a Bundle including the root lib and Measure when root lib has no dependencies and identifier with just identifier.system passed through body', async () => {
      await supertest(server.app)
        .post('/4_0_1/Measure/$cqfm.package')
        .send({
          resourceType: 'Parameters',
          parameter: [{ name: 'identifier', valueString: 'http://example.com/measureWithIdentifierSystemRootLib|' }]
        })
        .set('content-type', 'application/fhir+json')
        .expect(200)
        .then(response => {
          expect(response.body.resourceType).toEqual('Bundle');
          expect(response.body.entry).toHaveLength(2);
          expect(response.body.entry).toEqual(
            expect.arrayContaining([
              { resource: LIBRARY_WITH_NO_DEPS },
              { resource: MEASURE_WITH_IDENTIFIER_SYSTEM_ROOT_LIB }
            ])
          );
        });
    });

    it('returns a Bundle including the root lib and Measure when root lib has no dependencies and identifier with both identifier.system and identifier.value passed through body', async () => {
      await supertest(server.app)
        .post('/4_0_1/Measure/$cqfm.package')
        .send({
          resourceType: 'Parameters',
          parameter: [
            {
              name: 'identifier',
              valueString:
                'http://example.com/measureWithIdentifierSystemAndValueRootLib|measureWithIdentifierSystemAndValueRootLib'
            }
          ]
        })
        .set('content-type', 'application/fhir+json')
        .expect(200)
        .then(response => {
          expect(response.body.resourceType).toEqual('Bundle');
          expect(response.body.entry).toHaveLength(2);
          expect(response.body.entry).toEqual(
            expect.arrayContaining([
              { resource: LIBRARY_WITH_NO_DEPS },
              { resource: MEASURE_WITH_IDENTIFIER_SYSTEM_AND_VALUE_ROOT_LIB }
            ])
          );
        });
    });

    it('throws a 404 error when both the Measure id and url are specified but one of them is invalid', async () => {
      await supertest(server.app)
        .post('/4_0_1/Measure/$cqfm.package')
        .send({
          resourceType: 'Parameters',
          parameter: [
            { name: 'id', valueString: 'testWithUrl' },
            { name: 'url', valueUrl: 'http://example.com/invalid' }
          ]
        })
        .set('content-type', 'application/fhir+json')
        .expect(404)
        .then(response => {
          expect(response.body.issue[0].code).toEqual('not-found');
          expect(response.body.issue[0].details.text).toEqual(
            'No resource found in collection: Measure, with id: testWithUrl and url: http://example.com/invalid'
          );
        });
    });

    it('throws a 400 error when no url or id included in request', async () => {
      await supertest(server.app)
        .post('/4_0_1/Measure/$cqfm.package')
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
        .post('/4_0_1/Measure/testWithRootLib/$cqfm.package')
        .send({ resourceType: 'Parameters', parameter: [{ name: 'id', valueString: 'testWithRootLib' }] })
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
        .get('/4_0_1/Measure/testWithRootLib/$cqfm.package')
        .query({ id: 'testWithRootLib' })
        .set('content-type', 'application/fhir+json')
        .expect(400)
        .then(response => {
          expect(response.body.issue[0].code).toEqual('invalid');
          expect(response.body.issue[0].details.text).toEqual(
            'Id argument may not be sourced from both a path parameter and a query or FHIR parameter.'
          );
        });
    });

    it('throws a 404 error when no measure matching id and url can be found', async () => {
      await supertest(server.app)
        .post('/4_0_1/Measure/$cqfm.package')
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
            'No resource found in collection: Measure, with id: invalid and url: http://example.com/invalid'
          );
        });
    });
  });

  describe('$data-requirements', () => {
    let calc: any;
    beforeEach(() => {
      // spy on calculation function
      calc = jest.spyOn(Calculator, 'calculateDataRequirements').mockResolvedValue({
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

    it('returns 200 and a Library for a simple measure with dependencies and no period params', async () => {
      await supertest(server.app)
        .post('/4_0_1/Measure/$data-requirements')
        .send({ resourceType: 'Parameters', parameter: [{ name: 'id', valueString: 'testWithRootLibAndDeps' }] })
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
            {}
          );
        });
    });

    it('returns 200 and a Library for a request with id in the url', async () => {
      await supertest(server.app)
        .get('/4_0_1/Measure/testWithRootLibAndDeps/$data-requirements')
        .expect(200)
        .then(response => {
          expect(response.body.resourceType).toEqual('Library');
          expect(response.body.type.coding[0].code).toEqual('module-definition');
          expect(response.body.dataRequirement).toHaveLength(0);
          expect(calc).toBeCalledWith(
            expect.objectContaining({
              resourceType: 'Bundle'
            }),
            {}
          );
        });
    });

    it('returns 200 with passed period parameters', async () => {
      await supertest(server.app)
        .post('/4_0_1/Measure/$data-requirements')
        .send({
          resourceType: 'Parameters',
          parameter: [
            { name: 'id', valueString: 'testWithRootLibAndDeps' },
            { name: 'periodStart', valueDate: '2021-01-01' },
            { name: 'periodEnd', valueDate: '2021-12-31' }
          ]
        })
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
            expect.objectContaining({
              measurementPeriodStart: '2021-01-01',
              measurementPeriodEnd: '2021-12-31'
            })
          );
        });
    });

    it('returns 200 with query params', async () => {
      await supertest(server.app)
        .get('/4_0_1/Measure/$data-requirements')
        .query({ id: 'testWithRootLibAndDeps', periodStart: '2021-01-01', periodEnd: '2021-12-31' })
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
              measurementPeriodStart: '2021-01-01',
              measurementPeriodEnd: '2021-12-31'
            })
          );
        });
    });

    it('throws a 400 error when an id is included in both the path and a FHIR parameter', async () => {
      await supertest(server.app)
        .post('/4_0_1/Measure/testWithRootLib/$data-requirements')
        .send({ resourceType: 'Parameters', parameter: [{ name: 'id', valueString: 'testWithRootLib' }] })
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
        .get('/4_0_1/Measure/testWithRootLib/$data-requirements')
        .query({ id: 'testWithRootLib' })
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
