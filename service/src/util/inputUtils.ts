import { RequestArgs, RequestQuery } from '@projecttacoma/node-fhir-server-core';
import { Filter } from 'mongodb';
import { BadRequestError } from './errorUtils';
import _ from 'lodash';
import { ArtifactResourceType, FhirArtifact } from '../types/service-types';

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
export function checkExpectedResourceType(resourceType: string, expectedResourceType: ArtifactResourceType) {
  if (resourceType !== expectedResourceType) {
    throw new BadRequestError(`Expected resourceType '${expectedResourceType}' in body. Received '${resourceType}'.`);
  }
}

export function checkFieldsForCreate(resource: fhir4.Measure | fhir4.Library) {
  // base shareable artifact requires url, version, title, status (required by base FHIR), description
  if (!resource.url || !resource.version || !resource.title || !resource.description) {
    throw new BadRequestError('Created artifacts must have url, version, title, status, and description');
  }

  if (process.env.AUTHORING === 'true') {
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

export function checkIsOwned(resource: FhirArtifact, message: string) {
  if (
    resource.extension?.some(
      e => e.url === 'http://hl7.org/fhir/StructureDefinition/artifact-isOwned' && e.valueBoolean === true
    )
  ) {
    throw new BadRequestError(message);
  }
}

export function checkAuthoring() {
  if (process.env.AUTHORING === 'false') {
    throw new BadRequestError('The Publishable repository service does not support this operation.');
  }
}

export function checkFieldsForUpdate(resource: fhir4.Measure | fhir4.Library, oldResource: FhirArtifact) {
  if (process.env.AUTHORING !== 'true' || oldResource.status === 'active') {
    // publishable or active status requires retire functionality
    if (process.env.AUTHORING !== 'true' && oldResource.status !== 'active') {
      throw new BadRequestError(
        `Resource status is currently ${oldResource.status}. Publishable repository service updates may only be made to active status resources.`
      );
    }
    const { status: statusOld, date: dateOld, ...limitedOld } = oldResource; // eslint-disable-line @typescript-eslint/no-unused-vars
    const { status: statusNew, date: dateNew, ...limitedNew } = resource; // eslint-disable-line @typescript-eslint/no-unused-vars

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
    // base shareable artifact requires url, version, title, status (required by base FHIR), description
    if (!resource.url || !resource.version || !resource.title || !resource.description) {
      throw new BadRequestError('Artifacts must have url, version, title, status, and description');
    }
  } else {
    throw new BadRequestError(`Cannot update existing resource with status ${oldResource.status}`);
  }
}

export function checkFieldsForDelete(resource: FhirArtifact) {
  if (process.env.AUTHORING === 'true') {
    // authoring requires draft or retired status
    if (resource.status !== 'draft' && resource.status !== 'retired') {
      throw new BadRequestError(
        'Authoring repository service deletions may only be made to draft or retired status resources.'
      );
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
