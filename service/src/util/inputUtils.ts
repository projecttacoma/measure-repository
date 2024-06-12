import { RequestArgs, RequestQuery, FhirResourceType } from '@projecttacoma/node-fhir-server-core';
import { Filter } from 'mongodb';
import { BadRequestError } from './errorUtils';
import _ from 'lodash';

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

export function checkFieldsForCreate(resource: fhir4.Measure | fhir4.Library) {
  if (process.env.AUTHORING) {
    // authoring requires active or draft status
    if (resource.status !== 'active' && resource.status !== 'draft') {
      throw new BadRequestError(
        'Authoring repository service creations may only be made for active or draft status resources.'
      );
    }
  } else {
    // publishable requires active status
    if (resource.status !== 'active') {
      throw new BadRequestError(
        'Publishable repository service creations may only be made for active status resources.'
      );
    }
  }
}

export function checkFieldsForUpdate(
  resource: fhir4.Measure | fhir4.Library,
  oldResource: fhir4.Measure | fhir4.Library
) {
  if (!process.env.AUTHORING || oldResource.status === 'active') {
    // publishable or active status requires retire functionality
    // TODO: is there any other metadata we should allow to update for the retire functionality?
    if (!process.env.AUTHORING && oldResource.status !== 'active') {
      throw new BadRequestError(
        `Resource status is currently ${oldResource.status}. Publishable repository service updates may only be made to active status resources.`
      );
    }
    const { status: statusOld, date: dateOld, ...limitedOld } = oldResource;
    const { status: statusNew, date: dateNew, ...limitedNew } = resource;

    if (statusNew !== 'retired') {
      throw new BadRequestError('Updating active status resources requires changing the resource status to retired.');
    }

    if (!_.isEqual(limitedOld, limitedNew)) {
      throw new BadRequestError('Updating active status resources may only change the status and date.');
    }
  } else if (oldResource.status === 'draft') {
    // authoring and draft status requires revise functionality
    if (resource.status != 'draft') {
      throw new BadRequestError('Existing draft resources must stay in draft while revising.');
    }
  } else {
    throw new BadRequestError(`Cannot update existing resource with status ${oldResource.status}`);
  }
}

export function checkFieldsForDelete(resource: fhir4.Measure | fhir4.Library) {
  if (process.env.AUTHORING) {
    // authoring requires draft status
    if (resource.status !== 'draft') {
      throw new BadRequestError('Authoring repository service deletions may only be made to draft status resources.');
    }
  } else {
    // publishable requires retired status
    if (resource.status !== 'retired') {
      throw new BadRequestError(
        'Publishable repository service deletions may only be made to retired status resources.'
      );
    }
  }
}
