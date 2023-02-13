import { constants } from '@projecttacoma/node-fhir-server-core';
import { IssueData, z } from 'zod';
import { catchInvalidParams, catchMissingIdentifyingInfo } from '../src/requestSchemas';

describe('requestSchemas', () => {
  describe('catchMissingIdentifyingInfo', () => {
    it('calls addIssue if identifying info is missing', () => {
      const addIssue = jest.fn((arg: IssueData) => {
        return;
      });
      catchMissingIdentifyingInfo({}, { path: [], addIssue });
      expect(addIssue.mock.calls).toHaveLength(1);
      expect(addIssue.mock.calls[0][0]).toEqual({
        code: z.ZodIssueCode.custom,
        params: { serverErrorCode: constants.ISSUE.CODE.REQUIRED },
        message: 'Must provide identifying information via either id, url, or identifier parameters'
      });
    });

    it('does not call addIssue if identifying info is present', () => {
      const addIssue = jest.fn((arg: IssueData) => {
        return;
      });
      catchMissingIdentifyingInfo({ id: 'test-id' }, { path: [], addIssue });
      expect(addIssue.mock.calls).toHaveLength(0);
    });

    afterEach(jest.clearAllMocks);
  });

  describe('catchInvalidParams', () => {
    it('returns a function that calls addIssue when unsupported args present', () => {
      const addIssue = jest.fn((arg: IssueData) => {
        return;
      });
      catchInvalidParams([], ['unsupportedArg'])({ unsupportedArg: true }, { path: [], addIssue });

      expect(addIssue.mock.calls).toHaveLength(1);
      expect(addIssue.mock.calls[0][0]).toEqual({
        code: z.ZodIssueCode.custom,
        params: { type: 'NotImplemented' },
        message: 'Parameter(s): unsupportedArg are not yet supported on this server'
      });
    });

    it('returns a function that calls addIssue when passed-in checkFunction calls addIssue', () => {
      const addIssue = jest.fn((arg: IssueData) => {
        return;
      });
      const expectedIssueData = { code: z.ZodIssueCode.custom };
      const testCheckFunction = (val: Record<string, any>, ctx: z.RefinementCtx) => {
        addIssue(expectedIssueData);
      };
      catchInvalidParams([testCheckFunction], [])({}, { path: [], addIssue });

      expect(addIssue.mock.calls).toHaveLength(1);
      expect(addIssue.mock.calls[0][0]).toEqual(expectedIssueData);
    });
  });
});
