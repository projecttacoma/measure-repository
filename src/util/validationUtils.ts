import { RequestQuery } from '@projecttacoma/node-fhir-server-core';
import { BadRequestError } from './errorUtils';

const UNIVERSAL_VALID_SEARCH_PARAMS = ['url', 'version', 'identifier', 'name', 'title', 'status', 'description'];

export function validateSearchParams(query: RequestQuery) {
  const invalidParams = Object.keys(query).filter(param => !UNIVERSAL_VALID_SEARCH_PARAMS.includes(param));
  if (invalidParams.length > 0) {
    throw new BadRequestError(`Parameters ${invalidParams.join(', ')} are not valid for search`);
  }
}
