import { trpc } from '@/util/trpc';
import { ArtifactResourceType } from '@/util/types/fhir';
import { Button, Center, Group, Modal, Stack, Text, Tooltip } from '@mantine/core';
import { useRouter } from 'next/router';
import { AlertCircle, CircleCheck, InfoCircle } from 'tabler-icons-react';
import { notifications } from '@mantine/notifications';

export interface ReleaseModalProps {
  open: boolean;
  onClose: () => void;
  id: string;
  resourceType: ArtifactResourceType;
}

export default function ReleaseModal({ open = true, onClose, id, resourceType }: ReleaseModalProps) {
  const router = useRouter();

  const { data: resource } = trpc.draft.getDraftById.useQuery({
    id: id,
    resourceType: resourceType
  });
  const ctx = trpc.useContext();

  const deleteMutation = trpc.draft.deleteDraft.useMutation({
    onSuccess: data => {
      notifications.show({
        title: `Draft ${data.resourceType} released!`,
        message: `Draft ${data.resourceType}/${data.draftId} successfully released to the Publishable Measure Repository!`,
        icon: <CircleCheck />,
        color: 'green'
      });
      ctx.draft.getDraftCounts.invalidate();
      ctx.draft.getDrafts.invalidate();
    },
    onError: e => {
      console.error(e);
      notifications.show({
        title: `Release Failed!`,
        message: `Attempt to release artifact failed with message: ${e.message}`,
        icon: <AlertCircle />,
        color: 'red'
      });
    }
  });

  const releaseMutation = trpc.service.releaseArtifactByUrl.useMutation({
    onSuccess: data => {
      if (!data.location) {
        console.error('No resource location for released artifact');
        notifications.show({
          title: `Release Failed!`,
          message: `No resource location exists for draft artifact`,
          icon: <AlertCircle />,
          color: 'red'
        });
      } else if (data.status !== 201) {
        console.error(data.status);
        notifications.show({
          title: `Release Failed!`,
          message: `Server unable to process request`,
          icon: <AlertCircle />,
          color: 'red'
        });
      } else {
        router.push(data.location);
        deleteMutation.mutate({
          resourceType: resourceType,
          id: id
        });
        data.children.forEach(childArtifact => {
          deleteMutation.mutate({
            resourceType: childArtifact.resourceType,
            id: childArtifact.id
          });
        });
      }
      onClose();
    }
  });

  async function confirm() {
    // requirements:
    // https://build.fhir.org/ig/HL7/cqf-measures/measure-repository-service.html#release
    // TODO: release recursively all children (ignore for now).
    if (resource) {
      releaseMutation.mutate({
        resourceType: resourceType,
        id: id,
        version: resource.version
      });
    }
  }

  return (
    <Modal opened={open} onClose={onClose} withCloseButton={false} size="lg">
      <Stack>
        <Center>
          <Group spacing="xs">
            Release {resourceType}/{id}?
            <Tooltip
              multiline
              label="Releasing a draft artifact changes the artifact's status from 'draft' to 'active' and sends the artifact to the Publishable Measure Repository. This action also deletes this draft artifact from the Authoring Measure Repository."
            >
              <div>
                <InfoCircle size="1rem" style={{ display: 'block', opacity: 0.5 }} />
              </div>
            </Tooltip>
          </Group>
        </Center>
        <Text size="xs" fw={700}>
          NOTE: By releasing this artifact to the Publishable Measure Repository, this draft instance will be removed.
        </Text>
        <Center>
          <Group pt={8} position="right">
            <Button onClick={confirm}>Release</Button>
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
          </Group>
        </Center>
      </Stack>
    </Modal>
  );
}
