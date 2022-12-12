import { RequestQuery } from '@projecttacoma/node-fhir-server-core';
import { BadRequestError } from './errorUtils';

const UNIVERSAL_VALID_SEARCH_PARAMS = ['url', 'version', 'identifier', 'name', 'title', 'status', 'description'];

/**
 * Takes in an Express request query and checks the keys against a list of accepted parameters.
 * Throws a BadRequest error if invalid parameters are discovered
 */
export function validateSearchParams(query: RequestQuery) {
  const invalidParams = Object.keys(query).filter(param => !UNIVERSAL_VALID_SEARCH_PARAMS.includes(param));
  if (invalidParams.length > 0) {
    throw new BadRequestError(`Parameters ${invalidParams.join(', ')} are not valid for search`);
  }
}
/*
 * Gathers parameters from both the query and the FHIR parameter request body resource
 */
export function gatherParams(query: Record<string, any>, parameters?: fhir4.Parameters) {
  const params = { ...query };

  if (parameters?.parameter) {
    parameters.parameter.reduce((acc, e) => {
      if (!e.resource) {
        // Currently value types needed by $package (add others as needed)
        acc[e.name] = e.valueUrl || e.valueString || e.valueInteger || e.valueCanonical || e.valueBoolean;
      }
      return acc;
    }, params);
  }
  return params;
}
