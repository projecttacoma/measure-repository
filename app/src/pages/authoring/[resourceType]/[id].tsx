import BackButton from '@/components/BackButton';
import { trpc } from '@/util/trpc';
import { Button, Divider, Grid, Stack, TextInput } from '@mantine/core';
import { useState } from 'react';
import { useRouter } from 'next/router';
import { Prism } from '@mantine/prism';
import { notifications } from '@mantine/notifications';
import { AlertCircle, CircleCheck } from 'tabler-icons-react';

export default function ResourceAuthoringPage() {
  const router = useRouter();
  const { resourceType, id } = router.query;
  const [url, setUrl] = useState<string | null>(null);
  const [identifier, setIdentifier] = useState<string | null>(null);

  const ctx = trpc.useContext();

  const resourceQuery = trpc.getDraftById.useQuery({
    id: id as string,
    resourceType: resourceType as 'Measure' | 'Library'
  });

  const resourceUpdate = trpc.updateDraft.useMutation({
    onSuccess: () => {
      notifications.show({
        title: 'Update Successful!',
        message: `${resourceType} Successfully Updated`,
        icon: <CircleCheck />,
        color: 'green'
      });
      ctx.getDraftById.invalidate();
    },
    onError: e => {
      notifications.show({
        title: 'Update Failed!',
        message: `Attempt to update ${resourceType} failed with message: ${e.message}`,
        icon: <AlertCircle />,
        color: 'red'
      });
    }
  });

  return (
    <div
      style={{
        width: '78vw',
        display: 'flex',
        flexDirection: 'column',
        height: '100%'
      }}
    >
      <Grid columns={7}>
        <Grid.Col offset={0} span={1}>
          <div>
            <BackButton />
          </div>
        </Grid.Col>
        <Grid.Col span={5} style={{ paddingTop: '6px' }}>
          <h2 style={{ color: 'gray', marginTop: '0px', marginBottom: '8px', textAlign: 'center' }}>
            {`Editing ${resourceType}/${id}`}
          </h2>
        </Grid.Col>
        <Grid.Col span={1}></Grid.Col>
      </Grid>
      <Divider my="md" style={{ marginTop: '14px' }} />
      <Grid columns={2} style={{ flexGrow: 1, justifyContent: 'center', width: '100%' }}>
        <Grid.Col span={1} style={{ height: '100%' }}>
          <Stack spacing="md">
            <TextInput label="url" value={url ?? ''} onChange={e => setUrl(e.target.value)} />
            <TextInput label="identifier" value={identifier ?? ''} onChange={e => setIdentifier(e.target.value)} />
            <Button
              onClick={() =>
                resourceUpdate.mutate({
                  resourceType: resourceType as 'Measure' | 'Library',
                  id: id as string,
                  draft: {
                    ...(url != null ? { url } : undefined),
                    ...(identifier != null ? { identifier } : undefined)
                  }
                })
              }
              style={{ alignSelf: 'flex-end', width: 120 }}
            >
              Submit
            </Button>
          </Stack>
        </Grid.Col>
        <Grid.Col span={1}>
          <Prism language="json" colorScheme="light">
            {resourceQuery.data ? JSON.stringify(resourceQuery.data, null, 2) : ''}
          </Prism>
        </Grid.Col>
      </Grid>
    </div>
  );
}
