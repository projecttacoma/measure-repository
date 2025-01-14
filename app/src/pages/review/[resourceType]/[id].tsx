import { Prism } from '@mantine/prism';
import {
  Anchor,
  Avatar,
  Box,
  Button,
  Center,
  Divider,
  Grid,
  Group,
  HoverCard,
  List,
  Paper,
  Select,
  Space,
  Stack,
  Tabs,
  Text,
  Textarea,
  TextInput
} from '@mantine/core';
import { ArtifactResourceType } from '@/util/types/fhir';
import { useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { trpc } from '@/util/trpc';
import { IconAlertCircle, IconCircleCheck, IconInfoCircle, IconStar } from '@tabler/icons-react';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import ArtifactTimeline from '@/components/ArtifactTimeline';
import { isEmpty, trim } from 'lodash';

/**
 * Component which renders a page that displays the JSON data of a resource. Also will eventually
 *  provide the user with the ability to make review comments and visualize previous review comments.
 */
export default function CommentPage() {
  const ctx = trpc.useContext();
  const ref = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const { resourceType: resourceType, id: resourceID, authoring } = router.query;
  const { data: resource } = getResource();

  // Validates that all of the necessary form properties were entered by the user
  const form = useForm({
    initialValues: {
      type: '',
      comment: '',
      name: ''
    },
    // An error will be thrown if these fields aren't entered properly
    // Type and comment are required unless all are empty
    validate: {
      type: (value, values) =>
        (isEmpty(trim(value)) && isEmpty(trim(values.comment)) && isEmpty(trim(values.name))) || !isEmpty(trim(value))
          ? null
          : 'Type is required for any comment input.',
      comment: (value, values) =>
        (isEmpty(trim(value)) && isEmpty(trim(values.type)) && isEmpty(trim(values.name))) || !isEmpty(trim(value))
          ? null
          : 'Artifact comment text is required for any comment input.'
    }
  });

  const resourceReview = trpc.draft.reviewDraft.useMutation({
    onSuccess: data => {
      notifications.show({
        title: 'Review successfully added!',
        message: `Review successfully added to ${resourceType}/${resourceID}`,
        icon: <IconCircleCheck />,
        color: 'green'
      });
      data.children.forEach(c => {
        notifications.show({
          title: 'Review successfully added!',
          message: `${resourceType} artifact of url ${c.url} successfully reviewed`,
          icon: <IconCircleCheck />,
          color: 'green'
        });
      });
      if (authoring) {
        ctx.draft.getDraftById.invalidate();
      } else {
        ctx.service.getArtifactById.invalidate();
      }
    },
    onError: e => {
      notifications.show({
        title: 'Review Failed!',
        message: `Attempt to review ${resourceType} failed with message: ${e.message}`,
        icon: <IconAlertCircle />,
        color: 'red'
      });
    }
  });

  const resourceApprove = trpc.draft.approveDraft.useMutation({
    onSuccess: data => {
      notifications.show({
        title: 'Approval successfully added!',
        message: `Approval successfully added to ${resourceType}/${resourceID}`,
        icon: <IconCircleCheck />,
        color: 'green'
      });
      data.children.forEach(c => {
        notifications.show({
          title: 'Approval successfully added!',
          message: `${resourceType} artifact of url ${c.url} successfully approved`,
          icon: <IconCircleCheck />,
          color: 'green'
        });
      });
      if (authoring) {
        ctx.draft.getDraftById.invalidate();
      } else {
        ctx.service.getArtifactById.invalidate();
      }
    },
    onError: e => {
      notifications.show({
        title: 'Approval Failed!',
        message: `Attempt to approve ${resourceType} failed with message: ${e.message}`,
        icon: <IconAlertCircle />,
        color: 'red'
      });
    }
  });

  function getResource() {
    if (authoring === 'true') {
      return trpc.draft.getDraftById.useQuery({
        id: resourceID as string,
        resourceType: resourceType as ArtifactResourceType
      });
    } else {
      return trpc.service.getArtifactById.useQuery({
        id: resourceID as string,
        resourceType: resourceType as ArtifactResourceType
      });
    }
  }

  return (
    <div>
      <Center>
        <Text c="gray" fz="xl">
          {authoring === 'true'
            ? `Reviewing Draft ${resourceType}/${resourceID}`
            : `Reviewing ${resourceType}/${resourceID}`}
        </Text>
      </Center>
      <Divider my="md" mt={12} />

      <Tabs variant="outline" defaultValue="addComments">
        <Tabs.List>
          <Tabs.Tab value="addComments">Add comment</Tabs.Tab>
          <Tabs.Tab value="viewComments"> View Comments</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="viewComments" pt="xs">
          <ArtifactTimeline extensions={resource?.extension} />
        </Tabs.Panel>
        <Tabs.Panel value="addComments" pt="xs">
          <Grid>
            <Grid.Col span={6}>
              <Box
                component="form"
                maw={1200}
                mx="auto"
                // This console.log is necessary because the onSubmit function has to use the '() => {}' format
                // and it will cause an error if it is left empty.
                onSubmit={form.onSubmit(values => {
                  console.log(values);
                })}
              >
                <Group>
                  <Select
                    id="commentType"
                    mt="md"
                    clearable
                    radius="lg"
                    label={
                      <Group spacing="lg">
                        <Text>Comment Type</Text>
                        <HoverCard width={420} shadow="md" withArrow openDelay={200} closeDelay={200}>
                          <HoverCard.Target>
                            <div>
                              <IconInfoCircle size="1rem" style={{ opacity: 0.5 }} />
                            </div>
                          </HoverCard.Target>
                          <HoverCard.Dropdown>
                            <Group>
                              <Avatar color="blue" radius="xl">
                                <IconInfoCircle size="1.5rem" />
                              </Avatar>
                              <Stack spacing={5}>
                                <Text size="sm" weight={700} sx={{ lineHeight: 1 }}>
                                  Learn More
                                </Text>
                                <Anchor
                                  target="_blank"
                                  href="https://build.fhir.org/ig/HL7/cqf-measures/ValueSet-artifact-comment-type.html"
                                  color="dimmed"
                                  size="xs"
                                  sx={{ lineHeight: 1 }}
                                >
                                  Artifact Comment Types
                                </Anchor>
                              </Stack>
                            </Group>
                            <Space h="lg" />
                            <List spacing="sm" size="sm" center>
                              <List.Item>
                                <i>documentation:</i> The comment is providing additional documentation from an
                                authoring perspective
                              </List.Item>
                              <List.Item>
                                <i>review:</i> The comment is providing feedback from a reviewer and requires resolution
                              </List.Item>
                              <List.Item>
                                <i>guidance:</i> The comment is providing usage guidance to an artifact consumer
                              </List.Item>
                            </List>
                          </HoverCard.Dropdown>
                        </HoverCard>
                      </Group>
                    }
                    icon={<IconStar opacity={0.5} />}
                    placeholder="Type"
                    data={[
                      { value: 'documentation', label: 'documentation' },
                      { value: 'guidance', label: 'guidance' },
                      { value: 'review', label: 'review' }
                    ]}
                    {...form.getInputProps('type')}
                  />
                </Group>
                <Textarea
                  radius="lg"
                  mt="md"
                  minRows={15}
                  maxRows={15}
                  placeholder="Your Artifact comment"
                  label="Artifact Comment"
                  description="Add a comment to the artifact"
                  {...form.getInputProps('comment')}
                />
                <Space h="md" />
                <Group grow>
                  <TextInput radius="lg" label="Endorser URI" placeholder="URI" {...form.getInputProps('name')} />
                  <Space h="md" />
                </Group>
                <Space h="md" />
                <Group position="right" mt="md">
                  <Button
                    loading={isLoading}
                    type="submit"
                    onClick={() => {
                      if (form.isValid()) {
                        setIsLoading(true);
                        setTimeout(() => {
                          form.reset();
                          if (ref?.current?.checked) {
                            ref.current.checked = false;
                          }
                          setIsLoading(false);
                        }, 1000);
                        resourceReview.mutate({
                          resourceType: resourceType as ArtifactResourceType,
                          id: resourceID as string,
                          type: form.values.type,
                          summary: form.values.comment,
                          author: form.values.name
                        });
                      }
                    }}
                  >
                    Review
                  </Button>
                  <Button
                    loading={isLoading}
                    type="submit"
                    color="green"
                    onClick={() => {
                      if (form.isValid()) {
                        setIsLoading(true);
                        setTimeout(() => {
                          form.reset();
                          if (ref?.current?.checked) {
                            ref.current.checked = false;
                          }
                          setIsLoading(false);
                        }, 1000);
                        resourceApprove.mutate({
                          resourceType: resourceType as ArtifactResourceType,
                          id: resourceID as string,
                          type: form.values.type,
                          summary: form.values.comment,
                          author: form.values.name
                        });
                      }
                    }}
                  >
                    Approve
                  </Button>
                </Group>
              </Box>
            </Grid.Col>
            <Grid.Col span={6}>
              <Space />
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
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}
