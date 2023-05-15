import { ArtifactResourceType } from './types/fhir';

type ParamDescription = {
  param: string;
  description: string;
};

export const ArtifactSearchParams: Record<ArtifactResourceType, ParamDescription[]> = {
  Measure: [
    { param: 'id', description: 'Returning any artifact matching the id' },
    {
      param: 'description',
      description: 'Returning any artifact matching the description, according to string-matching semantics in FHIR'
    },
    { param: 'identifier', description: 'Returning any artifact matching the identifier' },
    {
      param: 'name',
      description: 'Returning any artifact matching the name, according to the string-matching semantics in FHIR'
    },
    {
      param: 'title',
      description: 'Returning any artifact matching the title, according to the string-matching semantics in FHIR'
    },
    { param: 'url', description: 'Returning all versions of the artifact matching a url' },
    {
      param: 'version',
      description: 'Returning the artifact matching a version (can only appear in combination with a url search)'
    }
  ],
  Library: [
    { param: 'id', description: 'Returning any artifact matching the id' },
    {
      param: 'description',
      description: 'Returning any artifact matching the description, according to string-matching semantics in FHIR'
    },
    { param: 'identifier', description: 'Returning any artifact matching the identifier' },
    {
      param: 'name',
      description: 'Returning any artifact matching the name, according to the string-matching semantics in FHIR'
    },
    {
      param: 'title',
      description: 'Returning any artifact matching the title, according to the string-matching semantics in FHIR'
    },
    { param: 'url', description: 'Returning all versions of the artifact matching a url' },
    {
      param: 'version',
      description: 'Returning the artifact matching a version (can only appear in combination with a url search)'
    }
  ]
};
