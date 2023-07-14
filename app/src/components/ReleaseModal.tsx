import { trpc } from '@/util/trpc';
import { ArtifactResourceType } from '@/util/types/fhir';
import { Modal, Button, Center, Group, Text, Grid, TextInput } from '@mantine/core';
import { DateTime } from 'luxon';
import { useRouter } from 'next/router';
import { useState } from 'react';

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
    <Modal
      opened={open}
      onClose={onClose}
      withCloseButton={false}
      title={`Release ${resourceType} ${id}`}
      size="lg"
      centered
    >
      <Center>
        {/* TODO: add more text reflecting draft details */}
        <Grid>
          <Grid.Col span={10}>
            <div>
              <Text size="lg" fw={700}>
                {resource?.name ?? `${resourceType}/${resource?.id}`}
              </Text>
            </div>
            {resource?.url && <Text size="sm">{resource.url}</Text>}
            <TextInput label="Add version" value={version} onChange={e => setVersion(e.target.value)} />
          </Grid.Col>
        </Grid>
      </Center>
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
    </Modal>
  );
}
