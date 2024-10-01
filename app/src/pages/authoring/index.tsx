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

  const utils = trpc.useUtils();
  const { classes } = useStyles();
  const router = useRouter();

  const successNotification = (
    resourceType: string,
    createdFromArtifact: boolean,
    childArtifact: boolean,
    idOrUrl?: string
  ) => {
    let message;
    if (childArtifact) {
      message = `Draft of child ${resourceType} artifact of url ${idOrUrl} successfully created`;
    } else if (createdFromArtifact) {
      message = `Draft of ${resourceType}/${idOrUrl} successfully created`;
    } else {
      `${resourceType} successfully created`;
    }
    notifications.show({
      title: `${resourceType} Created!`,
      message: message,
      icon: <CircleCheck />,
      color: 'green'
    });
    utils.draft.getDraftCounts.invalidate();
  };

  const errorNotification = (
    resourceType: string,
    errorMessage: string,
    createdFromArtifact: boolean,
    childArtifact: boolean,
    idOrUrl?: string
  ) => {
    let message;
    if (childArtifact) {
      message = `Attempt to create draft of child ${resourceType} artifact of url ${idOrUrl} failed with message: ${errorMessage}`;
    } else if (createdFromArtifact) {
      message = `Attempt to create draft of ${resourceType}/${idOrUrl} failed with message: ${errorMessage}`;
    } else {
      message = `Attempt to create ${resourceType} failed with message: ${errorMessage}`;
    }
    notifications.show({
      title: `${resourceType} Creation Failed!`,
      message: message,
      icon: <AlertCircle />,
      color: 'red'
    });
  };

  const draftMutation = trpc.draft.createDraft.useMutation({
    onSuccess: (data, variables) => {
      successNotification(variables.resourceType, false, false);
      router.push(`authoring/${resourceType}/${data.draftId}`);
    },
    onError: (e, variables) => {
      errorNotification(variables.resourceType, e.message, false, false);
    }
  });

  const draftFromArtifactMutation = trpc.service.draftParent.useMutation({
    onSuccess: (data, variables) => {
      successNotification(variables.resourceType, true, false, variables.id);
      data.children.forEach(c => {
        successNotification(c.resourceType, true, true, c.url);
      });
      router.push(`authoring/${resourceType}/${data.draftId}`);
    },
    onError: (e, variables) => {
      errorNotification(variables.resourceType, e.message, true, false, variables.id);
    }
  });

  const createResource = () => {
    // TODO: randomize skeleton url or increment draft version so a user can make a number of skeleton drafts without having a url/version conflict
    const newResource = resourceType === 'Measure' ? { ...MeasureSkeleton } : { ...LibrarySkeleton };
    draftMutation.mutate({ resourceType, draft: newResource });
  };

  const createDraftArtifact = () => {
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
            onChange={val => {
              setResourceType(val as ArtifactResourceType);
              setSelectedArtifact(null);
            }}
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
              placeholder={resourceType === 'Library' ? 'Choose an independent (non-child) Library' : ''}
            />
          ) : (
            <Text c="red">An unknown error occurred fetching artifacts</Text>
          )}
          <Button
            w={240}
            loading={draftFromArtifactMutation.isLoading}
            onClick={createDraftArtifact}
            disabled={!artifacts || !selectedArtifact}
          >
            Create Draft of {resourceType}
          </Button>
        </Stack>
      </Paper>
    </Center>
  );
}
