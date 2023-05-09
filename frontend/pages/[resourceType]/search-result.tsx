import BackButton from '@/components/BackButton';
import { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import { Divider, Grid, Text } from '@mantine/core';
import { ArtifactResourceType, FhirArtifact, ResourceInfo } from '@/util/types/fhir';
import ResourceButtons from '@/components/ResourceButtons';

export default function ResourceSearchResultsPage({
  resourceInfo,
  resourceType,
  error
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
      {resourceInfo ? (
        <ResourceButtons resourceType={resourceType} resourceInfo={resourceInfo}></ResourceButtons>
      ) : (
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
          <Text color="red">
            {resourceType} Search Error: {error}
          </Text>
        </div>
      )}
    </div>
  );
}

export const getServerSideProps: GetServerSideProps<{
  resourceInfo?: ResourceInfo[];
  resourceType: ArtifactResourceType;
  error?: string;
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
  const json = await res.json();

  if (json.resourceType === 'OperationOutcome') {
    const error = json.issue[0].details.text;
    // Pass type and error to the page via props
    return { props: { resourceType: checkedResourceType, error: error } };
  } else {
    const bundle = json as fhir4.Bundle<FhirArtifact>;
    if (!bundle.entry) {
      // Measure Repository should not provide a bundle without an entry
      throw new Error('Measure Repository search set bundle has no entry.');
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
    // Pass ids and type to the page via props
    return { props: { resourceInfo: resourceInfoArray, resourceType: checkedResourceType } };
  }
};
