import { ArtifactResourceType, ResourceInfo } from '@/util/types/fhir';
import { Center, ScrollArea, Stack, Text } from '@mantine/core';
import { useEffect, useState } from 'react';
import ResourceInfoCard from './ResourceInfoCard';

interface ResourceCardsProps {
  resourceInfo: ResourceInfo[];
  resourceType: ArtifactResourceType;
  authoring?: boolean;
}

/**
 * Component which displays all resources of a specified type and their ids
 * as resource cards that link to that resource's page
 */
export default function ResourceCards({ resourceInfo, resourceType, authoring }: ResourceCardsProps) {
  const [height, setWindowHeight] = useState(0);
  useEffect(() => {
    const handleResize = () => {
      setWindowHeight(window.innerHeight);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div>
      <ScrollArea.Autosize mah={height * 0.8} type="scroll">
        {resourceInfo?.length > 0 ? (
          <Center>
            <Stack align="stretch">
              {resourceInfo.map(res => {
                return (
                  <div key={res.id}>
                    <ResourceInfoCard resourceInfo={res} authoring={authoring} />
                  </div>
                );
              })}
            </Stack>
          </Center>
        ) : (
          <Center>
            <Text>
              No <i>{resourceType}</i> resources available
            </Text>
          </Center>
        )}
      </ScrollArea.Autosize>
    </div>
  );
}
