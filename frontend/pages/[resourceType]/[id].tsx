import { Prism } from '@mantine/prism';
import { Divider, Group, ScrollArea, Stack, Tabs, Text } from '@mantine/core';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import BackButton from '../../components/BackButton';

/**
 * Component which displays the JSON/ELM/CQL/narrative content of an individual resource using
 * Mantine tabs
 * @returns JSON/ELM/CQL/narrative content of the individual resource in a Prism component
 */
export default function ResourceIDPage({ jsonData }: { jsonData: fhir4.Measure | fhir4.Library }) {
  const router = useRouter();
  const { resourceType, id } = router.query;
  return (
    <div>
      <Stack spacing="xs">
        <div
          style={{
            float: 'left'
          }}
        >
          <Group>
            <BackButton />
            <Text size="xl" weight={700} color="gray">
              {resourceType}/{id}
            </Text>
          </Group>
        </div>
        <Divider my="sm" style={{ paddingBottom: '5px' }} />
        <Tabs variant="outline" defaultValue="json">
          <Tabs.List>
            <Tabs.Tab value="json">JSON</Tabs.Tab>
            <Tabs.Tab value="elm" disabled>
              ELM
            </Tabs.Tab>
            <Tabs.Tab value="cql" disabled>
              CQL
            </Tabs.Tab>
            <Tabs.Tab value="narrative" disabled>
              Narrative
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="json" pt="xs">
            <ScrollArea>
              <Prism
                language="json"
                data-testid="prism-page-content"
                colorScheme="light"
                style={{ maxWidth: '78vw', height: '80vh', backgroundColor: '#FFFFFF' }}
              >
                {JSON.stringify(jsonData, null, 2)}
              </Prism>
            </ScrollArea>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </div>
  );
}

/**
 * Serverside props pulls JSON data of a specified resource to pass to the page before it's sent to browser
 * @returns props for the [resourceType]/[id] page that pass JSON data of a specified resource
 */
export const getServerSideProps: GetServerSideProps = async context => {
  const { resourceType, id } = context.query;
  // Fetch resource data
  const res = await fetch(`${process.env.NEXT_PUBLIC_MRS_SERVER}/${resourceType}/${id}`);
  const resourceJson = await res.json();
  // pass JSON data to the page via props
  return { props: { jsonData: resourceJson as fhir4.Measure | fhir4.Library } };
};
