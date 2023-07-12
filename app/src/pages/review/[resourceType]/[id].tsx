import { Prism } from '@mantine/prism';
import { Center, Divider, Grid, Paper, Space, Tabs, Text } from '@mantine/core';
import { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import { FhirArtifact } from '@/util/types/fhir';
import { ArtifactResourceType } from '@/util/types/fhir';
import { useRouter } from 'next/router';
import { trpc } from '@/util/trpc';

interface authoringProps {
  authoring?: boolean;
}
/**
 * Component which renders a page that displays the JSON data of a resource. Also will eventually
 *  provide the user with the ability to make review comments and visualize previous review comments.
 */
export default function CommentPage({ jsonData }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  // console.log(authoring + ' authoring');
  const jsonResourceType = jsonData.resourceType;
  const router = useRouter();
  const { resourceType: draftResourceType, id: draftID } = router.query;
  const { authoring } = router.query;
  const status = jsonData.status;

  console.log(authoring + ' PARAM');

  const { data: resource } = trpc.draft.getDraftById.useQuery({
    id: draftID as string,
    resourceType: draftResourceType as ArtifactResourceType
  });

  return (
    <div>
      <Center>
        <Text c="gray" fz="xl">
          {status === 'active'
            ? `Reviewing ${jsonResourceType}/${jsonData.id}`
            : `Reviewing Draft ${draftResourceType}/${draftID}`}
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
          {status === 'active' && (
            <Paper withBorder>
              <Prism language="json" colorScheme="light" styles={{ scrollArea: { height: 'calc(100vh - 150px)' } }}>
                {jsonData.id ? JSON.stringify(jsonData, null, 2) : ''}
              </Prism>
            </Paper>
          )}
          {draftID && (
            <Paper withBorder>
              <Prism language="json" colorScheme="light" styles={{ scrollArea: { height: 'calc(100vh - 150px)' } }}>
                {resource ? JSON.stringify(resource, null, 2) : ''}
              </Prism>
            </Paper>
          )}
        </Grid.Col>
      </Grid>
    </div>
  );
}
/**
 * Serverside props pulls JSON data of a specified resource to pass to the page before it's sent to browser
 * @returns props for the [resourceType]/[id] page that pass JSON data of a specified resource
 */
export const getServerSideProps: GetServerSideProps<{ jsonData: FhirArtifact }> = async context => {
  const { resourceType, id } = context.query;
  // Fetch resource data
  const res = await fetch(`${process.env.NEXT_PUBLIC_MRS_SERVER}/${resourceType}/${id}`);
  const resource = (await res.json()) as FhirArtifact;
  // pass JSON data to the page via props
  return { props: { jsonData: resource } };
};
