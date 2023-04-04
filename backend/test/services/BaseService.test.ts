import { initialize, Server } from '@projecttacoma/node-fhir-server-core';
import express from 'express';
import supertest from 'supertest';
import { serverConfig } from '../../src/config/serverConfig';
import { uploadTransactionBundle } from '../../src/services/BaseService';
import { cleanUpTestDatabase, setupTestDatabase } from '../utils';

let server: Server;

const INVALID_METHOD_REQ = {
  resourceType: 'Bundle',
  type: 'transaction',
  entry: [
    {
      resource: {
        resourceType: 'Measure',
        id: 'test-measure',
        library: ['Library/test-library']
      },
      request: {
        method: 'GET',
        url: 'Measure/test-measure'
      }
    }
  ]
};

const INVALID_PUT_REQ = {
  resourceType: 'Bundle',
  type: 'transaction',
  entry: [
    {
      resource: {
        resourceType: 'Measure',
        library: ['Library/test-library']
      },
      request: {
        method: 'PUT',
        url: 'Measure/test-measure'
      }
    }
  ]
};

const INVALID_RESOURCE_REQ = {
  resourceType: 'Bundle',
  type: 'transaction',
  entry: [
    {
      resource: {
        resourceType: 'Invalid',
        id: 'test-library'
      },
      request: {
        method: 'POST',
        url: 'Library/test-library'
      }
    }
  ]
};

const VALID_PUT_REQ = {
  resourceType: 'Bundle',
  type: 'transaction',
  entry: [
    {
      resource: {
        resourceType: 'Measure',
        id: 'test-measure',
        library: ['Library/test-library']
      },
      request: {
        method: 'PUT',
        url: 'Measure/test-measure'
      }
    }
  ]
};

const VALID_POST_REQ = {
  resourceType: 'Bundle',
  type: 'transaction',
  entry: [
    {
      resource: {
        resourceType: 'Library',
        id: 'test-library'
      },
      request: {
        method: 'POST',
        url: 'Library/test-library'
      }
    }
  ]
};

describe('BaseService', () => {
  beforeAll(async () => {
    const app = express();
    app.use(express.json({ limit: '50mb', type: 'application/json+fhir' }));
    app.use(express.json({ limit: '50mb', type: 'application/fhir+json' }));
    app.post('/:base_version/', (req, res, next) => {
      return uploadTransactionBundle(req, res)
        .then(result => res.status(200).json(result))
        .catch(err => next(err));
    });
    server = initialize(serverConfig, app);
    return setupTestDatabase([]);
  });

  describe('uploadTransactionBundle', () => {
    it('returns 200 and transaction-response bundle when a transaction bundle with correct resource, headers, and PUT request is uploaded', async () => {
      await supertest(server.app)
        .post('/4_0_1/')
        .send(VALID_PUT_REQ)
        .set('content-type', 'application/json+fhir')
        .expect(200)
        .then(response => {
          expect(response.body.resourceType).toEqual('Bundle');
          expect(response.body.type).toEqual('transaction-response');
          expect(response.body.entry[0].response.status).toEqual('201 Created');
          expect(response.body.entry[0].response.location).toEqual('4_0_1/Measure/test-measure');
        });
    });

    it('returns 200 and transaction-response bundle when a transaction bundle with correct resource, headers, and POST request is uploaded', async () => {
      await supertest(server.app)
        .post('/4_0_1/')
        .send(VALID_POST_REQ)
        .set('content-type', 'application/json+fhir')
        .expect(200)
        .then(response => {
          expect(response.body.resourceType).toEqual('Bundle');
          expect(response.body.type).toEqual('transaction-response');
          expect(response.body.entry[0].response.status).toEqual('201 Created');
          expect(response.body.entry[0].response.location).toBeDefined();
        });
    });

    it('returns 400 when the transaction bundle contains a resource that is not a Library or Measure', async () => {
      await supertest(server.app)
        .post('/4_0_1/')
        .send(INVALID_RESOURCE_REQ)
        .set('content-type', 'application/json+fhir')
        .expect(400)
        .then(response => {
          expect(response.body.issue[0].details.text).toEqual(
            'Resource in the entry must be of type Measure or Library.'
          );
        });
    });

    it('returns 400 when resource type is not Bundle', async () => {
      await supertest(server.app)
        .post('/4_0_1/')
        .send({ resourceType: 'invalid', type: 'transaction' })
        .set('content-type', 'application/json+fhir')
        .expect(400)
        .then(response => {
          expect(response.body.issue[0].details.text).toEqual(
            `Expected 'resourceType: Bundle'. Received 'resourceType: invalid'.`
          );
        });
    });

    it('returns 400 when Bundle is not of type transaction', async () => {
      await supertest(server.app)
        .post('/4_0_1/')
        .send({ resourceType: 'Bundle', type: 'invalid' })
        .set('content-type', 'application/json+fhir')
        .expect(400)
        .then(response => {
          expect(response.body.issue[0].details.text).toEqual(`Expected 'type: transaction. Received type: invalid'.`);
        });
    });

    it('returns 400 when transaction bundle has requests not of type PUT or POST', async () => {
      await supertest(server.app)
        .post('/4_0_1/')
        .send(INVALID_METHOD_REQ)
        .set('content-type', 'application/json+fhir')
        .expect(400)
        .then(response => {
          expect(response.body.issue[0].details.text).toEqual(
            `Expected requests of type PUT or POST, received GET for Measure/test-measure`
          );
        });
    });

    it('returns 400 when transaction bundle has a PUT request that does not contain an id for the resource', async () => {
      await supertest(server.app)
        .post('/4_0_1/')
        .send(INVALID_PUT_REQ)
        .set('content-type', 'application/json+fhir')
        .expect(400)
        .then(response => {
          expect(response.body.issue[0].details.text).toEqual(
            `Requests of type PUT must have an id associated with the resource.`
          );
        });
    });
  });
  afterAll(() => {
    return cleanUpTestDatabase();
  });
});
