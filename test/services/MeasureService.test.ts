import { initialize, Server } from '@projecttacoma/node-fhir-server-core';
import { serverConfig } from '../../src/config/serverConfig';
import { cleanUpTestDatabase, setupTestDatabase } from '../utils';
import supertest from 'supertest';
import { Calculator } from 'fqm-execution';

let server: Server;

const MEASURE: fhir4.Measure = { resourceType: 'Measure', id: 'test', status: 'active', version: 'searchable' };

const MEASURE_WITH_URL: fhir4.Measure = {
  resourceType: 'Measure',
  id: 'testWithUrl',
  status: 'active',
  url: 'http://example.com',
  version: 'searchable'
};

const MEASURE_WITH_IDENTIFIER_VALUE_ROOT_LIB: fhir4.Measure = {
  resourceType: 'Measure',
  identifier: [{ value: 'measureWithIdentifierValueRootLib' }],
  library: ['http://example.com/testLibrary'],
  status: 'active'
};

const MEASURE_WITH_IDENTIFIER_SYSTEM_ROOT_LIB: fhir4.Measure = {
  resourceType: 'Measure',
  identifier: [{ system: 'http://example.com/measureWithIdentifierSystemRootLib' }],
  library: ['http://example.com/testLibrary'],
  status: 'active'
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
  status: 'active'
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
      LIBRARY_WITH_DEPS,
      MEASURE_WITH_IDENTIFIER_VALUE_ROOT_LIB,
      MEASURE_WITH_IDENTIFIER_SYSTEM_AND_VALUE_ROOT_LIB,
      MEASURE_WITH_IDENTIFIER_SYSTEM_ROOT_LIB
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

    it('returns a Bundle including the root lib and Measure when root lib has no dependencies and id passed through body', async () => {
      await supertest(server.app)
        .post('/4_0_1/Measure/$package')
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

    it('returns a Bundle including the root lib, Measure, and dependent libraries when root lib has dependencies and id passed through body', async () => {
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

    it('returns a Bundle including the root lib and Measure when root lib has no dependencies and identifier with just identifier.value passed through body', async () => {
      await supertest(server.app)
        .post('/4_0_1/Measure/$package')
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
        .post('/4_0_1/Measure/$package')
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
        .post('/4_0_1/Measure/$package')
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
        .post('/4_0_1/Measure/$package')
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
        .post('/4_0_1/Measure/$package')
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
        .post('/4_0_1/Measure/testWithRootLib/$package')
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
        .get('/4_0_1/Measure/testWithRootLib/$package')
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
        .post('/4_0_1/Measure/$package')
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
    // spy on calculation function
    const calc = jest.spyOn(Calculator, 'calculateDataRequirements').mockResolvedValue({
      results: {
        resourceType: 'Library',
        type: {
          coding: [{ code: 'module-definition', system: 'http://terminology.hl7.org/CodeSystem/library-type' }]
        },
        status: 'draft',
        dataRequirement: []
      }
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
