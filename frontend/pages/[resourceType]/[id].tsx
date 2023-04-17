import { Prism } from '@mantine/prism';
import { Divider, Group, Stack, Tabs, Text } from '@mantine/core';
import { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import { FhirArtifact } from '@/util/types/fhir';
import BackButton from '../../components/BackButton';
import { useEffect, useState } from 'react';
import PrismRenderer from '../../prismLanguages/prismCQL';

/**
 * Component which displays the JSON/ELM/CQL/narrative content of an individual resource using
 * Mantine tabs
 * @returns JSON/ELM/CQL/narrative content of the individual resource in a Prism component
 */
export default function ResourceIDPage({ jsonData }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const [decodedCql, setDecodedCql] = useState<string | null>(null);

  // Overwrite Prism with our custom Prism that includes CQL as a language
  useEffect(() => {
    (window as any).Prism = PrismRenderer;
  }, []);

  useEffect(() => {
    if (jsonData.resourceType === 'Measure') {
      setDecodedCql(null);
    } else {
      const encodedCql = (jsonData.content as fhir4.Attachment[])?.find(e => e.contentType === 'text/cql')?.data;
      setDecodedCql(encodedCql ? Buffer.from(encodedCql, 'base64').toString() : null);
    }
  }, [jsonData]);

  return (
    <div>
      <Stack spacing="xs">
        <div>
          <Group>
            <BackButton />
            <Text size="xl" weight={700} color="gray">
              {jsonData.resourceType}/{jsonData.id}
            </Text>
          </Group>
        </div>
        <Divider my="sm" style={{ paddingBottom: '6px' }} />
        <Tabs variant="outline" defaultValue="json">
          <Tabs.List>
            <Tabs.Tab value="json">JSON</Tabs.Tab>
            <Tabs.Tab value="elm" disabled>
              ELM
            </Tabs.Tab>
            <Tabs.Tab value="cql" disabled={decodedCql == null}>
              CQL
            </Tabs.Tab>
            <Tabs.Tab value="narrative" disabled>
              Narrative
            </Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="json" pt="xs">
            <Prism language="json" colorScheme="light">
              {JSON.stringify(jsonData, null, 2)}
            </Prism>
          </Tabs.Panel>
          <Tabs.Panel value="cql" pt="xs">
            {decodedCql != null && (
              <Prism language={'cql' as any} colorScheme="light">
                {decodedCql}
              </Prism>
            )}
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
export const getServerSideProps: GetServerSideProps<{ jsonData: FhirArtifact }> = async context => {
  const { resourceType, id } = context.query;
  // Fetch resource data
  const res = await fetch(`${process.env.NEXT_PUBLIC_MRS_SERVER}/${resourceType}/${id}`);
  const resource = (await res.json()) as FhirArtifact;
  // pass JSON data to the page via props
  return { props: { jsonData: resource } };
};
