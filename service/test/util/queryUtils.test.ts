import { getMongoQueryFromRequest } from '../../src/util/queryUtils';

const QUERY_WITH_NO_IDEN = { url: 'http://example.com' };
const QUERY_WITH_SIMPLE_CODE_IDEN = { url: 'http://example.com', identifier: 'testCode' };
const QUERY_WITH_SYSTEM_IDEN = { url: 'http://example.com', identifier: 'testSystem|' };
const QUERY_WITH_CODE_IDEN = { url: 'http://example.com', identifier: '|testCode' };
const QUERY_WITH_SYSTEM_AND_CODE_IDEN = { url: 'http://example.com', identifier: 'testSystem|testCode' };
const QUERY_WITH_STRING_PARAM = { url: 'http://example.com', version: 'test' };
const QUERY_WITH_MULTIPLE_STRING_PARAM = { url: 'http://example.com', version: ['test', '...anotherTest?'] };

const EXPECTED_QUERY_WITH_NO_IDEN = { limit: 50, skip: 0, url: 'http://example.com' };
const EXPECTED_QUERY_WITH_CODE_IDEN = { limit: 50, skip: 0,  url: 'http://example.com', 'identifier.value': 'testCode' };
const EXPECTED_QUERY_WITH_SYSTEM_IDEN = { limit: 50, skip: 0, url: 'http://example.com', 'identifier.system': 'testSystem' };
const EXPECTED_QUERY_WITH_SYSTEM_AND_CODE_IDEN = {
  limit: 50, 
  skip: 0, 
  url: 'http://example.com',
  'identifier.system': 'testSystem',
  'identifier.value': 'testCode'
};
const EXPECTED_QUERY_WITH_STRING_PARAM = { limit: 50, skip: 0, url: 'http://example.com', version: { $regex: '^test', $options: 'i' } };

describe('getMongoQueryFromRequest', () => {
  it('correctly parses a query with no identifier field', () => {
    expect(getMongoQueryFromRequest(QUERY_WITH_NO_IDEN)).toEqual(EXPECTED_QUERY_WITH_NO_IDEN);
  });
  it('correctly parses a query with a simple code identifier field', () => {
    expect(getMongoQueryFromRequest(QUERY_WITH_SIMPLE_CODE_IDEN)).toEqual(EXPECTED_QUERY_WITH_CODE_IDEN);
  });
  it('correctly parses a query with a code identifier field using | separator', () => {
    expect(getMongoQueryFromRequest(QUERY_WITH_CODE_IDEN)).toEqual(EXPECTED_QUERY_WITH_CODE_IDEN);
  });
  it('correctly parses a query with a system identifier field', () => {
    expect(getMongoQueryFromRequest(QUERY_WITH_SYSTEM_IDEN)).toEqual(EXPECTED_QUERY_WITH_SYSTEM_IDEN);
  });
  it('correctly parses a query with a system and code identifier field', () => {
    expect(getMongoQueryFromRequest(QUERY_WITH_SYSTEM_AND_CODE_IDEN)).toEqual(EXPECTED_QUERY_WITH_SYSTEM_AND_CODE_IDEN);
  });
  it('correctly parses a query with a string param', () => {
    expect(getMongoQueryFromRequest(QUERY_WITH_STRING_PARAM)).toEqual(EXPECTED_QUERY_WITH_STRING_PARAM);
  });
  it('throws NotImplemented error on a query with array param', () => {
    expect(() => {
      getMongoQueryFromRequest(QUERY_WITH_MULTIPLE_STRING_PARAM);
    }).toThrow(
      expect.objectContaining({
        statusCode: 501,
        issue: [
          expect.objectContaining({
            details: {
              text: 'Retrieved undefined or multiple arguments for query param: version. Multiple arguments for the same query param and undefined arguments are not supported.'
            }
          })
        ]
      })
    );
  });
});
