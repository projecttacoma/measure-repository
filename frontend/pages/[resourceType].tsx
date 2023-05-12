import { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import { Grid, Divider, Button } from '@mantine/core';
import BackButton from '../components/BackButton';
import { ArtifactResourceType, ResourceInfo, FhirArtifact } from '@/util/types/fhir';
import ResourceButtons from '@/components/ResourceButtons';
import Link from 'next/link';

/**
 * Component which displays list of all resources of some type as passed in by (serverside) props
 * @returns component with list of resource (by id) cards that contain buttons that are links to that resource's details
 */
export default function ResourceList({
  resourceInfo,
  resourceType
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <>
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
          <Grid.Col span={5} style={{ paddingTop: '6px' }}>
            <h2
              style={{ color: 'gray', marginTop: '0px', marginBottom: '8px', textAlign: 'center' }}
            >{`Available ${resourceType} Resources`}</h2>
          </Grid.Col>
          <Grid.Col span={1}>
            <Link href={`/search?resourceType=${resourceType}`}>
              <Button color="cyan" radius="md" size="sm">
                Search
              </Button>
            </Link>
          </Grid.Col>
        </Grid>
        <Divider my="md" style={{ marginTop: '14px' }} />
        <ResourceButtons resourceInfo={resourceInfo} resourceType={resourceType} />
      </div>
    </>
  );
}

/**
 * Serverside props pulls id data of a certain resourceType to pass to the page before it's sent to browser
 * @returns props for the [resourceType] page that pass resourceType and ids of resources of that type
 */
export const getServerSideProps: GetServerSideProps<{
  resourceInfo: ResourceInfo[];
  resourceType: ArtifactResourceType;
}> = async context => {
  const { resourceType } = context.query;
  if (typeof resourceType !== 'string') {
    // Should not be called with a non-string value
    throw new Error(`Requested listing of resources for a non-string resourceType: ${resourceType}`);
  }

  // Cast to ArtifactResourceType since we know the server should only support resourceType that matches
  const checkedResourceType = resourceType as ArtifactResourceType;

  // Fetch resource data
  const res = await fetch(`${process.env.NEXT_PUBLIC_MRS_SERVER}/${checkedResourceType}`);
  const bundle = (await res.json()) as fhir4.Bundle<FhirArtifact>;
  if (!bundle.entry) {
    // Measure Repository should not provide a bundle without an entry
    throw new Error('Measure Repository bundle has no entry.');
  }
  const resources = bundle.entry;
  const resourceInfoArray = resources.reduce((acc: ResourceInfo[], entry) => {
    if (entry.resource && entry.resource.id) {
      const identifier = entry.resource.identifier?.[0];
      const resourceInfo: ResourceInfo = {
        resourceType: checkedResourceType,
        id: entry.resource.id,
        identifier: identifier?.system && identifier?.value ? `${identifier.system}|${identifier.value}` : null,
        name: entry.resource.name ?? null,
        url: entry.resource.url ?? null,
        version: entry.resource.version ?? null,
        status: entry.resource.status ?? null
      };
      acc.push(resourceInfo);
    }
    return acc;
  }, []);

  // Pass resource info and type to the page via props
  return { props: { resourceInfo: resourceInfoArray, resourceType: checkedResourceType } };
};
