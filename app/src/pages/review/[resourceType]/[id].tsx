import { Prism } from '@mantine/prism';
import { Center, Divider, Grid, Paper, Space, Tabs, Text } from '@mantine/core';
import { ArtifactResourceType } from '@/util/types/fhir';
import { useRouter } from 'next/router';
import { trpc } from '@/util/trpc';

/**
 * Component which renders a page that displays the JSON data of a resource. Also will eventually
 *  provide the user with the ability to make review comments and visualize previous review comments.
 */
export default function CommentPage() {
  const router = useRouter();
  const { resourceType: resourceType, id: resourceID, authoring } = router.query;
  let resource;

  if (authoring == 'true') {
    resource = trpc.draft.getDraftById.useQuery({
      id: resourceID as string,
      resourceType: resourceType as ArtifactResourceType
    });
  } else {
    resource = trpc.service.getArtifactById.useQuery({
      id: resourceID as string,
      resourceType: resourceType as ArtifactResourceType
    });
  }

  return (
    <div>
      <Center>
        <Text c="gray" fz="xl">
          {authoring === 'true'
            ? `Reviewing Draft ${resourceType}/${resourceID}`
            : `Reviewing ${resourceType}/${resourceID}`}
        </Text>
      </Center>
      <Divider my="md" style={{ marginTop: '14px' }} />
      <Grid>
        <Grid.Col span={6}>
          <Tabs variant="outline" defaultValue="addComments">
            <Tabs.List>
              <Tabs.Tab value="addComments">Add comment</Tabs.Tab>
              <Tabs.Tab value="visualizeComments"> Visualize Comments</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="addComments" pt="xs">
              Components to add review comment goes here
            </Tabs.Panel>
            <Tabs.Panel value="visualizeComments" pt="xs">
              Components to visualize comments go here
            </Tabs.Panel>
          </Tabs>
        </Grid.Col>
        <Grid.Col span={6}>
          <Space></Space>
          <Text c="gray" fz="sm">
            Current JSON Content
          </Text>
          <Paper withBorder>
            <Prism language="json" colorScheme="light" styles={{ scrollArea: { height: 'calc(100vh - 150px)' } }}>
              {resource.data ? JSON.stringify(resource.data, null, 2) : ''}
            </Prism>
          </Paper>
        </Grid.Col>
      </Grid>
    </div>
  );
}
