import { RequestArgs, RequestQuery, FhirResourceType } from '@projecttacoma/node-fhir-server-core';
import { Filter } from 'mongodb';
import { BadRequestError } from './errorUtils';

/*
 * Gathers parameters from both the query and the FHIR parameter request body resource
 */
export function gatherParams(query: RequestQuery, parameters?: fhir4.Parameters) {
  const gatheredParams: Record<string, any> = { ...query };

  if (parameters?.parameter) {
    parameters.parameter.reduce((params, bodyParam) => {
      if (!bodyParam.resource) {
        // Currently value types needed by $cqfm.package (add others as needed)
        params[bodyParam.name as string] =
          bodyParam.valueUrl ||
          bodyParam.valueString ||
          bodyParam.valueInteger ||
          bodyParam.valueCanonical ||
          bodyParam.valueDate ||
          bodyParam.valueBoolean;
      }
      return params;
    }, gatheredParams);
  }
  return gatheredParams;
}

export function validateParamIdSource(pathId: any, paramId: any) {
  if (pathId && paramId) {
    throw new BadRequestError(
      'Id argument may not be sourced from both a path parameter and a query or FHIR parameter.'
    );
  }
}

export function extractIdentificationForQuery(args: RequestArgs, params: Record<string, any>) {
  const id = args.id || params.id;
  const url = params.url;
  const version = params.version;
  const identifier = params.identifier;

  const query: Filter<any> = {};
  if (id) query.id = id;
  if (url) query.url = url;
  if (version) query.version = version;
  if (identifier) query.identifier = identifier;

  return query;
}
/**
 * Checks that the content-type from the request headers accepts json + fhir.
 */
export function checkContentTypeHeader(contentType?: string) {
  if (contentType !== 'application/json+fhir' && contentType !== 'application/fhir+json') {
    throw new BadRequestError(
      'Ensure Content-Type is set to application/json+fhir or to application/fhir+json in headers'
    );
  }
}

/**
 * Checks that the type of the resource in the body matches the resource type we expect.
 */
export function checkExpectedResourceType(resourceType: string, expectedResourceType: FhirResourceType) {
  if (resourceType !== expectedResourceType) {
    throw new BadRequestError(`Expected resourceType '${expectedResourceType}' in body. Received '${resourceType}'.`);
  }
}
