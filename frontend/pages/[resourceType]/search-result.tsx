import BackButton from '@/components/BackButton';
import { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import { Divider, Grid } from '@mantine/core';
import { ArtifactResourceType } from '@/util/types/fhir';
import ResourceButtons from '@/components/ResourceButtons';

export default function ResourceSearchResultsPage({
  ids,
  resourceType
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
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
          <h2 style={{ color: 'gray', marginTop: '0px', marginBottom: '8px' }}>Search Results</h2>
        </Grid.Col>
      </Grid>
      <Divider my="md" style={{ marginTop: '14px' }} />
      <ResourceButtons resourceType={resourceType} ids={ids}></ResourceButtons>
    </div>
  );
}

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

  const url = context.resolvedUrl.split('search-result')[1];
  const res = await fetch(`${process.env.NEXT_PUBLIC_MRS_SERVER}/${resourceType}${url}`);
  const bundle = (await res.json()) as fhir4.Bundle;
  if (!bundle.entry) {
    // Measure Repository should not provide a bundle without an entry
    throw new Error('Measure Repository search set bundle has no entry.');
  }
  const ids = bundle.entry.map(entry => entry.resource?.id);

  // Pass ids and type to the page via props
  return { props: { ids: ids, resourceType: checkedResourceType } };
};
