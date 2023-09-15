import { trpc } from '@/util/trpc';
import { ArtifactResourceType } from '@/util/types/fhir';
import { Button, Center, Group, Modal, Stack, TextInput, Tooltip } from '@mantine/core';
import { DateTime } from 'luxon';
import { useRouter } from 'next/router';
import { useState } from 'react';
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
  const [version, setVersion] = useState('');

  const { data: resource } = trpc.draft.getDraftById.useQuery({
    id: id,
    resourceType: resourceType
  });
  const ctx = trpc.useContext();
  const deleteMutation = trpc.draft.deleteDraft.useMutation({
    onSuccess: () => {
      notifications.show({
        title: `Draft ${resource?.resourceType} released!`,
        message: `Draft ${resource?.resourceType}/${resource?.id} successfully released to the Measure Repository!`,
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

      // direct user to published artifact detail page
      router.push(location);
    }
    // TODO/question: -> should we check service for whether artifact already exists in some way for PUT update?
    onClose();
  }

  return (
    <Modal opened={open} onClose={onClose} withCloseButton={false} size="lg">
      <Stack>
        <Center>
          <Group spacing="xs">
            Release {resourceType}/{id}?
            <Tooltip
              multiline
              label="Releasing a draft artifact changes the artifact's status from 'draft' to 'active', adds the user-specified version to the artifact, and sends the artifact to the Publishable Measure Repository. This action also deletes this draft artifact from the Authoring Measure Repository."
            >
              <div>
                <InfoCircle size="1rem" style={{ display: 'block', opacity: 0.5 }} />
              </div>
            </Tooltip>
          </Group>
        </Center>
        <TextInput
          label="Add version"
          value={version}
          onChange={e => setVersion(e.target.value)}
          withAsterisk
          description="An artifact must have a version before it can be released to the Measure Repository"
        />
        <Center>
          <Group pt={8} position="right">
            <Button onClick={confirm} disabled={!version}>
              Release
            </Button>
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
          </Group>
        </Center>
      </Stack>
    </Modal>
  );
}
