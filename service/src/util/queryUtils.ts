import { RequestQuery } from '@projecttacoma/node-fhir-server-core';
import { Filter } from 'mongodb';
import { NotImplementedError } from './errorUtils';

const STRING_TYPE_PARAMS = ['name', 'title', 'description', 'version'];
/**
 * Takes in an express query and parses the identifier field, if present, into
 * a usable mongo query
 */
export function getMongoQueryFromRequest(query: RequestQuery): Filter<any> {
  const pageSize = parseInt((query['_count'] || '50') as string); //default to limit 50
  const filter: Filter<any> = { limit: pageSize, skip: (parseInt((query['page'] || '1') as string) - 1) * pageSize }; //default to first page
  Object.keys(query).forEach((key: string) => {
    //TODO: Handle potential for query value to be array
    if (!query[key] || Array.isArray(query[key])) {
      throw new NotImplementedError(
        `Retrieved undefined or multiple arguments for query param: ${key}. Multiple arguments for the same query param and undefined arguments are not supported.`
      );
    } else if (STRING_TYPE_PARAMS.includes(key)) {
      // For string arguments in query they may match just the start of a string and are case insensitive
      filter[key] = { $regex: `^${query[key]}`, $options: 'i' };
    } else if (key === 'identifier') {
      // Identifier can check against the identifier.system, identifier.value, or both on a resource
      const iden = query.identifier as string;
      const splitIden = iden.split('|');
      if (splitIden.length === 1) {
        filter['identifier.value'] = splitIden[0];
      } else if (splitIden[0] === '') {
        filter['identifier.value'] = splitIden[1];
      } else if (splitIden[1] === '') {
        filter['identifier.system'] = splitIden[0];
      } else {
        filter['identifier.system'] = splitIden[0];
        filter['identifier.value'] = splitIden[1];
      }
    } else if (key === '_elements') {
      const elements = query[key] as string;
      filter[key] = elements.split(',');
    } else if (key !== '_count' && key !== 'page') {
      // Skip _count and page, otherwise no parsing necessary
      filter[key] = query[key];
    }
  });
  return filter;
}
