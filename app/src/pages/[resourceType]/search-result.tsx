import { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import { Center, Divider, Paper, Text } from '@mantine/core';
import { ArtifactResourceType, FhirArtifact, ResourceInfo } from '@/util/types/fhir';
import ResourceCards from '@/components/ResourceCards';
import { ExternalLink } from 'tabler-icons-react';
import { extractResourceInfo } from '@/util/resourceCardUtils';

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
      <Center>
        <Text c="gray" fz="xl">
          Search Returned{' '}
          <Text display="inline" fw="bold">
            {resourceInfo?.length ?? 0} Results
          </Text>
        </Text>
      </Center>
      <Divider my="md" />
      {resourceInfo ? (
        <Stack align="center" pt={18}>
            <ResourceCards resourceInfo={resourceInfo} resourceType={resourceType} icon={<ExternalLink size="24" />} />
        </Stack>
      ) : (
        <div
          style={{
            padding: '48px'
          }}
        >
          <Paper p="lg" radius="md" withBorder>
            <Text color="red">
              {resourceType} Search Error: {error}
            </Text>
          </Paper>
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
        const resourceInfo = extractResourceInfo(entry.resource);
        acc.push(resourceInfo);
      }
      return acc;
    }, []);
    // Pass ids and type to the page via props
    return { props: { resourceInfo: resourceInfoArray, resourceType: checkedResourceType } };
  }
};
