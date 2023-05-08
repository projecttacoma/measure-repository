import { ArtifactResourceType } from './types/fhir';

export const ArtifactSearchParams: Record<ArtifactResourceType, string[]> = {
  Measure: ['id', 'description', 'identifier', 'name', 'title', 'url', 'version'],
  Library: ['id', 'description', 'identifier', 'name', 'title', 'url', 'version']
};
