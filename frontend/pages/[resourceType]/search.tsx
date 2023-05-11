import { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import { ArtifactResourceType } from '@/util/types/fhir';
import { Divider, Group, Stack, Text } from '@mantine/core';
import BackButton from '@/components/BackButton';
import SearchComponent from '@/components/SearchComponent';

export default function ResourceSearchPage({ resourceType }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <div>
      <Stack spacing="xs">
        <div>
          <Group>
            <BackButton />
            <Text size="xl" weight={700} color="gray">
              {resourceType} Search
            </Text>
          </Group>
        </div>
        <Divider my="sm" style={{ paddingBottom: '6px' }} />
        <SearchComponent resourceType={resourceType} />
      </Stack>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps<{
  resourceType: ArtifactResourceType;
}> = async context => {
  const { resourceType } = context.query;
  if (typeof resourceType != 'string') {
    // Should not be called with a non-string value
    throw new Error(`Requested listing of resources for a non-string resourceType: ${resourceType}`);
  }

  // Cast to ArtifactResourceType since we know the server should only support resourceType that matches
  const checkedResourceType = resourceType as ArtifactResourceType;

  // Pass type to the page via props
  return { props: { resourceType: checkedResourceType } };
};
