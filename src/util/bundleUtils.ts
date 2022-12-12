import { v4 } from 'uuid';

export function createSearchsetBundle<T extends fhir4.FhirResource>(entries: T[]): fhir4.Bundle<T> {
  return {
    resourceType: 'Bundle',
    meta: { lastUpdated: new Date().toISOString() },
    id: v4(),
    type: 'searchset',
    total: entries.length,
    entry: entries.map(e => ({ resource: e }))
  };
}
