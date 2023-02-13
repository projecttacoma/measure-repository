import { gatherParams, checkContentTypeHeader, checkExpectedResourceType } from '../../src/util/inputUtils';

const VALID_QUERY = { url: 'http://example.com' };

const POPULATED_PARAMETERS: fhir4.Parameters = {
  resourceType: 'Parameters',
  parameter: [
    {
      name: 'id',
      valueString: 'test'
    }
  ]
};

describe('gatherParams', () => {
  it('returns params included in the request query', () => {
    expect(gatherParams(VALID_QUERY)).toEqual({ url: 'http://example.com' });
  });

  it('returns params included in the request body', () => {
    expect(gatherParams({}, POPULATED_PARAMETERS)).toEqual({ id: 'test' });
  });

  it('returns params included in both url and request body combined', () => {
    expect(gatherParams(VALID_QUERY, POPULATED_PARAMETERS)).toEqual({ url: 'http://example.com', id: 'test' });
  });
});

describe('checkContentTypeHeader', () => {
  it('does not throw an error when content-type is application/json+fhir', () => {
    expect(() => {
      checkContentTypeHeader('application/json+fhir')
    }).not.toThrow();
  });

  it('throws BadRequestError when content-type is not application/json+fhir', () => {
    const INVALID_CONTENT_TYPE = 'invalid';
    expect(() => checkContentTypeHeader(INVALID_CONTENT_TYPE)).toThrow(
      expect.objectContaining({
        statusCode: 400,
        issue: [
          expect.objectContaining({
            details: {
              text: 'Ensure Content-Type is set to application/json+fhir or to application/fhir+json in headers'
            }
          })
        ]
      })
    );
  });
});

describe('checkExpectedResourceType', () => {
  it('does not throw an error when resource type from body matches expected resource type', () => {
    const BODY_RESOURCE_TYPE = 'Library';
    const EXPECTED_RESOURCE_TYPE = 'Library';
    expect(() => {
      checkExpectedResourceType(BODY_RESOURCE_TYPE, EXPECTED_RESOURCE_TYPE)
    }).not.toThrow();
  });

  it('throws BadRequestError when resource type from body does not match expected resource type from path', () => {
    const BODY_RESOURCE_TYPE = 'Library';
    const EXPECTED_RESOURCE_TYPE = 'Measure';
    expect(() => checkExpectedResourceType(BODY_RESOURCE_TYPE, EXPECTED_RESOURCE_TYPE)).toThrow(
      expect.objectContaining({
        statusCode: 400,
        issue: [
          expect.objectContaining({
            details: {
              text: `Expected resourceType '${EXPECTED_RESOURCE_TYPE}' in body. Received '${BODY_RESOURCE_TYPE}'.`
            }
          })
        ]
      })
    );
  });
});

