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
import { AlertCircle, CircleCheck, InfoCircle, Star } from 'tabler-icons-react';
import { isNotEmpty, useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import ArtifactTimeline from '@/components/ArtifactTimeline';

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
    validate: {
      type: isNotEmpty('Select the type of comment'),
      comment: isNotEmpty('Enter artifact comment')
    }
  });

  const resourceReview = trpc.draft.reviewDraft.useMutation({
    onSuccess: data => {
      notifications.show({
        title: 'Review successfully added!',
        message: `Review successfully added to ${resourceType}/${resourceID}`,
        icon: <CircleCheck />,
        color: 'green'
      });
      data.children.forEach(c => {
        notifications.show({
          title: 'Review successfully added!',
          message: `Draft of child ${resourceType} artifact of url ${c.url} successfully reviewed`,
          icon: <CircleCheck />,
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
        icon: <AlertCircle />,
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
                        <Text>
                          Comment Type <span style={{ color: 'red' }}>*</span>
                        </Text>
                        <HoverCard width={420} shadow="md" withArrow openDelay={200} closeDelay={200}>
                          <HoverCard.Target>
                            <div>
                              <InfoCircle size="1rem" style={{ opacity: 0.5 }} />
                            </div>
                          </HoverCard.Target>
                          <HoverCard.Dropdown>
                            <Group>
                              <Avatar color="blue" radius="xl">
                                <InfoCircle size="1.5rem" />
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
                    icon={<Star opacity={0.5} />}
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
                  withAsterisk
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
                    Submit
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
