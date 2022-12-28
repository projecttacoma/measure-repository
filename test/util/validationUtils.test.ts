import { gatherParams, validateSearchParams } from '../../src/util/validationUtils';

const VALID_QUERY = { url: 'http://example.com' };

const INVALID_QUERY = { invalid: 'test' };

const PARTIALLY_INVALID_QUERY = { ...VALID_QUERY, ...INVALID_QUERY };

const POPULATED_PARAMETERS: fhir4.Parameters = {
  resourceType: 'Parameters',
  parameter: [
    {
      name: 'id',
      valueString: 'test'
    }
  ]
};

describe('validateSearchParams', () => {
  it('does not throw an error with valid params', () => {
    expect(() => {
      validateSearchParams(VALID_QUERY);
    }).not.toThrow();
  });

  it('throws a BadRequest error with invalid params', () => {
    expect(() => validateSearchParams(INVALID_QUERY)).toThrow(
      expect.objectContaining({
        statusCode: 400,
        issue: [
          expect.objectContaining({
            details: {
              text: 'Parameters invalid are not valid for search'
            }
          })
        ]
      })
    );
  });

  it('throws a BadRequest error with some valid and some invalid params', () => {
    expect(() => validateSearchParams(PARTIALLY_INVALID_QUERY)).toThrow(
      expect.objectContaining({
        statusCode: 400,
        issue: [
          expect.objectContaining({
            details: {
              text: 'Parameters invalid are not valid for search'
            }
          })
        ]
      })
    );
  });
});

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
