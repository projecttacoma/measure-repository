import { constants } from '@projecttacoma/node-fhir-server-core';
import { z } from 'zod';
import { BadRequestError, NotImplementedError } from './util/errorUtils';

const DATE_REGEX = /([0-9]([0-9]([0-9][1-9]|[1-9]0)|[1-9]00)|[1-9]000)(-(0[1-9]|1[0-2])(-(0[1-9]|[1-2][0-9]|3[0-1]))?)/;
const VERSION_REGEX = /^\d+\.\d+\.\d+(\.\d+|)$/;

// Operation Definition: http://hl7.org/fhir/us/cqfmeasures/STU4/OperationDefinition-cqfm-package.html
const UNSUPPORTED_PACKAGE_ARGS = [
  'canonicalVersion',
  'capability',
  'checkCanonicalVersion',
  // TODO: Both 'contentEndpoint' and 'contactEndpoint' are listed throughout the documentation.
  // Default to 'contentEndpoint' for now since it is defined in the OperationDefinition.
  'contentEndpoint',
  'count',
  'forceCanonicalVersion',
  'include',
  'manifest',
  'offset',
  'packageOnly',
  'terminologyEndpoint'
];

// Operation Definition: http://hl7.org/fhir/us/cqfmeasures/measure-repository-service.html#requirements
const UNSUPPORTED_DATA_REQ_ARGS = [
  'expression',
  'include-components',
  'include-dependencies',
  'manifest',
  'parameters'
];

// Operation Definition: http://hl7.org/fhir/us/cqfmeasures/measure-repository-service.html#search
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
  'publisher',
  'successor',
  'topic'
];

const UNSUPPORTED_LIBRARY_SEARCH_ARGS = [...UNSUPPORTED_CORE_SEARCH_ARGS, 'content-type', 'type'];

const hasIdentifyingInfo = (args: Record<string, any>) => args.id || args.url || args.identifier;

const onlyId = (args: Record<string, any>) => args.id;

const typeAndSummary = (args: Record<string, any>) =>
  (args.artifactAssessmentType && args.artifactAssessmentSummary) ||
  (!args.artifactAssessmentType && !args.artifactAssessmentSummary);

const idAndVersion = (args: Record<string, any>) => args.id && args.version;

const idAndVersionAndUrl = (args: Record<string, any>) => args.id && args.url && args.version;

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

/**
 * Checks that if artifactAssessmentType is provided as an input parameter than so is artifactAssessmentSummary
 * and vice versa
 */
export function catchMissingTypeAndSummary(val: Record<string, any>, ctx: z.RefinementCtx) {
  if (!typeAndSummary(val)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      params: { serverErrorCode: constants.ISSUE.CODE.REQUIRED },
      message:
        'Both artifactAssessmentType and artifactAssessmentSummary must be defined if they are doing to be included.'
    });
  }
}

/**
 * Checks that id is provided
 */
export function catchMissingId(val: Record<string, any>, ctx: z.RefinementCtx) {
  if (!onlyId(val)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      params: { serverErrorCode: constants.ISSUE.CODE.REQUIRED },
      message: 'Must provide id'
    });
  }
}

/**
 * Checks that id and version are included. Adds an issue to the ctx
 * that triggers a BadRequest to be thrown if not.
 */
export function catchMissingIdAndVersion(val: Record<string, any>, ctx: z.RefinementCtx) {
  if (!idAndVersion(val)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      params: { serverErrorCode: constants.ISSUE.CODE.REQUIRED },
      message: 'Must provide id and version'
    });
  }
}

/**
 * Checks that id, url, and version are included. Adds an issue to the ctx
 * that triggers a BadRequest to be thrown if not.
 */
export function catchMissingIdVersionUrl(val: Record<string, any>, ctx: z.RefinementCtx) {
  if (!idAndVersionAndUrl(val)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      params: { serverErrorCode: constants.ISSUE.CODE.REQUIRED },
      message: 'Must provide id, url, and version'
    });
  }
}

/**
 * For searches, checks that the version only appears in combination with a url. Adds an
 * issue to the ctx that triggers a BadRequest to be thrown if url is not specified when version
 * is specified.
 */
export function catchVersionWithoutUrl(val: Record<string, any>, ctx: z.RefinementCtx) {
  if ('version' in val && !('url' in val)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      params: { serverErrorCode: constants.ISSUE.CODE.INVALID },
      message: 'Version can only appear in combination with a url search'
    });
  }
}

const stringToBool = z
  .union([z.enum(['true', 'false']), z.boolean()])
  .transform(x => (typeof x === 'boolean' ? x : x === 'true'));
const stringToNumber = z.coerce.number();
const checkDate = z.string().regex(DATE_REGEX, 'Invalid FHIR date');
const checkVersion = z.string().regex(VERSION_REGEX, 'Invalid Semantic Version');

export const DraftArgs = z
  .object({ id: z.string(), version: checkVersion })
  .strict()
  .superRefine(catchInvalidParams([hasIdentifyingInfo, catchMissingIdAndVersion]));

export const CloneArgs = z
  .object({ id: z.string(), url: z.string(), version: checkVersion })
  .strict()
  .superRefine(catchInvalidParams([hasIdentifyingInfo, catchMissingIdVersionUrl]));

export const ApproveArgs = z
  .object({
    id: z.string(),
    approvalDate: checkDate.optional(),
    artifactAssessmentType: z
      .union([z.literal('documentation'), z.literal('guidance'), z.literal('review')])
      .optional(),
    artifactAssessmentSummary: z.string().optional()
  })
  .strict()
  .superRefine(catchInvalidParams([catchMissingId, catchMissingTypeAndSummary]));

export const IdentifyingParameters = z
  .object({
    id: z.string(),
    url: z.string().url(),
    version: z.string(),
    identifier: z.string()
  })
  .partial();

export const PackageArgs = IdentifyingParameters.extend({
  // TODO: The canonical version parameters are generalizations of the system version parameters.
  // Check that the canonical version params are preferred and that the system version params
  // are no longer supported by the measure repository service
  canonicalVersion: z.string(),
  capability: z.string(),
  contentEndpoint: z.string(),
  checkCanonicalVersion: z.string(),
  count: stringToNumber,
  forceCanonicalVersion: z.string(),
  include: z.string(),
  // The 'include-terminology' parameter is not defined in the OperationDefinition but we support it
  // TODO: check if the 'include' param should encompass the 'include-terminology' functionality
  'include-terminology': stringToBool,
  manifest: z.string(),
  offset: stringToNumber,
  packageOnly: stringToBool,
  terminologyEndpoint: z.string(),
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
  'system-version': z.string()
})
  .partial()
  .strict();

export const MeasureDataRequirementsArgs = CommonDataRequirementsArgs.extend({
  periodEnd: checkDate,
  periodStart: checkDate
})
  .partial()
  .strict()
  .superRefine(catchInvalidParams([catchMissingIdentifyingInfo], UNSUPPORTED_DATA_REQ_ARGS));

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
    'context-type': z.string(),
    'context-type-quantity': z.string(),
    'context-type-value': z.string(),
    date: checkDate,
    'depends-on': z.string(),
    'derived-from': z.string(),
    description: z.string(),
    effective: z.string(),
    id: z.string(),
    identifier: z.string(),
    jurisdiction: z.string(),
    name: z.string(),
    predecessor: z.string(),
    publisher: z.string(),
    status: z.string(),
    successor: z.string(),
    title: z.string(),
    topic: z.string(),
    url: z.string().url(),
    version: z.string(),
    // adding _summary for count (https://www.hl7.org/fhir/search.html#_summary)
    _summary: z.literal('count'),
    // adding _elements for a comma separated string (https://www.hl7.org/fhir/search.html#_elements)
    _elements: z.string()
  })
  .partial()
  .strict();

export const LibrarySearchArgs = CoreSearchArgs.extend({
  'content-type': z.string(),
  type: z.string()
})
  .partial()
  .strict()
  .superRefine(catchInvalidParams([catchVersionWithoutUrl], UNSUPPORTED_LIBRARY_SEARCH_ARGS));

export const MeasureSearchArgs = CoreSearchArgs.partial()
  .strict()
  .superRefine(catchInvalidParams([catchVersionWithoutUrl], UNSUPPORTED_CORE_SEARCH_ARGS));

/**
 * wrapper around the Zod parse function that catches Zod errors, parses the messages and throws appropriate ServerErrors
 */
export function parseRequestSchema<T extends z.ZodTypeAny>(params: Record<string, any>, schema: T): z.infer<T> {
  try {
    return schema.parse(params);
  } catch (e) {
    if (e instanceof z.ZodError) {
      if (e.issues[0].code === z.ZodIssueCode.custom) {
        if (e.issues[0].params?.type === 'NotImplemented') {
          throw new NotImplementedError(e.issues[0].message);
        } else {
          throw new BadRequestError(e.issues[0].message, e.issues[0].params?.serverErrorCode);
        }
      } else if (e.issues[0].code === z.ZodIssueCode.unrecognized_keys) {
        throw new BadRequestError(e.issues[0].message, constants.ISSUE.CODE.VALUE);
      }
      throw new BadRequestError(`${e.issues[0].message} received for parameter: ${e.issues[0].path.join('.')}`);
    }
  }
}
