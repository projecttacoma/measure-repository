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

  const publicUrl = trpc.service.getPublicUrl.useQuery()

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

  const releaseChildMutation = trpc.service.releaseChild.useMutation({
    onSuccess: (data, variables) => {
      if (data.status !== 201) {
        console.error(data.status);
        notifications.show({
          title: `Release Failed!`,
          message: `Server unable to process request`,
          icon: <AlertCircle />,
          color: 'red'
        });
      } else {
        notifications.show({
          title: `Draft ${variables.resourceType} released!`,
          message: `Child draft ${variables.resourceType}/${data.id} successfully released to the Publishable Measure Repository!`,
          icon: <CircleCheck />,
          color: 'green'
        });
        ctx.draft.getDraftCounts.invalidate();
        ctx.draft.getDrafts.invalidate();

        // delete draft child artifact from the draft database now that it has been released
        deleteMutation.mutate({
          resourceType: variables.resourceType,
          id: data.id
        });
      }
    },
    onError: (e, variables) => {
      console.error(e);
      notifications.show({
        title: `Release Failed!`,
        message: `Attempt to release child ${variables.resourceType} with url ${variables.url} failed with message: ${e.message}`,
        icon: <AlertCircle />,
        color: 'red'
      });
    }
  });

  const releaseMutation = trpc.service.releaseParent.useMutation({
    onSuccess: (data, variables) => {
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
        notifications.show({
          title: `Draft ${variables.resourceType} released!`,
          message: `Draft ${variables.resourceType}/${variables.id} successfully released to the Publishable Measure Repository!`,
          icon: <CircleCheck />,
          color: 'green'
        });
        ctx.draft.getDraftCounts.invalidate();
        ctx.draft.getDrafts.invalidate();
        router.push(data.location);

        // delete draft artifact from the draft database now that it has been released
        deleteMutation.mutate({
          resourceType: resourceType,
          id: id
        });

        // go through all of the recursively found child artifacts and release them
        // child artifacts only get released if the release of the parent was successful
        // the success of the parent does not rely on the success of its child artifacts
        // nor do the child artifacts rely on each other
        data.children.forEach(childArtifact => {
          releaseChildMutation.mutate({
            resourceType: childArtifact.resourceType,
            url: childArtifact.url,
            version: childArtifact.version
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
