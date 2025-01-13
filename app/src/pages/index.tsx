import { trpc } from '@/util/trpc';
import { ArtifactResourceType } from '@/util/types/fhir';
import {
  Anchor,
  Button,
  Center,
  Divider,
  Group,
  Modal,
  Paper,
  SegmentedControl,
  Stack,
  Table,
  Text,
  Textarea,
  Title
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconCircleCheck } from '@tabler/icons-react';
import { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import { useRouter } from 'next/router';
import { useState } from 'react';

export default function Home({
  capabilityStatement,
  serviceUri
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const [resourceType, setResourceType] = useState<ArtifactResourceType>('Measure');
  const [opened, { open, close }] = useDisclosure(false);
  const [jsonInput, setJsonInput] = useState('');
  const router = useRouter();

  const publishMutation = trpc.service.publish.useMutation({
    onSuccess: (data, variables) => {
      notifications.show({
        title: `${variables.resourceType} published!`,
        message: `${data.location} successfully published!`,
        icon: <IconCircleCheck />,
        color: 'green'
      });
      router.push(data.location);
      close();
    },
    onError: (e, variables) => {
      notifications.show({
        title: `${resourceType} Publish Failed!`,
        message: `Attempt to publish ${variables.resourceType} failed with message: ${e.message}`,
        icon: <IconAlertCircle />,
        color: 'red'
      });
    }
  });

  const renderCapabilityTable = () => {
    return capabilityStatement ? (
      <Table>
        <thead>
          <tr>
            <th>Resource</th>
            <th>Operations</th>
            <th>Search Parameters</th>
          </tr>
        </thead>
        <tbody>
          {capabilityStatement.rest?.[0]?.resource
            ?.sort((a, b) => {
              return a.type > b.type ? 1 : -1; // sort alphabetical by resource type
            })
            .map(r => (
              <tr key={`row-${r.type}`}>
                <td>{r.type}</td>
                <td>
                  {r.operation
                    ?.map(o => {
                      return o.name;
                    })
                    .sort()
                    .join(', ')}
                </td>
                <td>
                  {r.searchParam
                    ?.map(sp => {
                      return sp.name;
                    })
                    .sort()
                    .join(', ')}
                </td>
              </tr>
            ))}
        </tbody>
      </Table>
    ) : (
      <Text c="red.7" style={{ marginBottom: '8px' }}>
        Capability Statement Unavailable
      </Text>
    );
  };

  return (
    <div>
      <Modal opened={opened} onClose={close} withCloseButton={false} size="lg">
        <Center>
          <Text weight={700} align="center" lineClamp={2} p={'sm'}>
            {`Add ${resourceType} JSON`}
            <Textarea
              value={jsonInput}
              onChange={event => setJsonInput(event.currentTarget.value)}
              autosize
              minRows={6}
              maxRows={24}
            />
          </Text>
        </Center>
        <Center>
          <Group pt={8}>
            <Button variant="default" onClick={close}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                publishMutation.mutate({
                  resourceType: resourceType,
                  jsonInput: jsonInput
                });
              }}
              color={'green'}
            >
              Publish
            </Button>
          </Group>
        </Center>
      </Modal>
      <Text>
        This application is an interface for a prototype implementation of a{' '}
        <Anchor href="http://hl7.org/fhir/us/cqfmeasures/measure-repository-service.html">
          FHIR Measure Repository Service
        </Anchor>{' '}
        with Measure and Library management capabilities. See the{' '}
        <Anchor href="https://github.com/projecttacoma/measure-repository/blob/main/README.md">
          Measure Repository README
        </Anchor>{' '}
        for technical details.
      </Text>
      <Divider my="sm" variant="dotted" />
      <Title order={2}>Service Location:</Title>
      <div style={{ marginTop: '18px', marginBottom: '18px' }}>
        <Anchor href={`${serviceUri}/metadata`}>{`${serviceUri}/metadata`}</Anchor>
      </div>
      <Divider my="sm" variant="dotted" />
      <Title order={2}>
        {!capabilityStatement
          ? ''
          : capabilityStatement.instantiates?.includes(
              'http://hl7.org/fhir/us/cqfmeasures/CapabilityStatement/authoring-measure-repository'
            )
          ? 'Authoring '
          : 'Publishable '}
        Service Capabilities:
      </Title>
      <div style={{ marginTop: '18px', marginBottom: '18px' }}>{renderCapabilityTable()}</div>
      <Center>
        <Paper h={250} w={500} p={48} withBorder shadow="lg">
          <Stack>
            <SegmentedControl
              value={resourceType}
              onChange={val => {
                setResourceType(val as ArtifactResourceType);
              }}
              data={[
                { label: 'Measure', value: 'Measure' },
                { label: 'Library', value: 'Library' }
              ]}
            />
            <Title order={3}>Start From Scratch:</Title>
            <Center>
              <Button w={240} onClick={open}>
                {`Create New Active ${resourceType}`}
              </Button>
            </Center>
          </Stack>
        </Paper>
      </Center>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps<{
  capabilityStatement: fhir4.CapabilityStatement | null;
  serviceUri: string | undefined;
}> = async () => {
  // Fetch CapabilityStatement
  const res = await fetch(`${process.env.MRS_SERVER}/metadata`);
  const capabilityStatement = res.status === 200 ? ((await res.json()) as fhir4.CapabilityStatement) : null;

  // Pass to the page via props
  return { props: { capabilityStatement, serviceUri: process.env.PUBLIC_MRS_SERVER } };
};
