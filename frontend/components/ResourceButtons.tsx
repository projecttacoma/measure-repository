import { ArtifactResourceType } from '@/util/types/fhir';
import { Button } from '@mantine/core';
import Link from 'next/link';

interface ResourceButtonsProps {
  ids: (string | undefined)[];
  resourceType: ArtifactResourceType;
}

/**
 * Component which displays all resources of a specified type and their ids
 * as buttons that link to that resource's page
 */
export default function ResourceButtons({ resourceType, ids }: ResourceButtonsProps) {
  const idItems = ids.map(id => {
    return (
      <Link href={`/${resourceType}/${id}`} key={id}>
        <Button
          fullWidth
          color="cyan"
          radius="md"
          size="md"
          variant="subtle"
          styles={() => ({
            root: {
              padding: '2px'
            },
            inner: {
              justifyContent: 'left'
            }
          })}
        >
          <div>
            {resourceType}/{id}
          </div>
        </Button>
      </Link>
    );
  });
  return (
    <div>
      <div
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
        {idItems.length > 0 ? ( //if items exist
          <ul>{idItems}</ul>
        ) : (
          <text>
            No <i>{`${resourceType}`}</i> resources available
          </text>
        )}
      </div>
    </div>
  );
}
