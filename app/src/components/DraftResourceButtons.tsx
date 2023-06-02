import { Text, Paper, Stack, Center, Loader } from '@mantine/core';
import { trpc } from '@/util/trpc';
import SidebarButtonList from './SidebarButtonList';

/**
 * Component which retrieves all resources and their counts and translates them into buttons and adds
 * a search button that links to the overall search page
 */
function DraftResourceButtons() {
  const {
    data: resourceCounts,
    error: artifactCountError,
    isLoading: artifactCountLoading
  } = trpc.draft.getDraftCounts.useQuery();

  if (artifactCountLoading) {
    return (
      <Center>
        <Loader />
      </Center>
    );
  }

  return (
    <Stack spacing="xs">
      {artifactCountError ? (
        <div
          style={{
            padding: '24px'
          }}
        >
          <Paper p="xl" radius="md" withBorder>
            <Text c="red">
              Resources could not be displayed due to an error retrieving them from the server: &quot;
              {artifactCountError.message}&quot;
            </Text>
          </Paper>
        </div>
      ) : resourceCounts ? (
        <SidebarButtonList routePrefix="/authoring" buttonData={resourceCounts} />
      ) : null}
    </Stack>
  );
}

export default DraftResourceButtons;
