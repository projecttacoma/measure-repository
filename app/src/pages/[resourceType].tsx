import { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import { Text, Divider, Button, Center, Stack } from '@mantine/core';
import { ArtifactResourceType, ResourceInfo, FhirArtifact } from '@/util/types/fhir';
import ResourceCards from '@/components/ResourceCards';
import Link from 'next/link';
import { extractResourceInfo } from '@/util/resourceCardUtils';

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
      <div>
        <Center>
          <Text c="gray" fz="xl">
            Available {resourceType} Resources
          </Text>
        </Center>
        <Divider my="md" />
        <Stack align="center">
          <Link href={`/search?resourceType=${resourceType}&authoring=false`}>
            <Button>Search</Button>
          </Link>
          <div style={{ paddingTop: '18px' }}>
            <ResourceCards resourceInfo={resourceInfo} resourceType={resourceType} authoring={false} />
          </div>
        </Stack>
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

  // Fetch resource data with the _elements parameter so we only get the elements that we need
  const [artifactBundleActive, artifactBundleRetired] = await Promise.all([
    fetch(
      `${process.env.MRS_SERVER}/${checkedResourceType}?_elements=id,extension,identifier,name,url,version&status=active`
    ),
    fetch(
      `${process.env.MRS_SERVER}/${checkedResourceType}?_elements=id,extension,identifier,name,url,version&status=retired`
    )
  ]).then(([resArtifactsActive, resArtifactsRetired]) =>
    Promise.all([
      resArtifactsActive.json() as Promise<fhir4.Bundle<FhirArtifact>>,
      resArtifactsRetired.json() as Promise<fhir4.Bundle<FhirArtifact>>
    ])
  );

  if (!artifactBundleActive.entry || !artifactBundleRetired.entry) {
    // Measure Repository should not provide a bundle without an entry
    throw new Error('Measure Repository bundle has no entry.');
  }

  const resources = artifactBundleActive.entry.concat(artifactBundleRetired.entry);
  resources.sort((a, b) => {
    const strA = `${a.resource?.url}|${a.resource?.version}`;
    const strB = `${b.resource?.url}|${b.resource?.version}`;
    return strA.localeCompare(strB);
  });
  const resourceInfoArray = resources.reduce((acc: ResourceInfo[], entry) => {
    if (entry.resource && entry.resource.id) {
      const resourceInfo = extractResourceInfo(entry.resource);
      acc.push(resourceInfo);
    }
    return acc;
  }, []);

  // Pass resource info and type to the page via props
  return { props: { resourceInfo: resourceInfoArray, resourceType: checkedResourceType } };
};
