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
import DraftListItem from './DraftListItem';
import { Flame, InfoCircle } from 'tabler-icons-react';

export interface ReleaseModalProps {
  open: boolean;
  onClose: () => void;
  id: string;
  resourceType: ArtifactResourceType;
}

export default function ReleaseModal({ open = true, onClose, id, resourceType }: ReleaseModalProps) {
  const router = useRouter();
  const [version, setVersion] = useState('');
  const { data: resource } = trpc.draft.getDraftById.useQuery({
    id: id,
    resourceType: resourceType
  });
  const ctx = trpc.useContext();
  const deleteMutation = trpc.draft.deleteDraft.useMutation({
    onSuccess: () => {
      ctx.draft.getDraftCounts.invalidate();
      ctx.draft.getDrafts.invalidate(); //? needed if redirecting?
    },
    onError: e => {
      console.error(e);
      // TODO: add notifications or handle on modal? -> aggregate multiple potential issue points?
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
      resource.date = DateTime.now().toISO() || ''; //TODO: same as 'YYYY-MM-DDThh:mm:ss+zz:zz'?
    }

    const res = await fetch(`${process.env.NEXT_PUBLIC_MRS_SERVER}/${resourceType}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json+fhir'
      },
      body: JSON.stringify(resource)
    });

    const location = res.headers.get('Location')?.substring(5); // remove 4_0_1 (version)
    if (res.status !== 201) {
      console.error(res.statusText);
      // TODO: error notification?
    } else if (!location) {
      // TODO: error notification?
      console.error('No resource location for released artifact');
    } else {
      //delete draft
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
  return (
    <Modal opened={open} onClose={onClose} withCloseButton={false} size="65%" centered>
      <Stack>
        <div>
          <Group spacing="lg">
            <Text size="xl" fw={700}>
              {resource?.name
                ? `Release ${resourceType} ${resource?.name}?`
                : `Release ${resourceType}/${resource?.id}?`}
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
                  The release operation supports updating the status of an existing draft artifact to active. The
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
        {resource?.id && <DraftListItem header={'ID'} context={resource.id} originalColor={'#F8F9FA'} />}
        {resource?.url && <DraftListItem header={'URL'} context={resource.url} originalColor={'#F1F3F5'} />}
        {resource?.name && <DraftListItem header={'Name'} context={resource.name} originalColor={'#F8F9FA'} />}
        {resource?.resourceType && (
          <DraftListItem header={'Type'} context={resource.resourceType} originalColor={'#F1F3F5'} />
        )}
        {resource?.description && (
          <DraftListItem header={'Description'} context={resource.description} originalColor={'#F8F9FA'} />
        )}
        {resource?.version && <DraftListItem header={'Version'} context={resource.version} originalColor={'#F1F3F5'} />}
        {resource?.effectivePeriod && (
          <DraftListItem header={'Effective Period'} date={resource.effectivePeriod} originalColor={'#F1F3F5'} />
        )}
      </List>
      <Space h="lg" />
      <Center>
        <Stack>
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
