import { CRMIShareableLibrary } from '../../src/types/service-types';
import { cleanUpTestDatabase, setupTestDatabase } from '../utils';
import { getChildren, modifyResourcesForDraft } from '../../src/util/serviceUtils';

const PARENT_RELATED_ARTIFACTS: fhir4.RelatedArtifact[] = [
  {
    type: 'composed-of',
    resource: 'http://child-library-1.com|1',
    extension: [
      {
        url: 'http://hl7.org/fhir/StructureDefinition/artifact-isOwned',
        valueBoolean: true
      }
    ]
  }
];

const CHILD_LIBRARY_1: CRMIShareableLibrary = {
  resourceType: 'Library',
  status: 'active',
  type: { coding: [{ code: 'logic-library' }] },
  extension: [
    {
      url: 'http://hl7.org/fhir/StructureDefinition/artifact-isOwned',
      valueBoolean: true
    }
  ],
  id: 'childLibrary1',
  url: 'http://child-library-1.com',
  version: '1',
  title: 'Child Library 1',
  description: 'Child Library 1 description',
  relatedArtifact: [
    {
      type: 'composed-of',
      resource: 'http://child-library-2.com|1',
      extension: [
        {
          url: 'http://hl7.org/fhir/StructureDefinition/artifact-isOwned',
          valueBoolean: true
        }
      ]
    }
  ]
};

const CHILD_LIBRARY_2: CRMIShareableLibrary = {
  resourceType: 'Library',
  status: 'active',
  type: { coding: [{ code: 'logic-library' }] },
  extension: [
    {
      url: 'http://hl7.org/fhir/StructureDefinition/artifact-isOwned',
      valueBoolean: true
    }
  ],
  id: 'childLibrary2',
  url: 'http://child-library-2.com',
  version: '1',
  title: 'Child Library 2',
  description: 'Child Library 2 description'
};

describe('serviceUtils', () => {
  beforeAll(async () => {
    await setupTestDatabase([CHILD_LIBRARY_1, CHILD_LIBRARY_2]);
  });

  describe('getChildren', () => {
    it('returns an array of ChildArtifactInfo objects', async () => {
      expect(await getChildren(PARENT_RELATED_ARTIFACTS)).toEqual([CHILD_LIBRARY_1, CHILD_LIBRARY_2]);
    });
  });

  describe('modifyResourcesForDraft', () => {
    it('returns an array of modified (new id, new version, draft status, modified relatedArtifacts) FhirArtifacts', async () => {
      const modifiedResources = await modifyResourcesForDraft([CHILD_LIBRARY_1, CHILD_LIBRARY_2], '1.0.0.1');
      expect(modifiedResources[0].status).toEqual('draft');
      expect(modifiedResources[1].status).toEqual('draft');
      expect(modifiedResources[0].version).toEqual('1.0.0.1');
      expect(modifiedResources[1].version).toEqual('1.0.0.1');
      expect(modifiedResources[0].relatedArtifact?.[0].resource).toEqual('http://child-library-2.com|1.0.0.1');
    });
  });

  afterAll(cleanUpTestDatabase);
});
