import { ArtifactResourceType, ResourceInfo } from '@/util/types/fhir';
import { ScrollArea, Stack, Text } from '@mantine/core';
import { useEffect, useState } from 'react';
import ResourceInfoCard from './ResourceInfoCard';

interface ResourceButtonsProps {
  resourceInfo: ResourceInfo[];
  resourceType: ArtifactResourceType;
}

/**
 * Component which displays all resources of a specified type and their ids
 * as buttons that link to that resource's page
 */
export default function ResourceButtons({ resourceInfo, resourceType }: ResourceButtonsProps) {
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
      <div>
        <ScrollArea.Autosize
          mah={height * 0.8}
          type="scroll"
          style={{
            textAlign: 'left',
            overflowWrap: 'break-word',
            padding: '10px',
            backgroundColor: '#FFFFFF',
            border: '1px solid',
            borderColor: '#DEE2E6',
            borderRadius: '20px',
            marginTop: '10px',
            marginBottom: '20px',
            marginLeft: '150px',
            marginRight: '150px'
          }}
        >
          {resourceInfo.length > 0 ? ( // if items exist
            <Stack style={{ marginTop: '10px', marginBottom: '10px', marginLeft: '50px', marginRight: '50px' }}>
              {resourceInfo.map(res => {
                return (
                  <div key={res.id}>
                    <ResourceInfoCard resourceInfo={res} />
                  </div>
                );
              })}
            </Stack>
          ) : (
            <Text>
              No <i>{`${resourceType}`}</i> resources available
            </Text>
          )}
        </ScrollArea.Autosize>
      </div>
    </div>
  );
}
