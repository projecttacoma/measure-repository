import { trpc } from '@/util/trpc';
import { Button, Center, Divider, Grid, Stack, Text, TextInput } from '@mantine/core';
import { useState } from 'react';
import { useRouter } from 'next/router';
import { Prism } from '@mantine/prism';
import { notifications } from '@mantine/notifications';
import { AlertCircle, CircleCheck } from 'tabler-icons-react';
import { ArtifactResourceType } from '@/util/types/fhir';

export default function ResourceAuthoringPage() {
  const router = useRouter();
  const { resourceType, id } = router.query;
  const [url, setUrl] = useState<string | null>(null);
  const [identifier, setIdentifier] = useState<string | null>(null);

  const ctx = trpc.useContext();

  const resourceQuery = trpc.getDraftById.useQuery({
    id: id as string,
    resourceType: resourceType as ArtifactResourceType
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

  function parseUpdate(url: string | null, identifier: string | null) {
    const update: { url?: string; identifier?: fhir4.Identifier } = {};
    if (url != null) {
      update['url'] = url;
    }
    if (identifier != null) {
      const splitIden = identifier.split('|');
      console.log(splitIden);
      if (splitIden.length > 1) {
        update['identifier'] = { system: splitIden[0], value: splitIden[1] };
      } else {
        update['identifier'] = { value: splitIden[0] };
      }
    }
    return update;
  }

  return (
    <div
      style={{
        width: '78vw',
        display: 'flex',
        flexDirection: 'column',
        height: '100%'
      }}
    >
      <Center>
        <Text c="gray" fz="xl">
          {`Editing ${resourceType}/${id}`}
        </Text>
      </Center>
      <Divider my="md" style={{ marginTop: '14px' }} />
      <Grid style={{ flexGrow: 1, justifyContent: 'center', width: '100%' }}>
        <Grid.Col span={6} style={{ height: '100%' }}>
          <Stack spacing="md">
            <TextInput label="url" value={url ?? ''} onChange={e => setUrl(e.target.value)} />
            <TextInput label="identifier" value={identifier ?? ''} onChange={e => setIdentifier(e.target.value)} />
            <Button
              onClick={() =>
                resourceUpdate.mutate({
                  resourceType: resourceType as ArtifactResourceType,
                  id: id as string,
                  draft: parseUpdate(url, identifier)
                })
              }
              style={{ alignSelf: 'flex-end', width: 120 }}
            >
              Submit
            </Button>
          </Stack>
        </Grid.Col>
        <Grid.Col span={6}>
          <Prism language="json" colorScheme="light">
            {resourceQuery.data ? JSON.stringify(resourceQuery.data, null, 2) : ''}
          </Prism>
        </Grid.Col>
      </Grid>
    </div>
  );
}
