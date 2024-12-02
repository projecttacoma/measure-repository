import { Prism } from '@mantine/prism';
import {
  Box,
  Button,
  Center,
  Divider,
  Group,
  SegmentedControl,
  ScrollArea,
  Space,
  Stack,
  Tabs,
  Text,
  TextInput,
  Tooltip
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import React, { useEffect, useMemo, useState } from 'react';
import { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import { CRMIShareableLibrary, FhirArtifact } from '@/util/types/fhir';
import CQLRegex from '../../util/prismCQL';
import { Prism as PrismRenderer } from 'prism-react-renderer';
import parse from 'html-react-parser';
import { AlertCircle, CircleCheck } from 'tabler-icons-react';
import { useRouter } from 'next/router';
import { trpc } from '@/util/trpc';
import DataReqs from '@/components/DataRequirements';
import Dependencies from '@/components/DependencyCards';

/**
 * Component which displays the JSON/ELM/CQL/narrative/Data Requirements content of an individual resource using
 * Mantine tabs. The Data Requirements tab can be optionally rendered via the click of a button.
 * @returns JSON/ELM/CQL/narrative content of the individual resource in a Prism component
 */
export default function ResourceIDPage({ jsonData }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const resourceType = jsonData.resourceType;
  const [dataReqsView, setDataReqsView] = useState('raw');
  const [activeTab, setActiveTab] = useState<string | null>('json');
  const [height, setWindowHeight] = useState(0);
  const [searchValue, setSearchValue] = useState('');
  const [sortedDependencies, setSortedDependencies] = useState<fhir4.RelatedArtifact[]>([]);

  const decodedCql = useMemo(() => {
    return decode('text/cql', jsonData);
  }, [jsonData]);

  const decodedElm = useMemo(() => {
    return decode('application/elm+json', jsonData);
  }, [jsonData]);

  const ctx = trpc.useContext();
  const router = useRouter();
  const authoring = trpc.service.getAuthoring.useQuery();

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
  }, []);

  const { data: dataRequirements } = trpc.service.getDataRequirements.useQuery(
    {
      resourceType: jsonData.resourceType,
      id: jsonData.id as string
    },
    {
      enabled: true,
      retry: 0
    }
  );

  useEffect(() => {
    if (dataRequirements?.relatedArtifact) {
      setSortedDependencies(sortDependencies(dataRequirements.relatedArtifact));
    }
  }, [dataRequirements]);

  const successNotification = (resourceType: string, childArtifact: boolean, idOrUrl?: string) => {
    let message;
    if (childArtifact) {
      message = `Draft of child ${resourceType} artifact of url ${idOrUrl} successfully created`;
    } else {
      message = `Draft of ${resourceType}/${idOrUrl} successfully created`;
    }
    notifications.show({
      title: `${resourceType} Created!`,
      message: message,
      icon: <CircleCheck />,
      color: 'green'
    });
    ctx.draft.getDraftCounts.invalidate();
  };

  const errorNotification = (resourceType: string, errorMessage: string, childArtifact: boolean, idOrUrl?: string) => {
    let message;
    if (childArtifact) {
      message = `Attempt to create draft of child ${resourceType} artifact of url ${idOrUrl} failed with message: ${errorMessage}`;
    } else {
      message = `Attempt to create draft of ${resourceType}/${idOrUrl} failed with message: ${errorMessage}`;
    }
    notifications.show({
      title: `${resourceType} Creation Failed!`,
      message: message,
      icon: <AlertCircle />,
      color: 'red'
    });
  };

  const draftFromArtifactMutation = trpc.service.draftParent.useMutation({
    onSuccess: (data, variables) => {
      successNotification(variables.resourceType, false, variables.id);
      data.children.forEach(c => {
        successNotification(c.resourceType, true, c.url);
      });
      router.push(`/authoring/${resourceType}/${data.draftId}`);
    },
    onError: (e, variables) => {
      errorNotification(variables.resourceType, e.message, false, variables.id);
    }
  });

  const createDraftOfArtifact = () => {
    if (jsonData.id) {
      draftFromArtifactMutation.mutate({ resourceType, id: jsonData.id });
    }
  };

  const clickHandler = () => {
    const filteredDependencies = dataRequirements?.relatedArtifact?.filter(function (dependency) {
      return (
        dependency.display?.toUpperCase().includes(searchValue.toUpperCase()) ||
        dependency.resource?.toUpperCase().includes(searchValue.toUpperCase())
      );
    });
    if (filteredDependencies) {
      setSortedDependencies(sortDependencies(filteredDependencies));
    }
  };

  return (
    <div>
      <Stack spacing="xs">
        <div>
          {authoring.data ? (
            <Group position="apart">
              <Text size="xl" color="gray">
                {jsonData.resourceType}/{jsonData.id}
              </Text>
              {!!jsonData?.extension?.find(
                ext =>
                  ext.url === 'http://hl7.org/fhir/StructureDefinition/artifact-isOwned' && ext.valueBoolean === true
              ) ? (
                <Tooltip label="Child artifacts cannot be directly drafted">
                  <span>
                    <Button w={240} loading={draftFromArtifactMutation.isLoading} disabled={true}>
                      Create Draft of {jsonData.resourceType}
                    </Button>
                  </span>
                </Tooltip>
              ) : (
                <Button
                  w={240}
                  loading={draftFromArtifactMutation.isLoading}
                  onClick={createDraftOfArtifact}
                  disabled={false}
                >
                  Create Draft of {jsonData.resourceType}
                </Button>
              )}
            </Group>
          ) : (
            <></>
          )}
        </div>
        <Divider my="sm" pb={6} />
        <Tabs variant="outline" defaultValue="json" value={activeTab} onTabChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="json">JSON</Tabs.Tab>
            {decodedElm != null && <Tabs.Tab value="elm">ELM</Tabs.Tab>}
            {decodedCql != null && <Tabs.Tab value="cql">CQL</Tabs.Tab>}
            {jsonData.text && <Tabs.Tab value="narrative">Narrative</Tabs.Tab>}
            {dataRequirements?.resourceType === 'Library' && (
              <Tabs.Tab value="data-requirements">Data Requirements</Tabs.Tab>
            )}
            {dataRequirements?.resourceType === 'Library' && <Tabs.Tab value="dependencies">Dependencies</Tabs.Tab>}
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
                  <Text c="dimmed">
                    Number of Requirements:<b> {dataRequirements?.dataRequirement.length} </b>
                  </Text>
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
                  <Space h="md" />
                </>
              )}
              {dataReqsView === 'raw' && (
                <Prism language="json" colorScheme="light">
                  {JSON.stringify(dataRequirements, null, 2)}
                </Prism>
              )}
              <ScrollArea.Autosize mah={height * 0.8} type="always">
                {dataReqsView === 'formatted' &&
                  dataRequirements?.dataRequirement.map((data: fhir4.DataRequirement, index) => (
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
          {sortedDependencies && (
            <Tabs.Panel value="dependencies">
              <Space h="md" />
              <Text c="dimmed">
                Number of Dependencies:<b> {sortedDependencies.length} </b>
              </Text>
              <Space h="md" />
              <Box maw={600} mx="auto">
                <TextInput
                  placeholder="Dependency Name or Resource"
                  label="Search"
                  description="Returns any dependency whose name/resource includes the search value"
                  radius="md"
                  size="sm"
                  onBlur={event => setSearchValue(event.currentTarget.value)}
                />
                <Group position="right" mt="md">
                  <Button onClick={clickHandler}>Submit</Button>
                </Group>
              </Box>
              <Space h="md" />
              <ScrollArea.Autosize mah={height * 0.8} type="hover">
                {sortedDependencies.map(relatedArtifact => (
                  <Dependencies key={relatedArtifact.resource} relatedArtifact={relatedArtifact} />
                ))}
              </ScrollArea.Autosize>
              <Space h="md" />
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
  const encodedLanguage = (jsonData as CRMIShareableLibrary).content?.find(e => e.contentType === link)?.data;
  return encodedLanguage ? Buffer.from(encodedLanguage, 'base64').toString() : null;
}

/**
 * Function that sorts dependencies alphabetically based on their display property. If the
 * dependency is a library/measure, however, it will always take precedence in sorting to ensure all
 * dependencies with links are always shown first
 */
function sortDependencies(relatedArtifacts: fhir4.RelatedArtifact[]) {
  return [...relatedArtifacts].sort((firstElement, secondElement) => {
    const displayFirst = firstElement.display?.toUpperCase();
    const displaySecond = secondElement.display?.toUpperCase();
    const resourceFirst = firstElement.resource?.toUpperCase();
    const resourceSecond = secondElement.resource?.toUpperCase();
    if (displayFirst && displaySecond) {
      if (
        (firstElement.resource?.includes('Library') || firstElement.resource?.includes('Measure')) &&
        (secondElement.resource?.includes('Library') || secondElement.resource?.includes('Measure'))
      ) {
        if (displayFirst < displaySecond) {
          return -1;
        }
        if (displayFirst > displaySecond) {
          return 1;
        }
      }
      if (firstElement.resource?.includes('Library') || firstElement.resource?.includes('Measure')) {
        return 1;
      } else if (secondElement.resource?.includes('Library') || secondElement.resource?.includes('Measure')) {
        return 1;
      }
      if (displayFirst < displaySecond) {
        return -1;
      }
      if (displayFirst > displaySecond) {
        return 1;
      }
      //If a related artifact doesn't have a display property it will instead sort by the resource
    } else if (resourceFirst && resourceSecond) {
      if (resourceFirst < resourceSecond) {
        return -1;
      }
      if (resourceFirst > resourceSecond) {
        return 1;
      }
    }
    return 0;
  });
}

/**
 * Serverside props pulls JSON data of a specified resource to pass to the page before it's sent to browser
 * @returns props for the [resourceType]/[id] page that pass JSON data of a specified resource
 */
export const getServerSideProps: GetServerSideProps<{ jsonData: FhirArtifact }> = async context => {
  const { resourceType, id } = context.query;
  // Fetch resource data
  const res = await fetch(`${process.env.MRS_SERVER}/${resourceType}/${id}`);
  const resource = (await res.json()) as FhirArtifact;
  // pass JSON data to the page via props
  return { props: { jsonData: resource } };
};
