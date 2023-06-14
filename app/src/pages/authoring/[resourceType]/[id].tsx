import { trpc } from '@/util/trpc';
import { Button, Center, Divider, Grid, Paper, Stack, Text, TextInput, createStyles } from '@mantine/core';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Prism } from '@mantine/prism';
import { notifications } from '@mantine/notifications';
import { AlertCircle, CircleCheck } from 'tabler-icons-react';
import { ArtifactResourceType } from '@/util/types/fhir';

const useStyles = createStyles(() => ({
  json: {
    maxHeight: 'calc(100vh - 150px)',
    overflowY: 'scroll'
  }
}));

export default function ResourceAuthoringPage() {
  const { classes } = useStyles();
  const router = useRouter();
  const { resourceType, id } = router.query;

  const [url, setUrl] = useState('');
  const [identifier, setIdentifier] = useState('');

  const ctx = trpc.useContext();

  const { data: resource } = trpc.draft.getDraftById.useQuery({
    id: id as string,
    resourceType: resourceType as ArtifactResourceType
  });

  // useEffect to check if it has an identifier and url
  useEffect(() => {
    if (resource?.url) {
      setUrl(resource.url);
    }
    if (resource?.identifier) {
      const cmsIdentifier = resource.identifier.find(
        identifier => identifier.system === 'http://hl7.org/fhir/cqi/ecqm/Measure/Identifier/cms'
      );
      if (cmsIdentifier?.value) {
        setIdentifier(cmsIdentifier.value);
      } else if (resource.identifier[0].value) {
        setIdentifier(resource.identifier[0].value);
      }
    }
  }, [resource]);

  const resourceUpdate = trpc.draft.updateDraft.useMutation({
    onSuccess: () => {
      notifications.show({
        title: 'Update Successful!',
        message: `${resourceType} Successfully Updated`,
        icon: <CircleCheck />,
        color: 'green'
      });
      ctx.draft.getDraftById.invalidate();
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

  function parseUpdate(url: string, identifier: string) {
    const update: { url?: string; identifier?: fhir4.Identifier[] } = {};
    if (url !== '') {
      update['url'] = url;
    }
    if (identifier !== '') {
      const splitIden = identifier.split('|');
      if (splitIden.length > 1) {
        update['identifier'] = [{ system: splitIden[0], value: splitIden[1] }];
      } else {
        update['identifier'] = [{ value: splitIden[0] }];
      }
    }

    return update;
  }

  return (
    <div>
      <Center>
        <Text c="gray" fz="xl">
          {`Editing ${resourceType}/${id}`}
        </Text>
      </Center>
      <Divider my="md" style={{ marginTop: '14px' }} />
      <Grid>
        <Grid.Col span={6}>
          <Stack spacing="md">
            <TextInput label="url" value={url} onChange={e => setUrl(e.target.value)} />
            <TextInput label="identifier" value={identifier} onChange={e => setIdentifier(e.target.value)} />
            <Button
              w={120}
              onClick={() =>
                resourceUpdate.mutate({
                  resourceType: resourceType as ArtifactResourceType,
                  id: id as string,
                  draft: parseUpdate(url, identifier)
                })
              }
              disabled={identifier === '' && url === ''}
            >
              Submit
            </Button>
          </Stack>
        </Grid.Col>
        <Grid.Col span={6}>
          <Paper withBorder>
            <div className={classes.json}>
              <Prism language="json" colorScheme="light">
                {resource ? JSON.stringify(resource, null, 2) : ''}
              </Prism>
            </div>
          </Paper>
        </Grid.Col>
      </Grid>
    </div>
  );
}
