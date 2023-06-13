import { Prism } from '@mantine/prism';
import { Divider, Group, Space, Stack, Tabs, Text, Button } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import React from 'react';
import { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import { FhirArtifact } from '@/util/types/fhir';
import { useEffect, useMemo } from 'react';
import CQLRegex from '../../util/prismCQL';
import { Prism as PrismRenderer } from 'prism-react-renderer';
import parse from 'html-react-parser';
import { AlertCircle, CircleCheck } from 'tabler-icons-react';
import { useState } from 'react';
import { DataRequirement } from 'fhir/r4';

/**
 * Component which displays the JSON/ELM/CQL/narrative content of an individual resource using
 * Mantine tabs
 * @returns JSON/ELM/CQL/narrative content of the individual resource in a Prism component
 */
export default function ResourceIDPage({ jsonData }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  // Overwrite Prism with our custom Prism that includes CQL as a language
  useEffect(() => {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    (PrismRenderer.languages as any).cql = CQLRegex;
    (window as any).Prism = PrismRenderer;
    /* eslint-enable @typescript-eslint/no-explicit-any */
  }, []);

  const [loadingVisible, setLoading] = useState(false);
  const [dataRequirements, setDataRequirements] = useState<DataRequirement[] | undefined>(undefined);

  const decodedCql = useMemo(() => {
    if (jsonData.resourceType === 'Measure') return null;
    const encodedCql = (jsonData as fhir4.Library).content?.find(e => e.contentType === 'text/cql')?.data;
    return encodedCql ? Buffer.from(encodedCql, 'base64').toString() : null;
  }, [jsonData]);

  return (
    <div>
      <Stack spacing="xs">
        <div>
          <Group>
            <Text size="xl" color="gray">
              {jsonData.resourceType}/{jsonData.id}
            </Text>
          </Group>
        </div>
        <Divider my="sm" pb={6} />
        <div>
          <Tabs variant="outline" defaultValue="json">
            <Tabs.List>
              <Tabs.Tab value="json">JSON</Tabs.Tab>
              <Tabs.Tab value="elm" disabled>
                ELM
              </Tabs.Tab>
              {decodedCql != null && <Tabs.Tab value="cql">CQL</Tabs.Tab>}
              {jsonData.text && <Tabs.Tab value="narrative">Narrative</Tabs.Tab>}
              {dataRequirements != null && <Tabs.Tab value="datarequirements">Data Requirements</Tabs.Tab>}
            </Tabs.List>
            <Tabs.Panel value="json" pt="xs">
              <Prism language="json" colorScheme="light">
                {JSON.stringify(jsonData, null, 2)}
              </Prism>
            </Tabs.Panel>
            {decodedCql != null && (
              <Tabs.Panel value="cql" pt="xs">
                {/* eslint-disable  @typescript-eslint/no-explicit-any */}
                <Prism language={'cql' as any} colorScheme="light">
                  {/* eslint-enable  @typescript-eslint/no-explicit-any */}
                  {decodedCql}
                </Prism>
              </Tabs.Panel>
            )}
            {jsonData.text && (
              <Tabs.Panel value="narrative">
                <Space h="sm" />
                {parse(jsonData.text.div)}
              </Tabs.Panel>
            )}
            {dataRequirements != null && (
              <Tabs.Panel value="datarequirements">
                <Prism language="json" colorScheme="light">
                  {JSON.stringify(dataRequirements, null, 2)}
                </Prism>
              </Tabs.Panel>
            )}
          </Tabs>
        </div>
        <div style={{ position: 'absolute', left: '85vw', top: '16vh' }}>
          <Button
            id="btn"
            loading={loadingVisible}
            loaderPosition="center"
            onClick={() => {
              setLoading(true);
              setTimeout(() => {
                if ((jsonData as fhir4.Library).dataRequirement != undefined) {
                  const dataReqs = (jsonData as fhir4.Library).dataRequirement;
                  setDataRequirements(dataReqs);
                  notifications.show({
                    id: 'requirements',
                    withCloseButton: true,
                    autoClose: 3000,
                    title: 'Successful Fetch',
                    message: 'Data requirements successfully fetched',
                    color: 'teal',
                    style: { backgroundColor: 'white' },
                    icon: <CircleCheck />,
                    loading: false
                  });
                } else {
                  notifications.show({
                    id: 'no-requirements',
                    withCloseButton: true,
                    autoClose: 3000,
                    title: 'No Data Requirements Found',
                    message: 'No data requirements were found for this package',
                    color: 'red',
                    style: { backgroundColor: 'white' },
                    icon: <AlertCircle />,
                    loading: false
                  });
                }
                setLoading(false);
              }, 1000);
            }}
          >
            Get Data Requirements
          </Button>
        </div>
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
