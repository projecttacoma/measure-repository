import { constants } from '@projecttacoma/node-fhir-server-core';
import { z } from 'zod';
import { BadRequestError, NotImplementedError } from './util/errorUtils';

const DATE_REGEX = /([0-9]([0-9]([0-9][1-9]|[1-9]0)|[1-9]00)|[1-9]000)(-(0[1-9]|1[0-2])(-(0[1-9]|[1-2][0-9]|3[0-1]))?)/;

// Operation Definition: https://build.fhir.org/ig/HL7/cqf-measures/measure-repository-service.html#package
const UNSUPPORTED_PACKAGE_ARGS = [
  'capability',
  'offset',
  'count',
  'system-version',
  'check-system-version',
  'force-system-version',
  'manifest',
  'include-components'
];

// Operation Definition: https://build.fhir.org/ig/HL7/cqf-measures/measure-repository-service.html#requirements
const UNSUPPORTED_DATA_REQ_ARGS = [
  'expression',
  'parameters',
  'manifest',
  'include-dependencies',
  'include-components'
];

// Operation Definition: https://build.fhir.org/ig/HL7/cqf-measures/measure-repository-service.html#search
const UNSUPPORTED_SEARCH_ARGS = [
  'date',
  'effective',
  'jurisdiction',
  'context',
  'context-type',
  'context-type-quantity',
  'context-type-value',
  'topic',
  'composed-of',
  'depends-on',
  'derived-from',
  'successor',
  'predecessor'
];

const customErrorMap: z.ZodErrorMap = (issue, ctx) => {
  if (issue.code === z.ZodIssueCode.custom) {
    if (issue.params?.type === 'NotImplemented') {
      throw new NotImplementedError(issue.message ?? ctx.defaultError);
    } else {
      throw new BadRequestError(issue.message ?? ctx.defaultError, issue.params?.serverErrorCode);
    }
  } else if (issue.code === z.ZodIssueCode.unrecognized_keys) {
    throw new BadRequestError(issue.message ?? ctx.defaultError, constants.ISSUE.CODE.VALUE);
  }
  throw new BadRequestError(issue.message ?? ctx.defaultError);
};

z.setErrorMap(customErrorMap);

const hasIdentifyingInfo = (args: Record<string, any>) => args.id || args.url || args.identifier;

/**
 * Returns a function that checks if any unsupported params are present, then runs the
 * other passed in functions in sequence. Each catchFunction is expected to check for
 * invalid input and call ctx.addIssue if invalid input is detected. Any added issue will
 * trigger an error to be thrown.
 */
export function catchInvalidParams(
  catchFunctions: ((val: Record<string, any>, ctx: z.RefinementCtx) => void)[],
  unsupportedArgs?: string[]
) {
  return (val: Record<string, any>, ctx: z.RefinementCtx) => {
    const includedUnsupported = Object.keys(val).filter((v: string) => unsupportedArgs?.includes(v));
    if (includedUnsupported.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        params: { type: 'NotImplemented' },
        message: `Parameter(s): ${includedUnsupported.join(', ')} are not yet supported on this server`
      });
    } else {
      catchFunctions.forEach(func => func(val, ctx));
    }
  };
}

/**
 * Checks that either id, url, or identifier parameter is included. Adds an issue to the ctx
 * that triggers a BadRequest to be thrown if not.
 */
export function catchMissingIdentifyingInfo(val: Record<string, any>, ctx: z.RefinementCtx) {
  if (!hasIdentifyingInfo(val)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      params: { serverErrorCode: constants.ISSUE.CODE.REQUIRED },
      message: 'Must provide identifying information via either id, url, or identifier parameters'
    });
  }
}

const stringToBool = z.enum(['true', 'false']).transform(x => x === 'true');
const stringToNumber = z.coerce.number();
const checkDate = (paramName: string) => {
  return z.string().regex(DATE_REGEX, `${paramName} parameter is not a valid FHIR date`);
};

export const IdentifyingParameters = z
  .object({
    id: z.string(),
    url: z.string().url(),
    version: z.string(),
    identifier: z.string()
  })
  .partial();

export const PackageArgs = IdentifyingParameters.extend({
  capability: z.string(),
  offset: stringToNumber,
  count: stringToNumber,
  'system-version': z.string().url(),
  'check-system-version': z.string().url(),
  'force-system-version': z.string().url(),
  manifest: z.string(),
  'include-dependencies': stringToBool,
  'include-components': stringToBool,
  'include-terminology': stringToBool
})
  .partial()
  .strict()
  .superRefine(catchInvalidParams([catchMissingIdentifyingInfo], UNSUPPORTED_PACKAGE_ARGS));

export const DataRequirementsArgs = IdentifyingParameters.extend({
  expression: z.string(),
  parameters: z.string(),
  manifest: z.string(),
  periodStart: checkDate('periodStart'),
  periodEnd: checkDate('periodEnd'),
  'include-dependencies': stringToBool,
  'include-components': stringToBool
})
  .partial()
  .strict()
  .superRefine(catchInvalidParams([catchMissingIdentifyingInfo], UNSUPPORTED_DATA_REQ_ARGS));

export const CoreSearchArgs = z
  .object({
    url: z.string().url(),
    version: z.string(),
    identifier: z.string(),
    name: z.string(),
    title: z.string(),
    status: z.string(),
    description: z.string(),
    date: checkDate('date'),
    effective: z.string(),
    jurisdiction: z.string(),
    context: z.string(),
    'context-type': z.string(),
    'context-type-quantity': z.string(),
    'context-type-value': z.string(),
    topic: z.string(),
    'composed-of': z.string(),
    'depends-on': z.string(),
    'derived-from': z.string(),
    successor: z.string(),
    predecessor: z.string()
  })
  .partial()
  .strict()
  .superRefine(catchInvalidParams([], UNSUPPORTED_SEARCH_ARGS));
