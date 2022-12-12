import { RequestQuery } from '@projecttacoma/node-fhir-server-core';

export function parseQuery(query: RequestQuery): RequestQuery {
  if (query.identifier) {
    const iden = query.identifier;
    delete query.identifier;
    const splitIden = iden.split('|');
    if (splitIden.length === 1) {
      query['identifier.value'] = splitIden[0];
    } else if (splitIden[0] === '') {
      query['identifier.value'] = splitIden[1];
    } else if (splitIden[1] === '') {
      query['identifier.system'] = splitIden[0];
    } else {
      query['identifier.system'] = splitIden[0];
      query['identifier.value'] = splitIden[1];
    }
  }
  return query;
}
