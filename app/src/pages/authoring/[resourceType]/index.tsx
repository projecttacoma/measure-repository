import { trpc } from '@/util/trpc';
import { Center, Text, Divider } from '@mantine/core';
import { useRouter } from 'next/router';
import { ArtifactResourceType, FhirArtifact, ResourceInfo } from '@/util/types/fhir';
import ResourceCards from '@/components/ResourceCards';
import { Edit } from 'tabler-icons-react';
import { extractResourceInfo } from '@/util/resourceCardUtils';

export default function ResourceAuthoringPage() {
  const router = useRouter();
  const { resourceType } = router.query;

  const resourceTypeQuery = trpc.draft.getDrafts.useQuery(resourceType as ArtifactResourceType);

  const resourceCardContent: ResourceInfo[] = (resourceTypeQuery.data as FhirArtifact[])?.map(resource => {
    return extractResourceInfo(resource);
  });

  return (
    <div>
      <Center>
        <Text c="gray" fz="xl">
          Available Draft {resourceType} Resources
        </Text>
      </Center>
      <Divider my="md" />
      <div style={{ paddingTop: '18px' }}>
        <ResourceCards
          resourceInfo={resourceCardContent}
          resourceType={resourceType as ArtifactResourceType}
          icon={<Edit size="24" />}
          authoring={true}
        />
      </div>
    </div>
  );
}
