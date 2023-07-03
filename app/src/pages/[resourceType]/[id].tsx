import { Prism } from '@mantine/prism';
import { Button, Center, Divider, Group, SegmentedControl, ScrollArea, Space, Stack, Tabs, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import React, { useEffect, useMemo, useState } from 'react';
import { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import { FhirArtifact } from '@/util/types/fhir';
import CQLRegex from '../../util/prismCQL';
import { Prism as PrismRenderer } from 'prism-react-renderer';
import parse from 'html-react-parser';
import { AlertCircle, CircleCheck, AbacusOff } from 'tabler-icons-react';
import { useRouter } from 'next/router';
import { modifyResourceToDraft } from '@/util/modifyResourceFields';
import { trpc } from '@/util/trpc';
import DataReqs from '@/components/DataRequirements';

/**
 * Component which displays the JSON/ELM/CQL/narrative/Data Requirements content of an individual resource using
 * Mantine tabs. The Data Requirements tab can be optionally rendered via the click of a button.
 * @returns JSON/ELM/CQL/narrative content of the individual resource in a Prism component
 */
export default function ResourceIDPage({ jsonData }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const resourceType = jsonData.resourceType;
  const [dataReqsView, setDataReqsView] = useState('raw');
  const [height, setWindowHeight] = useState(0);

  const decodedCql = useMemo(() => {
    return decode('text/cql', jsonData);
  }, [jsonData]);

  const decodedElm = useMemo(() => {
    return decode('application/elm+json', jsonData);
  }, [jsonData]);

  const ctx = trpc.useContext();
  const router = useRouter();

  // Overwrite Prism with our custom Prism that includes CQL as a language
  useEffect(() => {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    (PrismRenderer.languages as any).cql = CQLRegex;
    (window as any).Prism = PrismRenderer;
    /* eslint-enable @typescript-eslint/no-explicit-any */
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setWindowHeight(window.innerHeight);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return window.removeEventListener('resize', handleResize);
  }, []);

  const {
    data: dataRequirements,
    refetch,
    isFetching
  } = trpc.service.getDataRequirements.useQuery(
    { resourceType: jsonData.resourceType, id: jsonData.id as string },
    {
      enabled: false,
      retry: 0,
      onSuccess: () => {
        notifications.show({
          autoClose: 2000,
          title: 'Successful Fetch',
          message: 'Data requirements successfully fetched',
          color: 'green',
          icon: <CircleCheck />
        });
      },
      onError: e => {
        notifications.show({
          autoClose: 4000,
          title: 'No Data Requirements Found',
          message: e.message,
          color: 'red',
          icon: <AbacusOff />
        });
      }
    }
  );

  const draftMutation = trpc.draft.createDraft.useMutation({
    onSuccess: data => {
      notifications.show({
        title: `Draft ${jsonData.resourceType} Created!`,
        message: `Draft ${jsonData.resourceType}/${jsonData.id} successfully created`,
        icon: <CircleCheck />,
        color: 'green'
      });
      router.push(`/authoring/${jsonData.resourceType}/${data.draftId}`);
      ctx.draft.getDraftCounts.invalidate();
    },
    onError: e => {
      notifications.show({
        title: `Draft ${jsonData.resourceType} Creation Failed!`,
        message: `Attempt to create draft of ${jsonData.resourceType}/${jsonData.id} failed with message: ${e.message}`,
        icon: <AlertCircle />,
        color: 'red'
      });
    }
  });

  const createDraftOfArtifact = () => {
    const draftOfArtifact = modifyResourceToDraft(jsonData);
    draftMutation.mutate({ resourceType, draft: draftOfArtifact });
  };

  return (
    <div>
      <Stack spacing="xs">
        <div>
          <Group position="apart">
            <Text size="xl" color="gray">
              {jsonData.resourceType}/{jsonData.id}
            </Text>
            <Group>
              <Button
                w={240}
                loading={isFetching}
                loaderPosition="center"
                onClick={() => {
                  refetch();
                }}
              >
                Get Data Requirements
              </Button>
              <Button w={240} loading={draftMutation.isLoading} onClick={createDraftOfArtifact}>
                Create Draft of {jsonData.resourceType}
              </Button>
            </Group>
          </Group>
        </div>
        <Divider my="sm" pb={6} />
        <Tabs variant="outline" defaultValue="json">
          <Tabs.List>
            <Tabs.Tab value="json">JSON</Tabs.Tab>
            {decodedElm != null && <Tabs.Tab value="elm">ELM</Tabs.Tab>}
            {decodedCql != null && <Tabs.Tab value="cql">CQL</Tabs.Tab>}
            {jsonData.text && <Tabs.Tab value="narrative">Narrative</Tabs.Tab>}
            {dataRequirements?.resourceType === 'Library' && (
              <Tabs.Tab value="data-requirements">Data Requirements</Tabs.Tab>
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
          {decodedElm != null && (
            <Tabs.Panel value="elm" pt="xs">
              <Prism language="json" colorScheme="light">
                {decodedElm}
              </Prism>
            </Tabs.Panel>
          )}
          {jsonData.text && (
            <Tabs.Panel value="narrative">
              <Space h="sm" />
              {parse(jsonData.text.div)}
            </Tabs.Panel>
          )}
          {dataRequirements?.dataRequirement && (
            <Tabs.Panel value="data-requirements">
              {dataRequirements?.dataRequirement.length > 0 && (
                <>
                  <Space h="md" />
                  <Center>
                    <SegmentedControl
                      fullWidth
                      value={dataReqsView}
                      onChange={setDataReqsView}
                      data={[
                        { label: 'Raw Data Requirements', value: 'raw' },
                        { label: 'Formatted Data Requirements', value: 'formatted' }
                      ]}
                    />
                  </Center>
                </>
              )}
              {dataReqsView === 'raw' && (
                <Prism language="json" colorScheme="light">
                  {JSON.stringify(dataRequirements, null, 2)}
                </Prism>
              )}
              <ScrollArea.Autosize mah={height * 0.8} type="always">
                <Space h="md" />
                <Text c="dimmed">
                  Number of Requirements:<b> {dataRequirements?.dataRequirement.length} </b>
                </Text>
                <Space h="md" />
                {dataReqsView === 'formatted' &&
                  dataRequirements?.dataRequirement.map((data: fhir4.DataRequirement, index: any) => (
                    <DataReqs
                      key={index}
                      type={data.type}
                      codeFilter={data.codeFilter}
                      dateFilter={data.dateFilter}
                      extension={data.extension}
                    />
                  ))}
              </ScrollArea.Autosize>
            </Tabs.Panel>
          )}
        </Tabs>
      </Stack>
    </div>
  );
}

/**
 * Function which extracts specified content from JSON data and then returns the decoded
 * version of that content (in this case the ELM/CQL)
 * @returns The decoded version of the ELM/CQL content
 */
function decode(link: string, jsonData: FhirArtifact) {
  if (jsonData.resourceType === 'Measure') return null;
  const encodedLanguage = (jsonData as fhir4.Library).content?.find(e => e.contentType === link)?.data;
  return encodedLanguage ? Buffer.from(encodedLanguage, 'base64').toString() : null;
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
