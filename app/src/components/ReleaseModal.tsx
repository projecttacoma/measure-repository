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
      console.log(`Successfully delete ${data.resourceType}/${data.draftId} from the database.`);
    },
    onError: e => {
      console.error(e);
    }
  });

  const releaseMutation = trpc.service.releaseParent.useMutation({
    onSuccess: data => {
      if (data.status !== 200) {
        console.error(data.status || data.error);
        notifications.show({
          title: `Release Failed!`,
          message: `Server unable to process request. ${data.error ?? ''}`,
          icon: <AlertCircle />,
          color: 'red'
        });
      } else if (!data.location) {
        console.error('No resource location for released artifact');
        notifications.show({
          title: `Release Failed!`,
          message: `No resource location exists for draft artifact`,
          icon: <AlertCircle />,
          color: 'red'
        });
      } else {
        data.deletable?.forEach(d => {
          notifications.show({
            title: `Draft ${d.resourceType} released!`,
            message: `Draft ${d.resourceType}/${d.id} successfully released to the Publishable Measure Repository!`,
            icon: <CircleCheck />,
            color: 'green'
          });
        });
        ctx.draft.getDraftCounts.invalidate();
        ctx.draft.getDrafts.invalidate();
        router.push(data.location);

        data.deletable?.forEach(d => {
          deleteMutation.mutate({
            resourceType: d.resourceType,
            id: d.id
          });
        });
      }
      onClose();
    }
  });

  async function confirm() {
    // requirements:
    // http://hl7.org/fhir/us/cqfmeasures/measure-repository-service.html#release
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
