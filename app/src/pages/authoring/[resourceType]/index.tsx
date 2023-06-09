import { trpc } from '@/util/trpc';
import { Center, Text, Divider } from '@mantine/core';
import { useRouter } from 'next/router';
import { ArtifactResourceType, FhirArtifact, ResourceInfo } from '@/util/types/fhir';
import ResourceCards from '@/components/ResourceCards';
import { Edit } from 'tabler-icons-react';

export default function ResourceAuthoringPage() {
  const router = useRouter();
  const { resourceType } = router.query;

  const resourceTypeQuery = trpc.draft.getDrafts.useQuery(resourceType as ArtifactResourceType);

  const resourceCardContent: ResourceInfo[] = (resourceTypeQuery.data as FhirArtifact[])?.map(resource => {
    const identifier = resource.identifier?.[0];
    const resourceInfo: ResourceInfo = {
      resourceType: resourceType as ArtifactResourceType,
      id: resource.id as string,
      identifier: identifier?.system && identifier?.value ? `${identifier.system}|${identifier.value}` : null,
      name: resource.name ?? null,
      url: resource.url ?? null,
      version: resource.version ?? null,
      status: resource.status ?? null
    };
    return resourceInfo;
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
        />
      </div>
    </div>
  );
}
