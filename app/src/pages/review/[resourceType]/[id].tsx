import { Prism } from '@mantine/prism';
import {
  Anchor,
  Avatar,
  Box,
  Button,
  Center,
  Checkbox,
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

interface DraftArtifactUpdates {
  extension?: fhir4.Extension[];
  date?: string;
  lastReviewDate?: string;
}

/**
 * Component which renders a page that displays the JSON data of a resource. Also will eventually
 *  provide the user with the ability to make review comments and visualize previous review comments.
 */
export default function CommentPage() {
  const ctx = trpc.useContext();
  const [dateSelected, setDateSelected] = useState(false);
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
      name: '',
      date: ''
    },
    // An error will be thrown if these fields aren't entered properly
    validate: {
      type: isNotEmpty('Select the type of comment'),
      comment: isNotEmpty('Enter artifact comment')
    }
  });

  // Currently we can only update draft artifact resources.
  const resourceUpdate = trpc.draft.updateDraft.useMutation({
    onSuccess: () => {
      notifications.show({
        title: 'Comment Successfully added!',
        message: `Comment Successfully added to ${resourceType}/${resourceID}`,
        icon: <CircleCheck />,
        color: 'green'
      });
      ctx.draft.getDraftById.invalidate();
    },
    onError: e => {
      notifications.show({
        title: 'Update Failed!',
        message: `Attempt to update ${resourceType} failed with message: ${e.message}`,
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

  function parseUpdate(comment: string, type: string, userName: string, dateSelected: boolean) {
    const additions: DraftArtifactUpdates = {};
    const deletions: DraftArtifactUpdates = {};
    const currentDate = new Date().toISOString();

    const newExtension: fhir4.Extension[] = [];
    newExtension.push({ url: 'type', valueCode: type }, { url: 'text', valueMarkdown: comment });

    if (userName !== '') {
      newExtension.push({ url: 'user', valueString: userName });
    }
    if (dateSelected === true) {
      newExtension.push({ url: 'authoredOn', valueDateTime: currentDate });
    }

    if (resource) {
      if (resource.extension) {
        resource.extension.push({
          extension: newExtension,
          url: 'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-artifactComment'
        });
        additions.extension = resource.extension;
      } else {
        resource.extension = [
          {
            extension: newExtension,
            url: 'http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-artifactComment'
          }
        ];
        additions.extension = resource.extension;
      }

      // update resource dates
      resource.date = currentDate;
      additions.date = resource.date;
      resource.lastReviewDate = currentDate;
      additions.lastReviewDate = resource.lastReviewDate;
    }
    return [additions, deletions];
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
                  <TextInput radius="lg" label="Endorser Name" placeholder="Name" {...form.getInputProps('name')} />
                  <Checkbox
                    ref={ref}
                    id="checkbox"
                    color="white"
                    mt="md"
                    label="Include Date in Comment"
                    {...form.getInputProps('date')}
                    onChange={() => {
                      setDateSelected(!dateSelected);
                    }}
                  />
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
                          setDateSelected(false);
                          form.reset();
                          if (ref?.current?.checked) {
                            ref.current.checked = false;
                          }
                          setIsLoading(false);
                        }, 1000);
                        if (authoring === 'true') {
                          const [additions, deletions] = parseUpdate(
                            form.values.comment,
                            form.values.type,
                            form.values.name,
                            dateSelected
                          );
                          resourceUpdate.mutate({
                            resourceType: resourceType as ArtifactResourceType,
                            id: resourceID as string,
                            additions: additions,
                            deletions: deletions
                          });
                        }
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
