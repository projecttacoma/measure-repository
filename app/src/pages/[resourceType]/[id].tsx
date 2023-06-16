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
import { useRouter } from 'next/router';
import { modifyResourceToDraft } from '@/util/modifyResourceFields';
import { AbacusOff } from 'tabler-icons-react';
import { useState } from 'react';
import { trpc } from '@/util/trpc';

/**
 * Component which displays the JSON/ELM/CQL/narrative content of an individual resource using
 * Mantine tabs
 * @returns JSON/ELM/CQL/narrative content of the individual resource in a Prism component
 */
export default function ResourceIDPage({ jsonData }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const resourceType = jsonData.resourceType;

  // Overwrite Prism with our custom Prism that includes CQL as a language
  useEffect(() => {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    (PrismRenderer.languages as any).cql = CQLRegex;
    (window as any).Prism = PrismRenderer;
    /* eslint-enable @typescript-eslint/no-explicit-any */
  }, []);

  const [loadingIconVisible, setLoadingIconVisible] = useState(false);
  const { data: dataRequirements, refetch } = trpc.service.getDataRequirements.useQuery(
    { resourceType: jsonData.resourceType, id: jsonData.id as string },
    { enabled: false }
  );
  //useEffect checks if the data Requirements were loaded and whether the button was clicked
  useEffect(() => {
    if (dataRequirements && loadingIconVisible) {
      setTimeout(() => {
        if (dataRequirements?.Library?.resourceType == 'Library') {
          notifications.show({
            id: 'requirements',
            withCloseButton: true,
            autoClose: 2000,
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
            message: 'No data requirements were found for this resource',
            color: 'red',
            style: { backgroundColor: 'white' },
            icon: <AbacusOff />,
            loading: false
          });
        }
        setLoadingIconVisible(false);
      }, 250);
    }
  }, [dataRequirements, loadingIconVisible]);

  const decodedCql = useMemo(() => {
    return decode('text/cql', jsonData);
  }, [jsonData]);

  const decodedElm = useMemo(() => {
    return decode('application/elm+json', jsonData);
  }, [jsonData]);

  const ctx = trpc.useContext();
  const router = useRouter();

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
            <Button w={240} loading={draftMutation.isLoading} onClick={createDraftOfArtifact}>
              Create Draft of {jsonData.resourceType}
            </Button>
          </Group>
        </div>
        <Divider my="sm" pb={6} />
        <div>
          <Tabs variant="outline" defaultValue="json">
            <Tabs.List>
              <Tabs.Tab value="json">JSON</Tabs.Tab>
              {decodedElm != null && <Tabs.Tab value="elm">ELM</Tabs.Tab>}
              {decodedCql != null && <Tabs.Tab value="cql">CQL</Tabs.Tab>}
              {jsonData.text && <Tabs.Tab value="narrative">Narrative</Tabs.Tab>}
              {dataRequirements?.Library.resourceType == 'Library' && (
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
            {dataRequirements?.Library.resourceType == 'Library' && (
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
            loading={loadingIconVisible}
            loaderPosition="center"
            onClick={() => {
              refetch();
              setLoadingIconVisible(true);
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
