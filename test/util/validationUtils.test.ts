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
    expect(() => validateSearchParams(invalidQuery)).toThrow(
      expect.objectContaining({
        statusCode: 400,
        issue: [
          expect.objectContaining({
            details: {
              text: 'Parameters invalid, alsoInvalid are not valid for search'
            }
          })
        ]
      })
    );
  });

  it('throws a BadRequest error with some valid and some invalid params', () => {
    const invalidQuery = { invalid: 'test', url: 'http://example.com' };

    expect(() => validateSearchParams(invalidQuery)).toThrow(
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
