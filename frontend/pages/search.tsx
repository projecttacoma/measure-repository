import BackButton from '@/components/BackButton';
import SearchComponent from '@/components/SearchComponent';
import { ArtifactSearchParams } from '@/util/searchParams';
import { ArtifactResourceType } from '@/util/types/fhir';
import { Divider, Group, Stack, Tabs, Text } from '@mantine/core';
import { useRouter } from 'next/router';
import { useState } from 'react';

export default function SearchPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string | null>(
    router.query.resourceType ? (router.query.resourceType as string) : 'Measure'
  );

  const ResourceTabGroup = () => {
    const resourceTabs = Object.keys(ArtifactSearchParams).map(resource => (
      <Tabs.Tab value={resource} key={resource}>
        {resource}
      </Tabs.Tab>
    ));
    return (
      <div>
        <Stack spacing="xs">
          <div>
            <Group>
              <BackButton />
              <Text size="xl" weight={700} color="gray">
                Search
              </Text>
            </Group>
          </div>
          <Divider my="sm" style={{ paddingBottom: '6px' }} />
          <Tabs.List>{resourceTabs}</Tabs.List>
        </Stack>
      </div>
    );
  };

  const ResourcePanelGroup = () => {
    const resourcePanels = (Object.keys(ArtifactSearchParams) as ArtifactResourceType[]).map(resource => (
      <Tabs.Panel value={resource} key={resource}>
        <Stack style={{ paddingTop: '20px' }}>
          <SearchComponent resourceType={resource} />
        </Stack>
      </Tabs.Panel>
    ));
    return (
      <Tabs variant="outline" value={activeTab} onTabChange={setActiveTab}>
        <ResourceTabGroup />
        {resourcePanels}
      </Tabs>
    );
  };

  return <ResourcePanelGroup />;
}
