import { initialize, Server } from '@projecttacoma/node-fhir-server-core';
import { serverConfig } from '../../src/config/serverConfig';
import { cleanUpTestDatabase, createTestResource, setupTestDatabase } from '../utils';
import supertest from 'supertest';
import { Calculator } from 'fqm-execution';
import { CRMIShareableLibrary, CRMIShareableMeasure } from '../../src/types/service-types';

let server: Server;
// boiler plate required fields
const LIBRARY_BASE = {
  type: { coding: [{ code: 'logic-library' }] },
  version: '1',
  title: 'Sample title',
  description: 'Sample description'
};

const MEASURE_BASE = {
  version: '1',
  title: 'Sample title',
  description: 'Sample description'
};

const ACTIVE_MEASURE: CRMIShareableMeasure = {
  resourceType: 'Measure',
  id: 'testActiveMeasure',
  url: 'http://example.com/testActiveMeasure',
  status: 'active',
  ...MEASURE_BASE
};

const EXTRA_ACTIVE_MEASURE: CRMIShareableMeasure = {
  resourceType: 'Measure',
  id: 'testExtraActiveMeasure',
  url: 'http://example.com/testExtraActiveMeasure',
  status: 'active',
  ...MEASURE_BASE
};

const ACTIVE_MEASURE_2: CRMIShareableMeasure = {
  resourceType: 'Measure',
  id: 'testActiveMeasure2',
  url: 'http://example.com/testActiveMeasure2',
  status: 'active',
  ...MEASURE_BASE
};

const ACTIVE_MEASURE_NO_NAME: CRMIShareableMeasure = {
  resourceType: 'Measure',
  id: 'testActiveMeasure',
  url: 'http://example.com/testActiveMeasure',
  status: 'active',
  meta: {
    tag: [
      {
        code: 'SUBSETTED',
        system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationValue'
      }
    ]
  },
  ...MEASURE_BASE
};

const NEW_ACTIVE_MEASURE: CRMIShareableMeasure = {
  resourceType: 'Measure',
  id: 'newTestActiveMeasure',
  url: 'http://example.com/newTestActiveMeasure',
  status: 'active',
  ...MEASURE_BASE
};

const DRAFT_MEASURE: CRMIShareableMeasure = {
  resourceType: 'Measure',
  id: 'testDraftMeasure',
  url: 'http://example.com/testDraftMeasure',
  status: 'draft',
  ...MEASURE_BASE
};

const MEASURE_WITH_IDENTIFIER_VALUE_ROOT_LIB: CRMIShareableMeasure = {
  resourceType: 'Measure',
  id: 'measureWithIdentifierValueRootLib',
  url: 'http://example.com/measureWithIdentifierValueRootLib',
  identifier: [{ value: 'measureWithIdentifierValueRootLib' }],
  library: ['http://example.com/testActiveLibraryWithNoDeps'],
  status: 'active',
  ...MEASURE_BASE
};

const MEASURE_WITH_IDENTIFIER_SYSTEM_ROOT_LIB: CRMIShareableMeasure = {
  resourceType: 'Measure',
  id: 'measureWithIdentifierSystemRootLib',
  url: 'http://example.com/measureWithIdentifierSystemRootLib',
  identifier: [{ system: 'http://example.com/measureWithIdentifierSystemRootLib' }],
  library: ['http://example.com/testActiveLibraryWithNoDeps'],
  status: 'active',
  ...MEASURE_BASE
};

const MEASURE_WITH_IDENTIFIER_SYSTEM_AND_VALUE_ROOT_LIB: CRMIShareableMeasure = {
  resourceType: 'Measure',
  id: 'measureWithIdentifierSystemAndValueRootLib',
  url: 'http://example.com/measureWithIdentifierSystemAndValueRootLib',
  identifier: [
    {
      value: 'measureWithIdentifierSystemAndValueRootLib',
      system: 'http://example.com/measureWithIdentifierSystemAndValueRootLib'
    }
  ],
  library: ['http://example.com/testActiveLibraryWithNoDeps'],
  status: 'active',
  ...MEASURE_BASE
};

const MEASURE_WITH_ROOT_LIB: CRMIShareableMeasure = {
  resourceType: 'Measure',
  id: 'testMeasureWithRootLib',
  url: 'http://example.com/testMeasureWithRootLib',
  status: 'active',
  library: ['http://example.com/testActiveLibraryWithNoDeps'],
  ...MEASURE_BASE
};

const MEASURE_WITH_ROOT_LIB_AND_DEPS: CRMIShareableMeasure = {
  resourceType: 'Measure',
  id: 'testMeasureWithRootLibAndDeps',
  url: 'http://example.com/testMeasureWithRootLibAndDeps',
  status: 'active',
  library: ['http://example.com/testActiveLibraryWithDeps'],
  ...MEASURE_BASE
};

const ACTIVE_LIBRARY: CRMIShareableLibrary = {
  resourceType: 'Library',
  id: 'testActiveLibraryWithNoDeps',
  url: 'http://example.com/testActiveLibraryWithNoDeps',
  status: 'active',
  ...LIBRARY_BASE
};

const ACTIVE_LIBRARY_WITH_DEPS: CRMIShareableLibrary = {
  resourceType: 'Library',
  id: 'testActiveLibraryWithDeps',
  url: 'http://example.com/testActiveLibraryWithDeps',
  status: 'draft',
  relatedArtifact: [
    {
      type: 'depends-on',
      resource: 'http://example.com/testActiveLibraryWithNoDeps'
    }
  ],
  ...LIBRARY_BASE
};

const PARENT_ACTIVE_MEASURE: CRMIShareableMeasure = {
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

const CHILD_ACTIVE_LIBRARY: CRMIShareableLibrary = {
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
  beforeAll(async () => {
    server = initialize(serverConfig);
    process.env.AUTHORING = 'true';
    await setupTestDatabase([
      ACTIVE_MEASURE,
      ACTIVE_MEASURE_2,
      MEASURE_WITH_ROOT_LIB,
      MEASURE_WITH_ROOT_LIB_AND_DEPS,
      ACTIVE_LIBRARY,
      ACTIVE_LIBRARY_WITH_DEPS,
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
        .get('/4_0_1/Measure/testActiveMeasure')
        .set('Accept', 'application/json+fhir')
        .expect(200)
        .then(response => {
          expect(response.body.id).toEqual(ACTIVE_MEASURE.id);
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
        .query({ url: 'http://example.com/testActiveMeasure', status: 'active', id: 'testActiveMeasure' })
        .set('Accept', 'application/json+fhir')
        .expect(200)
        .then(response => {
          expect(response.body.resourceType).toEqual('Bundle');
          expect(response.body.total).toEqual(1);
          expect(response.body.entry[0].resource).toEqual(ACTIVE_MEASURE);
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
                resource: ACTIVE_MEASURE
              }),
              expect.objectContaining<fhir4.BundleEntry>({
                resource: ACTIVE_MEASURE_2
              })
            ])
          );
        });
    });

    it('returns 200 and correct searchset bundle with only id element when query matches single resource', async () => {
      await supertest(server.app)
        .get('/4_0_1/Measure')
        .query({
          _elements: 'id',
          status: 'active',
          url: 'http://example.com/testActiveMeasure',
          id: 'testActiveMeasure'
        })
        .set('Accept', 'application/json+fhir')
        .expect(200)
        .then(response => {
          expect(response.body.resourceType).toEqual('Bundle');
          expect(response.body.total).toEqual(1);
          expect(response.body.entry[0].resource).toEqual(ACTIVE_MEASURE_NO_NAME);
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
                resource: ACTIVE_MEASURE_NO_NAME
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
          url: 'http://example.com/publishable-retired',
          status: 'retired',
          ...MEASURE_BASE
        },
        'Measure'
      );
      return createTestResource(
        {
          resourceType: 'Measure',
          id: 'publishable-active',
          url: 'http://example.com/publishable-active',
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
          url: 'http://example.com/publishable-retired',
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
          url: 'http://example.com/publishable-active',
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
        .send(DRAFT_MEASURE)
        .set('content-type', 'application/json+fhir')
        .expect(201)
        .then(response => {
          expect(response.headers.location).toBeDefined();
        });
    });

    it('publish: returns 201 status with populated location when provided correct headers and a FHIR Measure', async () => {
      await supertest(server.app)
        .post('/4_0_1/Measure')
        .send(EXTRA_ACTIVE_MEASURE)
        .set('content-type', 'application/json+fhir')
        .expect(201)
        .then(response => {
          expect(response.headers.location).toBeDefined();
        });
    });

    it('publish: returns 400 status for Measure with same url and version pair already in repository', async () => {
      await supertest(server.app)
        .post('/4_0_1/Measure')
        .send(ACTIVE_MEASURE)
        .set('content-type', 'application/json+fhir')
        .expect(400)
        .then(response => {
          expect(response.body.issue[0].code).toEqual('invalid');
          expect(response.body.issue[0].details.text).toEqual(
            'Resource with identifiers (url,version) already exists in the repository.'
          );
        });
    });
  });

  describe('update', () => {
    beforeAll(async () => {
      await createTestResource(
        {
          resourceType: 'Measure',
          id: 'exampleId-active',
          url: 'http://example.com/exampleId-active',
          status: 'active',
          ...MEASURE_BASE
        },
        'Measure'
      );
      await createTestResource(
        {
          resourceType: 'Measure',
          id: 'exampleId',
          url: 'http://example.com/exampleId',
          status: 'draft',
          ...MEASURE_BASE
        },
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
          url: 'http://example.com/exampleId',
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
          url: 'http://example.com/exampleId',
          version: '1',
          description: 'Sample description'
        })
        .set('content-type', 'application/json+fhir')
        .expect(400);
    });

    it('retire: returns 200 when provided updated status for retiring', async () => {
      await supertest(server.app)
        .put('/4_0_1/Measure/exampleId-active')
        .send({
          resourceType: 'Measure',
          id: 'exampleId-active',
          url: 'http://example.com/exampleId-active',
          status: 'retired',
          ...MEASURE_BASE
        })
        .set('content-type', 'application/json+fhir')
        .expect(200)
        .then(response => {
          expect(response.headers.location).toBeDefined();
        });
    });

    it('returns 201 when provided correct headers and a FHIR Measure whose id is not in the database', async () => {
      await supertest(server.app)
        .put('/4_0_1/Measure/newTestActiveMeasure')
        .send(NEW_ACTIVE_MEASURE)
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
    beforeAll(async () => {
      await createTestResource(
        {
          resourceType: 'Measure',
          id: 'delete-active',
          url: 'http://example.com/delete-active',
          status: 'active',
          ...MEASURE_BASE
        },
        'Measure'
      );
      await createTestResource(
        {
          resourceType: 'Measure',
          id: 'delete-retired',
          url: 'http://example.com/delete-retired',
          status: 'retired',
          ...MEASURE_BASE
        },
        'Measure'
      );
      await createTestResource(
        {
          resourceType: 'Measure',
          id: 'delete-draft',
          url: 'http://example.com/delete-draft',
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

  describe('$clone', () => {
    it('returns 200 status with a Bundle result containing the created parent Measure artifact and any children it has for GET /Measure/$clone', async () => {
      await supertest(server.app)
        .get('/4_0_1/Measure/$clone')
        .query({ id: 'parentMeasure', version: '1.0.0.5', url: 'http://clone-example.com' })
        .set('Accept', 'application/json+fhir')
        .expect(200);
    });

    it('returns 200 status with a Bundle result containing the created parent Measure artifact and any children it has for GET /Measure/:id/$draft', async () => {
      await supertest(server.app)
        .get('/4_0_1/Measure/parentMeasure/$clone')
        .query({ version: '1.0.0.6', url: 'http://clone-example.com' })
        .set('Accept', 'application/json+fhir')
        .expect(200);
    });

    it('returns 200 status with a Bundle result containing the created parent Measure artifact and any children it has for POST/Measure/$clone', async () => {
      await supertest(server.app)
        .post('/4_0_1/Measure/$clone')
        .send({
          resourceType: 'Parameters',
          parameter: [
            { name: 'id', valueString: 'parentMeasure' },
            { name: 'version', valueString: '1.0.0.7' },
            { name: 'url', valueString: 'http://clone-example.com' }
          ]
        })
        .set('content-type', 'application/fhir+json')
        .expect(200);
    });

    it('returns 200 status with a Bundle result containing the created parent Measure artifact and any children it has for POST /Measure/:id/$clone', async () => {
      await supertest(server.app)
        .post('/4_0_1/Measure/parentMeasure/$clone')
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
    it('returns a Bundle including the root lib and Measure when root lib has no dependencies and id passed through args', async () => {
      await supertest(server.app)
        .get('/4_0_1/Measure/testMeasureWithRootLib/$cqfm.package')
        .expect(200)
        .then(response => {
          expect(response.body.resourceType).toEqual('Bundle');
          expect(response.body.entry).toHaveLength(2);
          expect(response.body.entry).toEqual(
            expect.arrayContaining([{ resource: ACTIVE_LIBRARY }, { resource: MEASURE_WITH_ROOT_LIB }])
          );
        });
    });

    it('returns a Bundle including the root lib and Measure when root lib has no dependencies and id passed through body', async () => {
      await supertest(server.app)
        .post('/4_0_1/Measure/$cqfm.package')
        .send({ resourceType: 'Parameters', parameter: [{ name: 'id', valueUrl: 'testMeasureWithRootLib' }] })
        .set('content-type', 'application/fhir+json')
        .expect(200)
        .then(response => {
          expect(response.body.resourceType).toEqual('Bundle');
          expect(response.body.entry).toHaveLength(2);
          expect(response.body.entry).toEqual(
            expect.arrayContaining([{ resource: ACTIVE_LIBRARY }, { resource: MEASURE_WITH_ROOT_LIB }])
          );
        });
    });

    it('returns a Bundle including the root lib, Measure and dependent libraries when root lib has dependencies and id passed through args', async () => {
      await supertest(server.app)
        .get('/4_0_1/Measure/testMeasureWithRootLibAndDeps/$cqfm.package')
        .expect(200)
        .then(response => {
          expect(response.body.resourceType).toEqual('Bundle');
          expect(response.body.entry).toHaveLength(3);
          expect(response.body.entry).toEqual(
            expect.arrayContaining([
              { resource: ACTIVE_LIBRARY_WITH_DEPS },
              { resource: ACTIVE_LIBRARY },
              { resource: MEASURE_WITH_ROOT_LIB_AND_DEPS }
            ])
          );
        });
    });

    it('returns a Bundle including the root lib, Measure, and dependent libraries when root lib has dependencies and id passed through body', async () => {
      await supertest(server.app)
        .post('/4_0_1/Measure/$cqfm.package')
        .send({ resourceType: 'Parameters', parameter: [{ name: 'id', valueString: 'testMeasureWithRootLibAndDeps' }] })
        .set('content-type', 'application/fhir+json')
        .expect(200)
        .then(response => {
          expect(response.body.resourceType).toEqual('Bundle');
          expect(response.body.entry).toHaveLength(3);
          expect(response.body.entry).toEqual(
            expect.arrayContaining([
              { resource: ACTIVE_LIBRARY_WITH_DEPS },
              { resource: ACTIVE_LIBRARY },
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
            expect.arrayContaining([{ resource: ACTIVE_LIBRARY }, { resource: MEASURE_WITH_IDENTIFIER_VALUE_ROOT_LIB }])
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
              { resource: ACTIVE_LIBRARY },
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
              { resource: ACTIVE_LIBRARY },
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
        .post('/4_0_1/Measure/testMeasureWithRootLib/$cqfm.package')
        .send({ resourceType: 'Parameters', parameter: [{ name: 'id', valueString: 'testMeasureWithRootLib' }] })
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
        .get('/4_0_1/Measure/testMeasureWithRootLib/$cqfm.package')
        .query({ id: 'testMeasureWithRootLib' })
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
        .send({ resourceType: 'Parameters', parameter: [{ name: 'id', valueString: 'testMeasureWithRootLibAndDeps' }] })
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
        .get('/4_0_1/Measure/testMeasureWithRootLibAndDeps/$data-requirements')
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
            { name: 'id', valueString: 'testMeasureWithRootLibAndDeps' },
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
        .query({ id: 'testMeasureWithRootLibAndDeps', periodStart: '2021-01-01', periodEnd: '2021-12-31' })
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
        .post('/4_0_1/Measure/testMeasureWithRootLib/$data-requirements')
        .send({ resourceType: 'Parameters', parameter: [{ name: 'id', valueString: 'testMeasureWithRootLib' }] })
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
        .get('/4_0_1/Measure/testMeasureWithRootLib/$data-requirements')
        .query({ id: 'testMeasureWithRootLib' })
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
          resourceType: 'Measure',
          id: 'approve-parent',
          url: 'http://example.com/approve-parent',
          status: 'active',
          relatedArtifact: [
            {
              type: 'composed-of',
              resource: 'http://example.com/approve-child1|1',
              extension: [
                {
                  url: 'http://hl7.org/fhir/StructureDefinition/artifact-isOwned',
                  valueBoolean: true
                }
              ]
            }
          ],
          version: '1',
          description: 'Example description',
          title: 'Parent Active Measure'
        },
        'Measure'
      );
      createTestResource(
        {
          resourceType: 'Library',
          id: 'approve-child1',
          url: 'http://example.com/approve-child1',
          status: 'active',
          extension: [
            {
              url: 'http://hl7.org/fhir/StructureDefinition/artifact-isOwned',
              valueBoolean: true
            }
          ],
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

    it('returns 200 status with a Bundle result containing the updated parent Measure artifact and any children it has for GET /Measure/$approve', async () => {
      await supertest(server.app)
        .get('/4_0_1/Measure/$approve')
        .query({
          id: 'approve-parent',
          artifactAssessmentType: 'guidance',
          artifactAssessmentSummary: 'Sample summary',
          artifactAssessmentAuthor: { reference: 'Sample Author' }
        })
        .set('Accept', 'application/json+fhir')
        .expect(200)
        .then(response => {
          expect(response.body.total).toEqual(3);
          expect(response.body.entry[0].resource.date).toBeDefined();
          expect(response.body.entry[0].resource.extension[0].extension[2].valueString).toEqual('Sample Author');
          expect(response.body.entry[1].resource.date).toBeDefined();
          expect(response.body.entry[1].resource.extension[1].extension[2].valueString).toEqual('Sample Author');
          expect(response.body.entry[2].resource.date).toBeDefined();
          expect(response.body.entry[2].resource.extension[1].extension[2].valueString).toEqual('Sample Author');
        });
    });

    it('returns 200 status with a Bundle result containing the updated parent Measure artifact and any children it has for GET /Measure/[id]/$approve', async () => {
      await supertest(server.app)
        .get('/4_0_1/Measure/approve-parent/$approve')
        .set('Accept', 'application/json+fhir')
        .expect(200)
        .then(response => {
          expect(response.body.total).toEqual(3);
          expect(response.body.entry[0].resource.date).toBeDefined();
          expect(response.body.entry[1].resource.date).toBeDefined();
          expect(response.body.entry[2].resource.date).toBeDefined();
        });
    });

    it('returns 200 status with a Bundle result containing the updated parent Measure artifact and any children it has for POST /Measure/[id]/$approve', async () => {
      await supertest(server.app)
        .post('/4_0_1/Measure/$approve')
        .send({
          resourceType: 'Parameters',
          parameter: [{ name: 'id', valueString: 'approve-parent' }]
        })
        .set('content-type', 'application/fhir+json')
        .expect(200)
        .then(response => {
          expect(response.body.total).toEqual(3);
          expect(response.body.entry[0].resource.date).toBeDefined();
          expect(response.body.entry[1].resource.date).toBeDefined();
          expect(response.body.entry[2].resource.date).toBeDefined();
        });
    });

    it('returns 200 status with a Bundle result containing the updated parent Measure artifact and any children it has for POST /Measure/$approve with cqf-artifactComment extension', async () => {
      await supertest(server.app)
        .post('/4_0_1/Measure/$approve')
        .send({
          resourceType: 'Parameters',
          parameter: [
            { name: 'id', valueString: 'approve-parent' },
            { name: 'artifactAssessmentType', valueCode: 'documentation' },
            { name: 'artifactAssessmentSummary', valueString: 'Hello' },
            { name: 'approvalDate', valueDate: '2024-08-14T17:29:34.344Z' }
          ]
        })
        .set('content-type', 'application/fhir+json')
        .expect(200)
        .then(response => {
          expect(response.body.total).toEqual(3);
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
          expect(response.body.entry[2].resource.date).toBeDefined();
          expect(response.body.entry[2].resource.extension[1].url).toEqual(
            'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-artifactComment'
          );
          expect(response.body.entry[2].resource.approvalDate).toEqual('2024-08-14T17:29:34.344Z');
        });
    });

    it('returns 200 status with a Bundle result containing the updated parent Measure artifact and any children it has for POST /Measure/[id]/$approve', async () => {
      await supertest(server.app)
        .post('/4_0_1/Measure/approve-parent/$approve')
        .set('content-type', 'application/fhir+json')
        .expect(200)
        .then(response => {
          expect(response.body.total).toEqual(3);
          expect(response.body.entry[0].resource.date).toBeDefined();
          expect(response.body.entry[1].resource.date).toBeDefined();
          expect(response.body.entry[2].resource.date).toBeDefined();
        });
    });
  });

  describe('$review', () => {
    beforeEach(() => {
      createTestResource(
        {
          resourceType: 'Measure',
          id: 'review-parent',
          url: 'http://example.com/review-parent',
          status: 'active',
          relatedArtifact: [
            {
              type: 'composed-of',
              resource: 'http://example.com/review-child1|1',
              extension: [
                {
                  url: 'http://hl7.org/fhir/StructureDefinition/artifact-isOwned',
                  valueBoolean: true
                }
              ]
            }
          ],
          version: '1',
          description: 'Example description',
          title: 'Parent Active Measure'
        },
        'Measure'
      );
      createTestResource(
        {
          resourceType: 'Library',
          id: 'review-child1',
          url: 'http://example.com/review-child1',
          status: 'active',
          extension: [
            {
              url: 'http://hl7.org/fhir/StructureDefinition/artifact-isOwned',
              valueBoolean: true
            }
          ],
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

    it('returns 200 status with a Bundle result containing the updated parent Measure artifact and any children it has for GET /Measure/$review', async () => {
      await supertest(server.app)
        .get('/4_0_1/Measure/$review')
        .query({
          id: 'review-parent',
          artifactAssessmentType: 'guidance',
          artifactAssessmentSummary: 'Sample summary',
          artifactAssessmentAuthor: { reference: 'Sample Author' }
        })
        .set('Accept', 'application/json+fhir')
        .expect(200)
        .then(response => {
          expect(response.body.total).toEqual(3);
          expect(response.body.entry[0].resource.date).toBeDefined();
          expect(response.body.entry[0].resource.extension[0].extension[2].valueString).toEqual('Sample Author');
          expect(response.body.entry[1].resource.date).toBeDefined();
          expect(response.body.entry[1].resource.extension[1].extension[2].valueString).toEqual('Sample Author');
          expect(response.body.entry[2].resource.date).toBeDefined();
          expect(response.body.entry[2].resource.extension[1].extension[2].valueString).toEqual('Sample Author');
        });
    });

    it('returns 200 status with a Bundle result containing the updated parent Measure artifact and any children it has for GET /Measure/[id]/$review', async () => {
      await supertest(server.app)
        .get('/4_0_1/Measure/review-parent/$review')
        .set('Accept', 'application/json+fhir')
        .expect(200)
        .then(response => {
          expect(response.body.total).toEqual(3);
          expect(response.body.entry[0].resource.date).toBeDefined();
          expect(response.body.entry[1].resource.date).toBeDefined();
          expect(response.body.entry[2].resource.date).toBeDefined();
        });
    });

    it('returns 200 status with a Bundle result containing the updated parent Measure artifact and any children it has for POST /Measure/[id]/$review', async () => {
      await supertest(server.app)
        .post('/4_0_1/Measure/$review')
        .send({
          resourceType: 'Parameters',
          parameter: [{ name: 'id', valueString: 'review-parent' }]
        })
        .set('content-type', 'application/fhir+json')
        .expect(200)
        .then(response => {
          expect(response.body.total).toEqual(3);
          expect(response.body.entry[0].resource.date).toBeDefined();
          expect(response.body.entry[1].resource.date).toBeDefined();
          expect(response.body.entry[2].resource.date).toBeDefined();
        });
    });

    it('returns 200 status with a Bundle result containing the updated parent Measure artifact and any children it has for POST /Measure/$review with cqf-artifactComment extension', async () => {
      await supertest(server.app)
        .post('/4_0_1/Measure/$review')
        .send({
          resourceType: 'Parameters',
          parameter: [
            { name: 'id', valueString: 'review-parent' },
            { name: 'artifactAssessmentType', valueCode: 'documentation' },
            { name: 'artifactAssessmentSummary', valueString: 'Hello' },
            { name: 'reviewDate', valueDate: '2024-08-14T17:29:34.344Z' }
          ]
        })
        .set('content-type', 'application/fhir+json')
        .expect(200)
        .then(response => {
          expect(response.body.total).toEqual(3);
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
          expect(response.body.entry[2].resource.date).toBeDefined();
          expect(response.body.entry[2].resource.extension[1].url).toEqual(
            'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-artifactComment'
          );
          expect(response.body.entry[2].resource.lastReviewDate).toEqual('2024-08-14T17:29:34.344Z');
        });
    });

    it('returns 200 status with a Bundle result containing the updated parent Measure artifact and any children it has for POST /Measure/[id]/$review', async () => {
      await supertest(server.app)
        .post('/4_0_1/Measure/review-parent/$review')
        .set('content-type', 'application/fhir+json')
        .expect(200)
        .then(response => {
          expect(response.body.total).toEqual(3);
          expect(response.body.entry[0].resource.date).toBeDefined();
          expect(response.body.entry[1].resource.date).toBeDefined();
          expect(response.body.entry[2].resource.date).toBeDefined();
        });
    });
  });

  afterAll(() => {
    return cleanUpTestDatabase();
  });
});
