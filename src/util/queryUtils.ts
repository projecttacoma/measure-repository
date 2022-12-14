import { RequestQuery } from '@projecttacoma/node-fhir-server-core';
import { Filter } from 'mongodb';

/**
 * Takes in an express query and parses the identifier field, if present, into
 * a usable mongo query
 */
export function getMongoQueryFromRequest(query: RequestQuery): Filter<any> {
  //TODO: Handle potential for query value to be array
  const mongoFilter: Filter<any> = { ...query };
  delete mongoFilter.identifier;
  if (query.identifier) {
    const iden = query.identifier as string;
    const splitIden = iden.split('|');
    if (splitIden.length === 1) {
      mongoFilter['identifier.value'] = splitIden[0];
    } else if (splitIden[0] === '') {
      mongoFilter['identifier.value'] = splitIden[1];
    } else if (splitIden[1] === '') {
      mongoFilter['identifier.system'] = splitIden[0];
    } else {
      mongoFilter['identifier.system'] = splitIden[0];
      mongoFilter['identifier.value'] = splitIden[1];
    }
  }
  return mongoFilter;
}
