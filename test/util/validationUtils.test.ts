import { validateSearchParams } from '../../src/util/validationUtils';

describe('validateSearchParams', () => {
  it('does not throw an error with valid params', () => {
    const validQuery = { url: 'http://example.com', status: 'active' };
    expect(() => {
      validateSearchParams(validQuery);
    }).not.toThrow();
  });

  it('throws a BadRequest error with invalid params', () => {
    const invalidQuery = { invalid: 'test', alsoInvalid: 'test2' };
    try {
      validateSearchParams(invalidQuery);
      fail('validateSearchParams did not throw error when passed invalid params');
    } catch (e: any) {
      expect(e.statusCode).toEqual(400);
      expect(e.issue[0].details.text).toEqual('Parameters invalid, alsoInvalid are not valid for search');
    }
  });

  it('throws a BadRequest error with some valid and some invalid params', () => {
    const invalidQuery = { invalid: 'test', url: 'http://example.com' };
    try {
      validateSearchParams(invalidQuery);
      fail('validateSearchParams did not throw error when passed invalid params');
    } catch (e: any) {
      expect(e.statusCode).toEqual(400);
      expect(e.issue[0].details.text).toEqual('Parameters invalid are not valid for search');
    }
  });
});
