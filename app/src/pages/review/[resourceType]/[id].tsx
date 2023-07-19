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
import { useRouter } from 'next/router';
import { trpc } from '@/util/trpc';
import { IconStar, IconCalendar, IconInfoHexagonFilled } from '@tabler/icons-react';
import { InfoCircle } from 'tabler-icons-react';
import 'dayjs/locale/ru';
import { DateTimePicker } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { isNotEmpty, hasLength } from '@mantine/form';

/**
 * Component which renders a page that displays the JSON data of a resource. Also will eventually
 *  provide the user with the ability to make review comments and visualize previous review comments.
 */
export default function CommentPage() {
  const date = new Date();
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  const router = useRouter();
  const { resourceType: resourceType, id: resourceID, authoring } = router.query;
  let resource;

  const form = useForm({
    initialValues: {
      name: '',
      type: '',
      comment: '',
      date: ''
    },
    validate: {
      name: hasLength({ min: 2, max: 10 }, 'Name must be 2-10 characters long'),
      type: isNotEmpty('Select the type of comment'),
      comment: isNotEmpty('Enter artifact comment'),
      date: isNotEmpty('Enter date')
    }
  });

  if (authoring === 'true') {
    resource = trpc.draft.getDraftById.useQuery({
      id: resourceID as string,
      resourceType: resourceType as ArtifactResourceType
    });
  } else {
    resource = trpc.service.getArtifactById.useQuery({
      id: resourceID as string,
      resourceType: resourceType as ArtifactResourceType
    });
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
      <Divider my="md" mt={14} />
      <Grid>
        <Grid.Col span={7}>
          <Tabs variant="outline" defaultValue="addComments">
            <Tabs.List>
              <Tabs.Tab value="addComments">Add comment</Tabs.Tab>
              <Tabs.Tab value="viewComments"> View Comments</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="addComments" pt="xs">
              <Box
                component="form"
                maw={1200}
                mx="auto"
                onSubmit={form.onSubmit(() => {
                  console.log('random console.log to avoid Eslint error');
                })}
              >
                <Group>
                  <Select
                    id="commentType"
                    mt="md"
                    clearable
                    radius="lg"
                    label={
                      <Group spacing="xs">
                        Comment Type
                        <HoverCard width={420} shadow="md" withArrow openDelay={200} closeDelay={400}>
                          <HoverCard.Target>
                            <div>
                              <InfoCircle size="1rem" style={{ opacity: 0.5 }} />
                            </div>
                          </HoverCard.Target>
                          <HoverCard.Dropdown>
                            <Group>
                              <Avatar color="blue" radius="xl">
                                <IconInfoHexagonFilled size="1.5rem" />
                              </Avatar>
                              <Stack spacing={5}>
                                <Text size="sm" weight={700} sx={{ lineHeight: 1 }}>
                                  Mantine
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
                                <i>Documentation:</i> The comment is providing additional documentation from an
                                authoring perspective
                              </List.Item>
                              <List.Item>
                                <i>Review:</i> The comment is providing feedback from a reviewer and requires resolution
                              </List.Item>
                              <List.Item>
                                <i>Guidance:</i> The comment is providing usage guidance to an artifact consumer
                              </List.Item>
                            </List>
                          </HoverCard.Dropdown>
                        </HoverCard>
                      </Group>
                    }
                    icon={<IconStar />}
                    placeholder="Pick one"
                    data={[
                      { value: 'Documentation', label: 'Documentation' },
                      { value: 'Guidance', label: 'Guidance' },
                      { value: 'Review', label: 'Review' }
                    ]}
                    {...form.getInputProps('type')}
                  />
                </Group>
                <Textarea
                  radius="lg"
                  mt="md"
                  minRows={10}
                  maxRows={10}
                  placeholder="Your Artifact comment"
                  label="Artifact Comment"
                  description="Add a comment to the resource"
                  withAsterisk
                  {...form.getInputProps('comment')}
                />
                <Space h="md" />
                <Group grow>
                  <TextInput
                    radius="lg"
                    label="Endorser Name"
                    placeholder="Name"
                    withAsterisk
                    {...form.getInputProps('name')}
                  />
                  <DateTimePicker
                    clearable
                    maxDate={new Date(year, month, day)}
                    dropdownType="modal"
                    icon={<IconCalendar size="1.1rem" stroke={1.5} />}
                    withAsterisk
                    radius="lg"
                    label="Date"
                    placeholder="Select a date"
                    mx="auto"
                    {...form.getInputProps('date')}
                  />
                  <Space h="md" />
                </Group>
                <Space h="md" />
                <Group position="right" mt="md">
                  <Button
                    type="submit"
                    onClick={() => {
                      if (form.isValid()) {
                        console.log(form.values.comment + ' access comment');
                      }
                    }}
                  >
                    Submit
                  </Button>
                </Group>
              </Box>
            </Tabs.Panel>
            <Tabs.Panel value="viewComments" pt="xs">
              Components to view comments go here
            </Tabs.Panel>
          </Tabs>
        </Grid.Col>
        <Grid.Col span={5}>
          <Space />
          <Text c="gray" fz="sm">
            Current JSON Content
          </Text>
          <Paper withBorder>
            <Prism language="json" colorScheme="light" styles={{ scrollArea: { height: 'calc(100vh - 150px)' } }}>
              {resource.data ? JSON.stringify(resource.data, null, 2) : ''}
            </Prism>
          </Paper>
        </Grid.Col>
      </Grid>
    </div>
  );
}
