import { trpc } from '@/util/trpc';
import { Button, Center, Divider, Grid, Group, Paper, Select, Stack, Text, Tooltip } from '@mantine/core';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Prism } from '@mantine/prism';
import { notifications } from '@mantine/notifications';
import { AlertCircle, CircleCheck, InfoCircle } from 'tabler-icons-react';
import { ArtifactResourceType } from '@/util/types/fhir';
import ArtifactFieldInput from '@/components/ArtifactFieldInput';
import ReleaseModal from '@/components/ReleaseModal';

export default function ResourceAuthoringPage() {
  const router = useRouter();
  const { resourceType, id } = router.query;

  const [url, setUrl] = useState('');
  const [identifierValue, setIdentifierValue] = useState('');
  const [identifierSystem, setIdentifierSystem] = useState('');
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [library, setLibrary] = useState<string | null>(null);

  const ctx = trpc.useContext();

  const { data: resource } = trpc.draft.getDraftById.useQuery({
    id: id as string,
    resourceType: resourceType as ArtifactResourceType
  });

  const [isModalOpen, setIsModalOpen] = useState(false);

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
      (identifierSystem !== savedIdentifierSystem && savedIdentifierValue) ||
      (identifierValue.trim() !== '' && identifierSystem !== savedIdentifierSystem) ||
      name !== (resource?.name ?? '') ||
      title !== (resource?.title ?? '') ||
      description !== (resource?.description ?? '') ||
      (resource?.resourceType === 'Measure' && (library ? library !== resource.library?.[0] : resource.library?.[0]))
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
          setIdentifierSystem(resource.identifier[0].system);
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
    if (resource?.resourceType === 'Measure' && resource.library?.[0]) {
      setLibrary(resource.library[0]);
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

  // set up main library options
  let libOptions: { value: string; label: string; disabled: boolean }[] = []; // default to empty
  if (resourceType === 'Measure') {
    const { data: libraries } = trpc.draft.getDrafts.useQuery('Library' as ArtifactResourceType);
    if (libraries) {
      libOptions = libraries.map(l => {
        if (l?.url) {
          // prioritizes use of url/version
          const val = `${l.url}${l.version ? `|${l.version}` : ''}`;
          return { value: val, label: val, disabled: false };
        } else {
          // uses id (assumed to exist in this context), but option disabled if no url exists (required for canonical reference)
          const val = l?.id ?? '';
          return { value: val, label: val, disabled: true };
        }
      });
      // disabled to the bottom, alphabetize by value
      libOptions.sort((a, b) => {
        if (a.disabled && !b.disabled) return 1;
        if (b.disabled && !a.disabled) return -1;
        if (a.value < b.value) return -1;
        return 1;
      });
    }
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
            <ArtifactFieldInput
              disabled={!identifierValue}
              label="identifier system"
              value={identifierSystem}
              setField={setIdentifierSystem}
            />
            <ArtifactFieldInput label="name" value={name} setField={setName} />
            <ArtifactFieldInput label="title" value={title} setField={setTitle} />
            <ArtifactFieldInput label="description" value={description} setField={setDescription} />
            {resourceType === 'Measure' && (
              <Select
                label={
                  <Group spacing="xs">
                    library
                    <Tooltip label="Only draft libraries with a valid url may be selected.">
                      <div>
                        <InfoCircle size="1rem" style={{ display: 'block', opacity: 0.5 }} />
                      </div>
                    </Tooltip>
                  </Group>
                }
                value={library}
                onChange={setLibrary}
                placeholder="Select main logic library"
                searchable
                clearable
                nothingFound="No libraries available"
                maxDropdownHeight={280}
                data={libOptions}
              />
            )}
            <Group>
              <Button
                w={120}
                onClick={() => {
                  resourceUpdate.mutate({
                    resourceType: resourceType as ArtifactResourceType,
                    id: id as string,
                    values: {
                      url: url,
                      identifierValue: identifierValue,
                      identifierSystem: identifierSystem,
                      name: name,
                      title: title,
                      description: description,
                      library: library
                    }
                  });
                }}
                disabled={!isChanged()} // only enable the submit button when a field has changed
              >
                Update
              </Button>
              {!!resource?.extension?.find(
                ext =>
                  ext.url === 'http://hl7.org/fhir/StructureDefinition/artifact-isOwned' && ext.valueBoolean === true
              ) ? (
                <Tooltip label="Child artifacts cannot be directly released">
                  <span>
                    <Button w={120} disabled={true}>
                      Release
                    </Button>
                  </span>
                </Tooltip>
              ) : (
                <Button w={120} onClick={() => setIsModalOpen(true)} disabled={false}>
                  Release
                </Button>
              )}
            </Group>
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

      <ReleaseModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        id={id as string}
        resourceType={resourceType as ArtifactResourceType}
      />
    </div>
  );
}
