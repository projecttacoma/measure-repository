import { Button, Group, Radio, Title } from '@mantine/core';
import { v4 as uuidv4 } from 'uuid';
import { useState } from 'react';
import { trpc } from '../../util/trpc';
import { MeasureSkeleton, LibrarySkeleton } from '@/util/authoringFixtures';
import { useRouter } from 'next/router';
import { notifications } from '@mantine/notifications';
import { AlertCircle, CircleCheck } from 'tabler-icons-react';

export default function AuthoringPage() {
  const [resourceType, setResourceType] = useState<'Measure' | 'Library'>('Measure');
  const draftMutation = trpc.createDraft.useMutation({
    onSuccess: data => {
      notifications.show({
        title: `${resourceType} Created!`,
        message: `${resourceType} successfully created`,
        icon: <CircleCheck />,
        color: 'green'
      });
      router.push(`authoring/${resourceType}/${data.draftId}`);
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
    <Group
      spacing="lg"
      position="left"
      style={{
        flexDirection: 'column',
        width: '100%',
        alignItems: 'flex-start',
        justifyContent: 'flex-start'
      }}
    >
      <Radio.Group
        label="Resource Type"
        value={resourceType}
        onChange={val => setResourceType(val as 'Measure' | 'Library')}
      >
        <Group>
          <Radio label="Measure" value="Measure" />
          <Radio label="Library" value="Library" />
        </Group>
      </Radio.Group>
      <Title order={3}>Start From Scratch:</Title>
      <Button loading={draftMutation.isLoading} onClick={createResource}>
        {`Create New Draft ${resourceType}`}
      </Button>
    </Group>
  );
}
