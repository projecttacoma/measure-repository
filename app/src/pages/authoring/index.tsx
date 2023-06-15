import {
  Button,
  Center,
  Paper,
  SegmentedControl,
  Select,
  Stack,
  Text,
  Title,
  createStyles,
  Loader
} from '@mantine/core';
import { v4 as uuidv4 } from 'uuid';
import { useState } from 'react';
import { trpc } from '../../util/trpc';
import { MeasureSkeleton, LibrarySkeleton } from '@/util/authoringFixtures';
import { useRouter } from 'next/router';
import { notifications } from '@mantine/notifications';
import { AlertCircle, CircleCheck } from 'tabler-icons-react';
import { ArtifactResourceType } from '@/util/types/fhir';

const useStyles = createStyles(() => ({
  centeredContainer: {
    height: '100%'
  }
}));

export default function AuthoringPage() {
  const [resourceType, setResourceType] = useState<ArtifactResourceType>('Measure');
  const [selectedArtifact, setSelectedArtifact] = useState<string | null>(null);

  const {
    data: artifacts,
    isLoading: artifactsLoading,
    error: artifactError
  } = trpc.service.getArtifactsByType.useQuery({ resourceType });

  const ctx = trpc.useContext();
  const { classes } = useStyles();

  const successNotification = (data: { draftId: string }, createdFromArtifact: boolean) => {
    const message = createdFromArtifact
      ? `Draft ${resourceType} successfully created from ${resourceType}/${selectedArtifact}`
      : `${resourceType} successfully created`;
    notifications.show({
      title: `${resourceType} Created!`,
      message: message,
      icon: <CircleCheck />,
      color: 'green'
    });
    router.push(`authoring/${resourceType}/${data.draftId}`);
    ctx.draft.getDraftCounts.invalidate();
  };

  const errorNotification = (errorMessage: string, createdFromArtifact: boolean) => {
    const message = createdFromArtifact
      ? `Attempt to create draft ${resourceType} from ${resourceType}/${selectedArtifact} failed with message: ${errorMessage}`
      : `Attempt to create ${resourceType} failed with message: ${errorMessage}`;
    notifications.show({
      title: `${resourceType} Creation Failed!`,
      message: message,
      icon: <AlertCircle />,
      color: 'red'
    });
  };

  const draftMutation = trpc.draft.createDraft.useMutation({
    onSuccess: data => {
      successNotification(data, false);
    },
    onError: e => {
      errorNotification(e.message, false);
    }
  });

  const draftFromArtifactMutation = trpc.service.convertArtifactById.useMutation({
    onSuccess: data => {
      successNotification(data, true);
    },
    onError: e => {
      errorNotification(e.message, true);
    }
  });

  const router = useRouter();

  const createResource = () => {
    const newResource = resourceType === 'Measure' ? { ...MeasureSkeleton } : { ...LibrarySkeleton };
    newResource.id = uuidv4();
    draftMutation.mutate({ resourceType, draft: newResource });
  };

  const createDraftArtifactOf = () => {
    if (selectedArtifact !== null) {
      draftFromArtifactMutation.mutate({ resourceType, id: selectedArtifact });
    }
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
          <Title order={3}>Start From an Existing {resourceType}:</Title>
          {artifactsLoading ? (
            <Loader />
          ) : artifactError ? (
            <Text c="red">Artifacts could not be displayed due to an error: {artifactError.message}</Text>
          ) : artifacts?.length === 0 ? (
            <Text c="red">There are no {resourceType} artifacts in the repository at this time</Text>
          ) : artifacts ? (
            <Select
              label={`Select an existing ${resourceType} to create a draft from`}
              data={artifacts}
              value={selectedArtifact}
              onChange={setSelectedArtifact}
            />
          ) : (
            <Text c="red">An unknown error occurred fetching artifacts</Text>
          )}
          <Button
            w={240}
            loading={draftFromArtifactMutation.isLoading}
            onClick={createDraftArtifactOf}
            disabled={!selectedArtifact}
          >
            Create Draft of {resourceType}
          </Button>
        </Stack>
      </Paper>
    </Center>
  );
}
