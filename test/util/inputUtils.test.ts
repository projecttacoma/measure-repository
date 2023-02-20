import { gatherParams } from '../../src/util/inputUtils';

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

