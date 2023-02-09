import { constants } from '@projecttacoma/node-fhir-server-core';
import { z } from 'zod';
import { BadRequestError, NotImplementedError } from './util/errorUtils';

const DATE_REGEX = /([0-9]([0-9]([0-9][1-9]|[1-9]0)|[1-9]00)|[1-9]000)(-(0[1-9]|1[0-2])(-(0[1-9]|[1-2][0-9]|3[0-1]))?)/;

// Operation Definition: https://build.fhir.org/ig/HL7/cqf-measures/measure-repository-service.html#package
const UNSUPPORTED_PACKAGE_ARGS = [
  'capability',
  'check-system-version',
  'count',
  'force-system-version',
  'include-components',
  'include-dependencies',
  'manifest',
  'offset',
  'system-version'
];

// Operation Definition: https://build.fhir.org/ig/HL7/cqf-measures/measure-repository-service.html#requirements
const UNSUPPORTED_DATA_REQ_ARGS = [
  'expression',
  'include-dependencies',
  'include-components',
  'manifest',
  'parameters'
];

// Operation Definition: https://build.fhir.org/ig/HL7/cqf-measures/measure-repository-service.html#search
const UNSUPPORTED_CORE_SEARCH_ARGS = [
  'composed-of',
  'context',
  'context-type',
  'context-type-quantity',
  'context-type-value',
  'date',
  'depends-on',
  'derived-from',
  'effective',
  'jurisdiction',
  'predecessor',
  'successor',
  'topic'
];

const UNSUPPORTED_LIBRARY_SEARCH_ARGS = [...UNSUPPORTED_CORE_SEARCH_ARGS, 'content-type', 'type'];

const UNSUPPORTED_MEASURE_SEARCH_ARGS = [...UNSUPPORTED_CORE_SEARCH_ARGS, 'publisher'];

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
  'check-system-version': z.string(),
  count: stringToNumber,
  'force-system-version': z.string(),
  'include-components': stringToBool,
  'include-dependencies': stringToBool,
  'include-terminology': stringToBool,
  manifest: z.string(),
  offset: stringToNumber,
  'system-version': z.string()
})
  .partial()
  .strict()
  .superRefine(catchInvalidParams([catchMissingIdentifyingInfo], UNSUPPORTED_PACKAGE_ARGS));

export const CommonDataRequirementsArgs = IdentifyingParameters.extend({
  'check-system-version': z.string(),
  'force-system-version': z.string(),
  'include-components': stringToBool,
  'include-dependencies': stringToBool,
  manifest: z.string(),
  parameters: z.string(),
  periodEnd: checkDate('periodEnd'),
  periodStart: checkDate('periodStart'),
  'system-version': z.string()
})
  .partial()
  .strict();

export const MeasureDataRequirementsArgs = CommonDataRequirementsArgs.superRefine(
  catchInvalidParams([catchMissingIdentifyingInfo], UNSUPPORTED_DATA_REQ_ARGS)
);

export const LibraryDataRequirementsArgs = CommonDataRequirementsArgs.extend({
  expression: z.string()
})
  .partial()
  .strict()
  .superRefine(catchInvalidParams([catchMissingIdentifyingInfo], UNSUPPORTED_DATA_REQ_ARGS));

export const CoreSearchArgs = z
  .object({
    'composed-of': z.string(),
    context: z.string(),
    'context-quantity': z.string(),
    'context-type': z.string(),
    'context-type-quantity': z.string(),
    'context-type-value': z.string(),
    date: checkDate('date'),
    'depends-on': z.string(),
    'derived-from': z.string(),
    description: z.string(),
    effective: z.string(),
    identifier: z.string(),
    jurisdiction: z.string(),
    name: z.string(),
    predecessor: z.string(),
    status: z.string(),
    successor: z.string(),
    title: z.string(),
    topic: z.string(),
    url: z.string().url(),
    version: z.string()
  })
  .partial()
  .strict();

export const LibrarySearchArgs = CoreSearchArgs.extend({
  'content-type': z.string(),
  type: z.string()
})
  .partial()
  .strict()
  .superRefine(catchInvalidParams([], UNSUPPORTED_LIBRARY_SEARCH_ARGS));

export const MeasureSearchArgs = CoreSearchArgs.extend({
  publisher: z.string()
})
  .partial()
  .strict()
  .superRefine(catchInvalidParams([], UNSUPPORTED_MEASURE_SEARCH_ARGS));
