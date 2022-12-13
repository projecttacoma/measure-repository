import { parseQuery } from '../../src/util/queryUtils';

const QUERY_WITH_NO_IDEN = { url: 'http://example.com' };
const QUERY_WITH_SIMPLE_CODE_IDEN = { url: 'http://example.com', identifier: 'testCode' };
const QUERY_WITH_SYSTEM_IDEN = { url: 'http://example.com', identifier: 'testSystem|' };
const QUERY_WITH_CODE_IDEN = { url: 'http://example.com', identifier: '|testCode' };
const QUERY_WITH_SYSTEM_AND_CODE_IDEN = { url: 'http://example.com', identifier: 'testSystem|testCode' };

const EXPECTED_QUERY_WITH_CODE_IDEN = { url: 'http://example.com', 'identifier.value': 'testCode' };
const EXPECTED_QUERY_WITH_SYSTEM_IDEN = { url: 'http://example.com', 'identifier.system': 'testSystem' };
const EXPECTED_QUERY_WITH_SYSTEM_AND_CODE_IDEN = {
  url: 'http://example.com',
  'identifier.system': 'testSystem',
  'identifier.value': 'testCode'
};

describe('parseQuery', () => {
  it('correctly parses a query with no identifier field', () => {
    expect(parseQuery(QUERY_WITH_NO_IDEN)).toEqual(QUERY_WITH_NO_IDEN);
  });
  it('correctly parses a query with a simple code identifier field', () => {
    expect(parseQuery(QUERY_WITH_SIMPLE_CODE_IDEN)).toEqual(EXPECTED_QUERY_WITH_CODE_IDEN);
  });
  it('correctly parses a query with a code identifier field using | separator', () => {
    expect(parseQuery(QUERY_WITH_CODE_IDEN)).toEqual(EXPECTED_QUERY_WITH_CODE_IDEN);
  });
  it('correctly parses a query with a system identifier field', () => {
    expect(parseQuery(QUERY_WITH_SYSTEM_IDEN)).toEqual(EXPECTED_QUERY_WITH_SYSTEM_IDEN);
  });
  it('correctly parses a query with a system and code identifier field', () => {
    expect(parseQuery(QUERY_WITH_SYSTEM_AND_CODE_IDEN)).toEqual(EXPECTED_QUERY_WITH_SYSTEM_AND_CODE_IDEN);
  });
});
