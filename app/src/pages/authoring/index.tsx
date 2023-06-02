import { Button, Center, Paper, SegmentedControl, Stack, Title, createStyles } from '@mantine/core';
import { v4 as uuidv4 } from 'uuid';
import { useState } from 'react';
import { trpc } from '../../util/trpc';
import { MeasureSkeleton, LibrarySkeleton } from '@/util/authoringFixtures';
import { useRouter } from 'next/router';
import { notifications } from '@mantine/notifications';
import { AlertCircle, CircleCheck } from 'tabler-icons-react';
import { ArtifactResourceType } from '@/util/types/fhir';

const useStyles = createStyles(theme => ({
  centeredContainer: {
    height: '100%'
  }
}));

export default function AuthoringPage() {
  const [resourceType, setResourceType] = useState<ArtifactResourceType>('Measure');

  const ctx = trpc.useContext();
  const { classes } = useStyles();

  const draftMutation = trpc.draft.createDraft.useMutation({
    onSuccess: data => {
      notifications.show({
        title: `${resourceType} Created!`,
        message: `${resourceType} successfully created`,
        icon: <CircleCheck />,
        color: 'green'
      });
      router.push(`authoring/${resourceType}/${data.draftId}`);
      ctx.draft.getDraftCounts.invalidate();
    },
    onError: e => {
      notifications.show({
        title: `${resourceType} Creation Failed!`,
        message: `Attempt to create ${resourceType} failed with message: ${e.message}`,
        icon: <AlertCircle />,
        color: 'red'
      });
    }
  });

  const router = useRouter();

  const createResource = () => {
    const newResource = resourceType === 'Measure' ? { ...MeasureSkeleton } : { ...LibrarySkeleton };
    newResource.id = uuidv4();
    draftMutation.mutate({ resourceType, draft: newResource });
  };

  return (
    <Center className={classes.centeredContainer}>
      <Paper h={500} w={500} p={48} withBorder shadow="lg">
        <Stack>
          <SegmentedControl
            value={resourceType}
            onChange={val => setResourceType(val as ArtifactResourceType)}
            data={[
              { label: 'Measure', value: 'Measure' },
              { label: 'Library', value: 'Library' }
            ]}
          />
          <Title order={3}>Start From Scratch:</Title>
          <Button w={240} loading={draftMutation.isLoading} onClick={createResource}>
            {`Create New Draft ${resourceType}`}
          </Button>
        </Stack>
      </Paper>
    </Center>
  );
}
