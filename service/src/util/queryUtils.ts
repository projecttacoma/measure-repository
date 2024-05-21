import { RequestQuery } from '@projecttacoma/node-fhir-server-core';
import { Filter } from 'mongodb';
import { NotImplementedError } from './errorUtils';

const STRING_TYPE_PARAMS = ['name', 'title', 'description', 'version'];
/**
 * Takes in an express query and parses the identifier field, if present, into
 * a usable mongo query
 */
export function getMongoQueryFromRequest(query: RequestQuery): Filter<any> {
  //TODO: Handle potential for query value to be array
  return Object.keys(query).reduce((mf: Filter<any>, key: string) => {
    if (!query[key] || Array.isArray(query[key])) {
      throw new NotImplementedError(
        `Retrieved undefined or multiple arguments for query param: ${key}. Multiple arguments for the same query param and undefined arguments are not supported.`
      );
    } else if (STRING_TYPE_PARAMS.includes(key)) {
      // For string arguments in query they may match just the start of a string and are case insensitive
      mf[key] = { $regex: `^${query[key]}`, $options: 'i' };
    } else if (key === 'identifier') {
      // Identifier can check against the identifier.system, identifier.value, or both on a resource
      const iden = query.identifier as string;
      const splitIden = iden.split('|');
      if (splitIden.length === 1) {
        mf['identifier.value'] = splitIden[0];
      } else if (splitIden[0] === '') {
        mf['identifier.value'] = splitIden[1];
      } else if (splitIden[1] === '') {
        mf['identifier.system'] = splitIden[0];
      } else {
        mf['identifier.system'] = splitIden[0];
        mf['identifier.value'] = splitIden[1];
      }
    } else if (key === '_elements') {
      const elements = query[key] as string;
      mf[key] = elements.split(',');
    } else if (key === '_count') {
      //blackhole _count for now
    } else {
      // Otherwise no parsing necessary
      mf[key] = query[key];
    }
    return mf;
  }, {});
}
