import { trpc } from '@/util/trpc';
import { ActionIcon, Button, Center, Divider, Grid, Paper, Stack, Text, TextInput } from '@mantine/core';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Prism } from '@mantine/prism';
import { notifications } from '@mantine/notifications';
import { AlertCircle, CircleCheck, X } from 'tabler-icons-react';
import { ArtifactResourceType } from '@/util/types/fhir';

export default function ResourceAuthoringPage() {
  const router = useRouter();
  const { resourceType, id } = router.query;

  const [url, setUrl] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const ctx = trpc.useContext();

  const { data: resource } = trpc.draft.getDraftById.useQuery({
    id: id as string,
    resourceType: resourceType as ArtifactResourceType
  });

  // useEffect to check if the resource has any fields already defined
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
    if (resource?.name) {
      setName(resource.name);
    }
    if (resource?.title) {
      setTitle(resource.title);
    }
    if (resource?.description) {
      setDescription(resource.description);
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

  function parseUpdate(url: string, identifier: string, name: string, title: string, description: string) {
    const additions: {
      url?: string;
      identifier?: fhir4.Identifier[];
      name?: string;
      title?: string;
      description?: string;
    } = {};

    const deletions: {
      url?: string;
      identifier?: fhir4.Identifier[];
      name?: string;
      title?: string;
      description?: string;
    } = {};

    if (url !== '') {
      additions['url'] = url;
    } else {
      deletions['url'] = '';
    }
    if (identifier !== '') {
      const splitIden = identifier.split('|');
      if (splitIden.length > 1) {
        additions['identifier'] = [{ system: splitIden[0], value: splitIden[1] }];
      } else {
        additions['identifier'] = [{ value: splitIden[0] }];
      }
    } else {
      deletions['identifier'] = [{ system: '', value: '' }];
    }
    if (name !== '') {
      additions['name'] = name;
    } else {
      deletions['name'] = '';
    }
    if (title !== '') {
      additions['title'] = title;
    } else {
      deletions['title'] = '';
    }
    if (description !== '') {
      additions['description'] = description;
    } else {
      deletions['description'] = '';
    }

    return [additions, deletions];
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
            <TextInput
              label="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              rightSection={
                <ActionIcon
                  onClick={() => {
                    setUrl('');
                  }}
                >
                  <X />
                </ActionIcon>
              }
            />
            <TextInput
              label="identifier"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              rightSection={
                <ActionIcon
                  onClick={() => {
                    setIdentifier('');
                  }}
                >
                  <X />
                </ActionIcon>
              }
            />
            <TextInput
              label="name"
              value={name}
              onChange={e => setName(e.target.value)}
              rightSection={
                <ActionIcon
                  onClick={() => {
                    setName('');
                  }}
                >
                  <X />
                </ActionIcon>
              }
            />
            <TextInput
              label="title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              rightSection={
                <ActionIcon
                  onClick={() => {
                    setTitle('');
                  }}
                >
                  <X />
                </ActionIcon>
              }
            />
            <TextInput
              label="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rightSection={
                <ActionIcon
                  onClick={() => {
                    setDescription('');
                  }}
                >
                  <X />
                </ActionIcon>
              }
            />
            <Button
              w={120}
              onClick={() => {
                const [additions, deletions] = parseUpdate(url, identifier, name, title, description);
                resourceUpdate.mutate({
                  resourceType: resourceType as ArtifactResourceType,
                  id: id as string,
                  additions: additions,
                  deletions: deletions
                });
              }}
            >
              Submit
            </Button>
          </Stack>
        </Grid.Col>
        <Grid.Col span={6}>
          <Paper withBorder>
            <Prism language="json" colorScheme="light" styles={{ scrollArea: { height: 'calc(100vh - 150px)' } }}>
              {resource ? JSON.stringify(resource, null, 2) : ''}
            </Prism>
          </Paper>
        </Grid.Col>
      </Grid>
    </div>
  );
}
