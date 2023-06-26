import { trpc } from '@/util/trpc';
import { Button, Center, Divider, Grid, Paper, Stack, Text } from '@mantine/core';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Prism } from '@mantine/prism';
import { notifications } from '@mantine/notifications';
import { AlertCircle, CircleCheck } from 'tabler-icons-react';
import { ArtifactResourceType } from '@/util/types/fhir';
import ArtifactFieldInput from '@/components/ArtifactFieldInput';

interface DraftArtifactUpdates {
  url?: string;
  identifier?: fhir4.Identifier[];
  name?: string;
  title?: string;
  description?: string;
}

export default function ResourceAuthoringPage() {
  const router = useRouter();
  const { resourceType, id } = router.query;

  const [url, setUrl] = useState('');
  const [identifierValue, setIdentifierValue] = useState('');
  const [identifierSystem, setIdentifierSystem] = useState('');
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const ctx = trpc.useContext();

  const { data: resource } = trpc.draft.getDraftById.useQuery({
    id: id as string,
    resourceType: resourceType as ArtifactResourceType
  });

  // checks if the field inputs have been changed by the user by checking
  // that they are different from the saved field values on the draft artifact
  // if the input is undefined on the draft artifact, then it is treated as
  // an empty string
  const isChanged = () => {
    let savedIdentifierValue = '';
    let savedIdentifierSystem = '';
    if (resource?.identifier) {
      const cmsIdentifier = resource.identifier.find(
        identifier => identifier.system === 'http://hl7.org/fhir/cqi/ecqm/Measure/Identifier/cms'
      );
      if (cmsIdentifier?.value) {
        savedIdentifierValue = cmsIdentifier.value;
        if (cmsIdentifier.system) {
          savedIdentifierSystem = cmsIdentifier.system;
        }
      } else if (resource.identifier[0].value) {
        savedIdentifierValue = resource.identifier[0].value;
        if (resource.identifier[0].system) {
          savedIdentifierSystem = resource.identifier[0].system;
        }
      }
    }
    return (
      url !== (resource?.url ?? '') ||
      identifierValue !== savedIdentifierValue ||
      identifierSystem !== savedIdentifierSystem ||
      name !== (resource?.name ?? '') ||
      title !== (resource?.title ?? '') ||
      description !== (resource?.description ?? '')
    );
  };

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
        setIdentifierValue(cmsIdentifier.value);
        if (cmsIdentifier.system) {
          setIdentifierSystem(cmsIdentifier.system);
        }
      } else if (resource.identifier[0].value) {
        setIdentifierValue(resource.identifier[0].value);
        if (resource.identifier[0].system) {
          setIdentifierSystem(resource.identifier[0].value);
        }
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

  function parseUpdate(
    url: string,
    identifierValue: string,
    identifierSystem: string,
    name: string,
    title: string,
    description: string
  ) {
    const additions: DraftArtifactUpdates = {};
    const deletions: DraftArtifactUpdates = {};

    url.trim() !== '' ? (additions['url'] = url) : (deletions['url'] = '');
    if (identifierValue.trim() !== '') {
      if (identifierSystem.trim() !== '') {
        additions['identifier'] = [{ system: identifierSystem, value: identifierValue }];
      } else {
        additions['identifier'] = [{ value: identifierValue }];
      }
    } else {
      deletions['identifier'] = [{ system: '', value: '' }];
    }
    name.trim() !== '' ? (additions['name'] = name) : (deletions['name'] = '');
    title.trim() !== '' ? (additions['title'] = title) : (deletions['title'] = '');
    description.trim() !== '' ? (additions['description'] = description) : (deletions['description'] = '');

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
            <ArtifactFieldInput label="url" value={url} setField={setUrl} />
            <ArtifactFieldInput label="identifier value" value={identifierValue} setField={setIdentifierValue} />
            <ArtifactFieldInput label="identifier system" value={identifierSystem} setField={setIdentifierSystem} />
            <ArtifactFieldInput label="name" value={name} setField={setName} />
            <ArtifactFieldInput label="title" value={title} setField={setTitle} />
            <ArtifactFieldInput label="description" value={description} setField={setDescription} />
            <Button
              w={120}
              onClick={() => {
                const [additions, deletions] = parseUpdate(
                  url,
                  identifierValue,
                  identifierSystem,
                  name,
                  title,
                  description
                );
                resourceUpdate.mutate({
                  resourceType: resourceType as ArtifactResourceType,
                  id: id as string,
                  additions: additions,
                  deletions: deletions
                });
              }}
              disabled={!isChanged()} // only enable the submit button when a field has changed
            >
              Submit
            </Button>
          </Stack>
        </Grid.Col>
        <Grid.Col span={6}>
          <Text c="gray" fz="sm">
            Current JSON Content
          </Text>
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
