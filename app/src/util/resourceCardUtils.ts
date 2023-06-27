import { FhirArtifact, ResourceInfo } from './types/fhir';

/**
 * Extracts fields from the resource to be rendered onto the resource's card.
 * @param resource Measure or Library resource
 * @returns object containing extracted info from resource
 */
export function extractResourceInfo(resource: FhirArtifact) {
  const identifier = resource.identifier?.[0];
  const resourceInfo: ResourceInfo = {
    resourceType: resource.resourceType,
    id: resource.id as string,
    identifier:
      identifier?.system && identifier?.value
        ? `${identifier.system}|${identifier.value}`
        : identifier?.value
        ? `${identifier.value}`
        : '',
    name: resource.name ?? null,
    url: resource.url ?? null,
    version: resource.version ?? null,
    status: resource.status ?? null
  };
  return resourceInfo;
}
