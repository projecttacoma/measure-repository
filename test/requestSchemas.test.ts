import { constants } from '@projecttacoma/node-fhir-server-core';
import { IssueData, z } from 'zod';
import { catchInvalidParams, catchMissingIdentifyingInfo, checkContentTypeHeader, checkExpectedResourceType, checkResourceDraftStatus } from '../src/requestSchemas';

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

    afterEach(jest.clearAllMocks);
  });

  describe('checkContentTypeHeader', () => {
    it('calls addIssue if the content-type header does not accept json + fhir', () => {
      const addIssue = jest.fn((arg: IssueData) => {
        return;
      });
      checkContentTypeHeader({method: 'POST', headers: {'content-type': 'invalid'}}, {path: [], addIssue});
      expect(addIssue.mock.calls[0][0]).toEqual({
        code: z.ZodIssueCode.custom,
        message: 'Ensure Content-Type is set to application/json+fhir or to application/fhir+json in headers'
      });
    })

    it('does not call addIssue if the content-type header does accept json + fhir', () => {
      const addIssue = jest.fn((arg: IssueData) => {
        return;
      });
      checkContentTypeHeader({method: 'POST', headers: {'content-type': 'application/json+fhir'}}, {path: [], addIssue});
      expect(addIssue.mock.calls).toHaveLength(0);
    });

    afterEach(jest.clearAllMocks);
  })

  describe('checkResourceDraftStatus', () => {
    it('calls addIssue if the status is not draft', () => {
      const addIssue = jest.fn((arg: IssueData) => {
        return;
      });
      checkResourceDraftStatus({body: {status: 'active'}}, {path: [], addIssue});
      expect(addIssue.mock.calls[0][0]).toEqual({
        code: z.ZodIssueCode.custom,
        message: "The artifact must be in 'draft' status."
      });
    })

    it('does not call addIssue if the status is in draft', () => {
      const addIssue = jest.fn((arg: IssueData) => {
        return;
      });
      checkContentTypeHeader({body: {status: 'draft'}}, {path: [], addIssue});
      expect(addIssue.mock.calls).toHaveLength(0);
    });

    afterEach(jest.clearAllMocks);
  })

  describe('checkExpectedResourceType', () => {
    it('returns a function that calls addIssue when the resource in the body does not match the expected resource type', () => {
      const addIssue = jest.fn((arg: IssueData) => {
        return;
      });
      checkExpectedResourceType([], 'Library')({ body: {resourceType: 'Measure'}}, {path: [], addIssue});

      expect(addIssue.mock.calls).toHaveLength(1);
      expect(addIssue.mock.calls[0][0]).toEqual({
        code: z.ZodIssueCode.custom,
        message: "Expected resourceType 'Library' in body. Received 'Measure'."
      });
    })

    it('returns a function that calls addIssue when passed-in checkFunction calls addIssue', () => {
      const addIssue = jest.fn((arg: IssueData) => {
        return;
      });
      const expectedIssueData = { code: z.ZodIssueCode.custom };
      const testCheckFunction = (val: Record<string, any>, ctx: z.RefinementCtx) => {
        addIssue(expectedIssueData);
      };
      checkExpectedResourceType([testCheckFunction], 'Library')({body: {resourceType: 'Library'}}, {path: [], addIssue});

      expect(addIssue.mock.calls).toHaveLength(1);
      expect(addIssue.mock.calls[0][0]).toEqual(expectedIssueData);
    })
  })
});
