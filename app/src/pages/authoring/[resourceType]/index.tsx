import { trpc } from '@/util/trpc';
import { Center, Text, Divider, Title, Stack, Button } from '@mantine/core';
import { useRouter } from 'next/router';
import { ArtifactResourceType, ResourceInfo } from '@/util/types/fhir';
import ResourceCards from '@/components/ResourceCards';
import { extractResourceInfo } from '@/util/resourceCardUtils';
import { useMemo } from 'react';
import Link from 'next/link';

export default function ResourceAuthoringPage() {
  const router = useRouter();
  const { resourceType } = router.query;

  const { data: artifacts } = trpc.draft.getDrafts.useQuery(resourceType as ArtifactResourceType);

  const resourceCardContent: ResourceInfo[] = useMemo(() => {
    return (artifacts ?? []).map(a => extractResourceInfo(a));
  }, [artifacts]);

  const authoring = trpc.service.getAuthoring.useQuery();
  if (!authoring.data) {
    return (
      <Center>
        <Title> Authoring Unavailable </Title>
      </Center>
    );
  }

  return (
    <div>
      <Center>
        <Text c="gray" fz="xl">
          Available Draft {resourceType} Resources
        </Text>
      </Center>
      <Divider my="md" />
      <Stack align="center">
        <Link href={`/search?resourceType=${resourceType}&authoring=true`}>
          <Button>Search</Button>
        </Link>
        <div style={{ paddingTop: '18px' }}>
          <ResourceCards
            resourceInfo={resourceCardContent}
            resourceType={resourceType as ArtifactResourceType}
            authoring={true}
          />
        </div>
      </Stack>
    </div>
  );
}
