import { Prism } from '@mantine/prism';
import { Divider, Group, Space, Stack, Tabs, Text, Button } from '@mantine/core';
import { IconAbacus, IconAbacusOff, IconCheck } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import React from 'react';
import { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import { FhirArtifact } from '@/util/types/fhir';
import { useEffect, useMemo } from 'react';
import CQLRegex from '../../util/prismCQL';
import { Prism as PrismRenderer } from 'prism-react-renderer';
import parse from 'html-react-parser';
import { useState } from 'react';
import { DataRequirement } from 'fhir/r3';
import { teal } from '@mui/material/colors';

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

  const [requirementTabVisible, setTabVisible] = useState(false);
  const [load, setLoading] = useState(false);
  const [dataRequirementsVisible, setDataReqsVisible] = useState<DataRequirement[] | undefined>(undefined);

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

              {requirementTabVisible != false && dataRequirementsVisible != null && (
                <Tabs.Tab value="datarequirements">Data Requirements</Tabs.Tab>
              )}
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
            {requirementTabVisible && dataRequirementsVisible != null && (
              <Tabs.Panel value="datarequirements">
                <Prism language="json" colorScheme="light">
                  {JSON.stringify(dataRequirementsVisible, null, 2)}
                </Prism>
              </Tabs.Panel>
            )}
          </Tabs>
        </div>
        <div style={{ position: 'absolute', left: '85vw', top: '16vh' }}>
          <Button
            id="btn"
            loading={load}
            loaderPosition="center"
            style={{ display: 'flex', float: 'right', justifyContent: 'space-between' }}
            onClick={event => {
              setLoading(true);
              setTimeout(() => {
                if ((jsonData as fhir4.Library).dataRequirement != undefined) {
                  const dr = (jsonData as fhir4.Library).dataRequirement;
                  setDataReqsVisible(dr);
                  notifications.show({
                    id: 'requirements',
                    withCloseButton: true,
                    onClose: () => console.log('unmounted'),
                    onOpen: () => console.log('mounted'),
                    autoClose: 3000,
                    title: 'Successful Fetch',
                    message: 'Data Requirements successfully fetched for this package',
                    color: 'teal',
                    icon: <IconCheck />,
                    // color: teal,
                    className: 'my-notification-class',
                    style: { backgroundColor: 'white' },
                    loading: false
                  });
                } else {
                  notifications.show({
                    id: 'no-requirements',
                    withCloseButton: true,
                    onClose: () => console.log('unmounted'),
                    onOpen: () => console.log('mounted'),
                    autoClose: 5000,
                    title: 'No Data Requirements found',
                    message: 'No data requirements were found for this package',
                    color: 'white',
                    icon: <IconAbacusOff />,
                    className: 'my-notification-class',
                    style: { backgroundColor: 'white' },
                    loading: false
                  });
                }
                setLoading(false);
                setTabVisible(true);
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
