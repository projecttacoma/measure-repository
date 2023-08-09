import { trpc } from '@/util/trpc';
import { ArtifactResourceType } from '@/util/types/fhir';
import {
  Anchor,
  Avatar,
  Blockquote,
  Button,
  Center,
  Divider,
  Group,
  HoverCard,
  List,
  Modal,
  Stack,
  Space,
  Text,
  TextInput
} from '@mantine/core';
import { DateTime } from 'luxon';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { AlertCircle, CircleCheck, Flame, InfoCircle } from 'tabler-icons-react';
import { notifications } from '@mantine/notifications';
import DraftListItem from './DraftListItem';

export interface ReleaseModalProps {
  open: boolean;
  onClose: () => void;
  id: string;
  resourceType: ArtifactResourceType;
}

export default function ReleaseModal({ open = true, onClose, id, resourceType }: ReleaseModalProps) {
  const router = useRouter();
  const [version, setVersion] = useState('');
  const colorsArr: string[] = ['#F8F9FA', '#F1F3F5'];
  let currentColor = '#F8F9FA';
  const { data: resource } = trpc.draft.getDraftById.useQuery({
    id: id,
    resourceType: resourceType
  });
  const ctx = trpc.useContext();
  const deleteMutation = trpc.draft.deleteDraft.useMutation({
    onSuccess: () => {
      notifications.show({
        title: `Draft ${resource?.resourceType} released!`,
        message: `Draft ${resource?.resourceType}/${resource?.id} successfully released to the MRS!`,
        icon: <CircleCheck />,
        color: 'green'
      });
      ctx.draft.getDraftCounts.invalidate();
      ctx.draft.getDrafts.invalidate(); //? needed if redirecting?
    },
    onError: e => {
      console.error(e);
      notifications.show({
        title: `Release Failed!`,
        message: `Attempt to release ${resourceType} failed with message: ${e.message}`,
        icon: <AlertCircle />,
        color: 'red'
      });
    }
  });

  async function confirm() {
    // requirements:
    // https://build.fhir.org/ig/HL7/cqf-measures/measure-repository-service.html#release
    // TODO: release recursively all children (ignore for now).
    // TODO/question: spec says don't change anything but status and date, but we're also changing version and idea (but spec is a mess)
    if (resource) {
      resource.version = version;
      resource.status = 'active';
      resource.date = DateTime.now().toISO() || '';
    }

    const res = await fetch(`${process.env.NEXT_PUBLIC_MRS_SERVER}/${resourceType}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json+fhir'
      },
      body: JSON.stringify(resource)
    });

    const location = res.headers.get('Location')?.substring(5); // remove 4_0_1 (version)
    console.log(res.status + '     res');
    if (res.status !== 201) {
      console.error(res.statusText);
      notifications.show({
        title: `Release Failed!`,
        message: `Server unable to process request`,
        icon: <AlertCircle />,
        color: 'red'
      });
    } else if (!location) {
      console.error('No resource location for released artifact');
      notifications.show({
        title: `Release Failed!`,
        message: `No resource location exists for draft artifact`,
        icon: <AlertCircle />,
        color: 'red'
      });
    } else {
      // delete draft
      deleteMutation.mutate({
        resourceType: resourceType,
        id: id
      });

      //direct user to published artifact detail page
      router.push(location);
    }
    //TODO/question: -> should we check service for whether artifact already exists in some way for PUT update?
    onClose();
  }

  //This function is needed because, if I were to include this functionality where I call it,
  // then it would appear on the modal which I don't want to happen
  const setColor = (newColor: string) => {
    currentColor = newColor;
  };

  return (
    <Modal opened={open} onClose={onClose} withCloseButton={false} size="65%" centered>
      <Stack>
        <div>
          <Group spacing="lg">
            <Text size="xl" fw={700}>
              {resource?.id && `Release ${resourceType}/${resource?.id}?`}
            </Text>
            <HoverCard width={620} shadow="md" withArrow openDelay={200} closeDelay={200}>
              <HoverCard.Target>
                <div>
                  <InfoCircle size="1.5rem" style={{ opacity: 0.5 }} />
                </div>
              </HoverCard.Target>
              <HoverCard.Dropdown>
                <Group>
                  <Avatar color="red" radius="xl">
                    <Flame size="1.5rem" />
                  </Avatar>
                  <Stack spacing={5}>
                    <Text size="sm" weight={700} sx={{ lineHeight: 1 }}>
                      Learn More
                    </Text>
                    <Anchor
                      target="_blank"
                      href="https://build.fhir.org/ig/HL7/cqf-measures/measure-repository-service.html#release"
                      color="dimmed"
                      size="xs"
                      sx={{ lineHeight: 1 }}
                    >
                      Release Draft Artifacts
                    </Anchor>
                  </Stack>
                </Group>
                <Space h="lg" />
                <Blockquote cite="– Fhir Spec" sx={{ lineHeight: 2, fontSize: '15px' }}>
                  The <i>release</i> operation supports updating the status of an existing draft artifact to active. The
                  operation sets the date and status elements of the artifact, but is otherwise not allowed to change
                  any other elements of the artifact. Child artifacts (i.e. artifacts that compose the existing
                  artifact) are also released, recursively. To be released, an artifact is required to have a version
                  specified.
                </Blockquote>
              </HoverCard.Dropdown>
            </HoverCard>
          </Group>
        </div>
      </Stack>
      <Space h="md" />
      <Divider size="sm" />
      <Space h="lg" />
      <List style={{ listStyle: 'none' }}>
        {resource?.name && (
          <>
            {<DraftListItem header={'Name'} context={resource.name} originalColor={colorsArr[0]} />}
            {setColor(colorsArr[0])}
          </>
        )}
        {resource?.status && (
          <>
            {setColor(currentColor === colorsArr[0] ? colorsArr[1] : colorsArr[0])}
            <DraftListItem header={'Status'} context={resource.status} originalColor={currentColor} />
          </>
        )}
        {resource?.id && (
          <>
            {setColor(currentColor === colorsArr[0] ? colorsArr[1] : colorsArr[0])}
            <DraftListItem header={'ID'} context={resource.id} originalColor={currentColor} />
          </>
        )}
        {resource?.url && (
          <>
            {setColor(currentColor === colorsArr[0] ? colorsArr[1] : colorsArr[0])}
            <DraftListItem header={'URL'} context={resource.url} originalColor={currentColor} />
          </>
        )}
        {resource?.resourceType && (
          <>
            {setColor(currentColor === colorsArr[0] ? colorsArr[1] : colorsArr[0])}
            <DraftListItem header={'Type'} context={resource.resourceType} originalColor={currentColor} />
          </>
        )}
        {resource?.description && (
          <>
            {setColor(currentColor === colorsArr[0] ? colorsArr[1] : colorsArr[0])}
            <DraftListItem header={'Description'} context={resource.description} originalColor={currentColor} />
          </>
        )}
        {resource?.version && (
          <>
            {setColor(currentColor === colorsArr[0] ? colorsArr[1] : colorsArr[0])}
            <DraftListItem header={'Version'} context={resource.version} originalColor={currentColor} />
          </>
        )}
        {resource?.effectivePeriod && (
          <>
            {setColor(currentColor === colorsArr[0] ? colorsArr[1] : colorsArr[0])}
            <DraftListItem header={'Effective Period'} date={resource.effectivePeriod} originalColor={currentColor} />
          </>
        )}
      </List>
      <Space h="lg" />
      <Center>
        <Stack>
          {/* According to https://build.fhir.org/ig/HL7/cqf-measures/measure-repository-service.html#draft,
          creating a draft artifact from an existing artifact should result in the loss of it's version. 
          So it is necessary to make the user add one because it should not have one to begin with*/}
          <TextInput
            size="md"
            style={{ width: '55rem' }}
            radius="md"
            withAsterisk
            label="Add version"
            value={version}
            placeholder="1.0.0"
            onChange={e => setVersion(e.target.value)}
          />
          <Group pt={8} position="center">
            <Button onClick={confirm} disabled={!version}>
              Release
            </Button>
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
          </Group>
        </Stack>
      </Center>
    </Modal>
  );
}
