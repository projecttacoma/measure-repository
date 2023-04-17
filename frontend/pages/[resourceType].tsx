import { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import { Button, Grid, Divider } from '@mantine/core';
import Link from 'next/link';
import BackButton from '../components/BackButton';
import { ArtifactResourceType } from '@/util/types/fhir';

/**
 * Component which displays list of all resources of some type as passed in by (serverside) props
 * @returns component with list of resource (by id) buttons that are links to that resource's details
 */
export default function ResourceList({ ids, resourceType }: InferGetServerSidePropsType<typeof getServerSideProps>) {
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
    <div
      style={{
        width: '78vw'
      }}
    >
      <Grid columns={7}>
        <Grid.Col offset={0} span={1}>
          <div>
            <BackButton />
          </div>
        </Grid.Col>
        <Grid.Col offset={2} span={2} style={{ paddingTop: '6px' }}>
          <h2 style={{ color: 'gray', marginTop: '0px', marginBottom: '8px' }}>{`${resourceType} IDs`}</h2>
        </Grid.Col>
      </Grid>
      <Divider my="md" style={{ marginTop: '14px' }} />
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
    </div>
  );
}

/**
 * Serverside props pulls id data of a certain resourceType to pass to the page before it's sent to browser
 * @returns props for the [resourceType] page that pass resourceType and ids of resources of that type
 */
export const getServerSideProps: GetServerSideProps<{
  ids: (string | undefined)[];
  resourceType: ArtifactResourceType;
}> = async context => {
  const { resourceType } = context.query;
  if (typeof resourceType != 'string') {
    // Should not be called with a non-string value
    throw new Error(`Requested listing of resources for a non-string resourceType: ${resourceType}`);
  }

  // Cast to ArtifactResourceType since we know the server should only support resourceType that matches
  const checkedResourceType = resourceType as ArtifactResourceType;

  // Fetch resource data
  const res = await fetch(`${process.env.NEXT_PUBLIC_MRS_SERVER}/${checkedResourceType}`);
  const bundle = (await res.json()) as fhir4.Bundle;
  if (!bundle.entry) {
    // Measure Repository should not provide a bundle without an entry
    throw new Error('Measure Repository bundle has no entry.');
  }
  const ids = bundle.entry.map(entry => entry.resource?.id);

  // Pass ids and type to the page via props
  return { props: { ids: ids, resourceType: checkedResourceType } };
};
