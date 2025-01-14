import {
  ActionIcon,
  createStyles,
  em,
  getBreakpointValue,
  Grid,
  Group,
  Paper,
  rem,
  Text,
  Tooltip
} from '@mantine/core';
import Link from 'next/link';
import React, { useState } from 'react';
import { ResourceInfo } from '@/util/types/fhir';
import {
  IconEdit,
  IconSquareArrowRight,
  IconTrash,
  IconAlertCircle,
  IconCircleCheck,
  IconMessage,
  IconCopy,
  IconFolder,
  IconArchive
} from '@tabler/icons-react';
import { trpc } from '@/util/trpc';
import { notifications } from '@mantine/notifications';
import ConfirmationModal from './ConfirmationModal';
import { useRouter } from 'next/router';

export interface ResourceInfoCardProps {
  resourceInfo: ResourceInfo;
  authoring?: boolean;
}

const useStyles = createStyles(theme => ({
  card: {
    borderRadius: 6,
    border: `${rem(1)} solid ${theme.colors.gray[3]}`,
    width: '900px',
    [`@media (max-width: ${em(getBreakpointValue(theme.breakpoints.lg) - 1)})`]: {
      width: '100%'
    }
  }
}));

export default function ResourceInfoCard({ resourceInfo, authoring }: ResourceInfoCardProps) {
  const { classes } = useStyles();
  const utils = trpc.useUtils();
  const [isDeleteConfirmationModalOpen, setIsDeleteConfirmationModalOpen] = useState(false);
  const [isRetireConfirmationModalOpen, setIsRetireConfirmationModalOpen] = useState(false);
  const [isArchiveConfirmationModalOpen, setIsArchiveConfirmationModalOpen] = useState(false);
  const [isCloneConfirmationModalOpen, setIsCloneConfirmationModalOpen] = useState(false);
  const authoringEnvironment = trpc.service.getAuthoring.useQuery();

  const router = useRouter();

  const successNotification = (resourceType: string, childArtifact: boolean, action: string, idOrUrl?: string) => {
    let message;
    if (childArtifact) {
      message = `Child ${resourceType} artifact of url ${idOrUrl} successfully ${
        action === 'withdraw' ? 'withdrawn' : 'cloned'
      }`;
    } else {
      message = `${resourceType}/${idOrUrl} successfully ${action === 'withdraw' ? 'withdrawn' : 'cloned'}`;
    }
    notifications.show({
      title: `${resourceType} ${action === 'withdraw' ? 'Withdrawn' : 'Cloned'}!`,
      message: message,
      icon: <IconCircleCheck />,
      color: 'green'
    });
    utils.draft.getDraftCounts.invalidate();
  };

  const errorNotification = (
    resourceType: string,
    errorMessage: string,
    childArtifact: boolean,
    action: string,
    idOrUrl?: string
  ) => {
    let message;
    if (childArtifact) {
      message = `Attempt to ${action} child ${resourceType} artifact of url ${idOrUrl} failed with message: ${errorMessage}`;
    } else {
      message = `Attempt to ${action} ${resourceType}/${idOrUrl} failed with message: ${errorMessage}`;
    }
    notifications.show({
      title: `${resourceType} ${action === 'withdraw' ? 'Withdrawal' : 'Clone'} Failed!`,
      message: message,
      icon: <IconAlertCircle />,
      color: 'red'
    });
  };

  const cloneMutation = trpc.draft.cloneParent.useMutation({
    onSuccess: (data, variables) => {
      successNotification(variables.resourceType, false, 'clone', variables.id);
      data.children.forEach(c => {
        successNotification(c.resourceType, true, 'clone', c.url);
      });
      utils.draft.getDrafts.invalidate();
      router.replace(router.asPath);
      utils.service.getArtifactCounts.invalidate();
      setIsCloneConfirmationModalOpen(false);
    },
    onError: (e, variables) => {
      errorNotification(variables.resourceType, e.message, false, 'clone', variables.id);
    }
  });

  const withdrawMutation = trpc.draft.deleteDraft.useMutation({
    onSuccess: (data, variables) => {
      successNotification(variables.resourceType, false, 'withdraw', variables.id);
      data.children.forEach(c => {
        successNotification(c.resourceType, true, 'withdraw', c.url);
      });
      utils.draft.getDrafts.invalidate();
      router.replace(router.asPath);
      utils.service.getArtifactCounts.invalidate();
      setIsDeleteConfirmationModalOpen(false);
    },
    onError: (e, variables) => {
      errorNotification(variables.resourceType, e.message, false, 'withdraw', variables.id);
    }
  });

  const retireMutation = trpc.service.retireParent.useMutation({
    onSuccess: (data, variables) => {
      notifications.show({
        title: `${variables.resourceType} retired!`,
        message: `${data.location} successfully retired!`,
        icon: <IconCircleCheck />,
        color: 'green'
      });
      data.retired?.forEach(r => {
        notifications.show({
          title: `${r.resourceType} retired!`,
          message: `${r.resourceType}/${r.id} successfully retired!`,
          icon: <IconCircleCheck />,
          color: 'green'
        });
      });
      router.replace(router.asPath);
      utils.service.getArtifactCounts.invalidate();
      setIsRetireConfirmationModalOpen(false);
    },
    onError: (e, variables) => {
      errorNotification(variables.resourceType, e.message, false, 'retire', variables.id);
    }
  });

  const archiveMutation = trpc.service.archiveParent.useMutation({
    onSuccess: (data, variables) => {
      notifications.show({
        title: `${variables.resourceType} archived!`,
        message: `${data.location} successfully archived!`,
        icon: <IconCircleCheck />,
        color: 'green'
      });
      data.archived?.forEach(r => {
        notifications.show({
          title: `${r.resourceType} archived!`,
          message: `${r.resourceType}/${r.id} successfully archived!`,
          icon: <IconCircleCheck />,
          color: 'green'
        });
      });
      router.replace(router.asPath);
      utils.service.getArtifactCounts.invalidate();
      setIsArchiveConfirmationModalOpen(false);
    },
    onError: (e, variables) => {
      errorNotification(variables.resourceType, e.message, false, 'archive', variables.id);
    }
  });

  return (
    <>
      <ConfirmationModal
        open={isCloneConfirmationModalOpen}
        onClose={() => setIsCloneConfirmationModalOpen(false)}
        onConfirm={() => {
          cloneMutation.mutate({
            resourceType: resourceInfo.resourceType,
            id: resourceInfo.id
          });
        }}
        action="clone"
        modalText={`This will clone ${resourceInfo.resourceType} "${
          resourceInfo.name ? resourceInfo.name : `${resourceInfo.resourceType}/${resourceInfo.id}`
        }" and any child artifacts.`}
      />
      <ConfirmationModal
        open={isDeleteConfirmationModalOpen}
        onClose={() => setIsDeleteConfirmationModalOpen(false)}
        onConfirm={() => {
          withdrawMutation.mutate({
            resourceType: resourceInfo.resourceType,
            id: resourceInfo.id
          });
        }}
        action="withdraw"
        modalText={`This will withdraw draft ${resourceInfo.resourceType} "${
          resourceInfo.name ? resourceInfo.name : `${resourceInfo.resourceType}/${resourceInfo.id}`
        }" and any child artifacts permanently.`}
      />
      <ConfirmationModal
        open={isRetireConfirmationModalOpen}
        onClose={() => setIsRetireConfirmationModalOpen(false)}
        onConfirm={() => {
          retireMutation.mutate({
            resourceType: resourceInfo.resourceType,
            id: resourceInfo.id
          });
        }}
        action="retire"
        modalText={`This will retire ${resourceInfo.resourceType} "${
          resourceInfo.name ? resourceInfo.name : `${resourceInfo.resourceType}/${resourceInfo.id}`
        }" and any child artifacts permanently.`}
      />
      <ConfirmationModal
        open={isArchiveConfirmationModalOpen}
        onClose={() => setIsArchiveConfirmationModalOpen(false)}
        onConfirm={() => {
          archiveMutation.mutate({
            resourceType: resourceInfo.resourceType,
            id: resourceInfo.id
          });
        }}
        action="archive"
        modalText={`This will archive ${resourceInfo.resourceType} "${
          resourceInfo.name ? resourceInfo.name : `${resourceInfo.resourceType}/${resourceInfo.id}`
        }" and any child artifacts permanently.`}
      />
      <Paper className={classes.card} shadow="sm" p="md">
        <Grid align="center">
          <Grid.Col span={9}>
            <div>
              <Text size="lg" fw={700}>
                {resourceInfo.name ? resourceInfo.name : `${resourceInfo.resourceType}/${resourceInfo.id}`}
              </Text>
            </div>
            {resourceInfo.version ? (
              <Text size="sm">
                {`v${resourceInfo.version}`} {resourceInfo.status && <b> ({resourceInfo.status})</b>}
              </Text>
            ) : (
              <Text size="sm">{resourceInfo.status && <b>Status: {resourceInfo.status}</b>}</Text>
            )}
            {resourceInfo.url && (
              <Text size="sm">
                {resourceInfo.url}
                {resourceInfo.version && `|${resourceInfo.version}`}
              </Text>
            )}
            {resourceInfo.identifier && (
              <Text size="sm">
                <i>Identifier: </i>
                {resourceInfo.identifier}
              </Text>
            )}
          </Grid.Col>
          <Group>
            <Link
              href={
                authoring
                  ? `/authoring/${resourceInfo.resourceType}/${resourceInfo.id}`
                  : `/${resourceInfo.resourceType}/${resourceInfo.id}`
              }
              key={resourceInfo.id}
            >
              <Tooltip label={authoring ? 'Edit Draft Resource' : 'View Resource Contents'} openDelay={1000}>
                <ActionIcon radius="md" size="md" variant="subtle" color="gray">
                  {authoring ? <IconEdit size="24" /> : <IconSquareArrowRight size="24" />}
                </ActionIcon>
              </Tooltip>
            </Link>
            {authoringEnvironment.data && (
              <Group>
                <Link
                  href={{
                    pathname: `/review/${resourceInfo.resourceType}/${resourceInfo.id}`,
                    query: { authoring: `${authoring}` }
                  }}
                >
                  <Tooltip label={authoring ? 'Review Draft Resource' : 'Review Resource'} openDelay={1000}>
                    <ActionIcon radius="md" size="md" variant="subtle" color="blue">
                      <IconMessage size="24" />
                    </ActionIcon>
                  </Tooltip>
                </Link>
                {resourceInfo.isChild ? (
                  <Tooltip label={'Child artifacts cannot be directly cloned'}>
                    <span>
                      <ActionIcon radius="md" size="md" disabled={true}>
                        <IconCopy size="24" />
                      </ActionIcon>
                    </span>
                  </Tooltip>
                ) : (
                  <Tooltip label={authoring ? 'Clone Draft Resource' : 'Clone Resource'} openDelay={1000}>
                    <ActionIcon
                      radius="md"
                      size="md"
                      variant="subtle"
                      color="yellow"
                      onClick={() => setIsCloneConfirmationModalOpen(true)}
                    >
                      <IconCopy size="24" />
                    </ActionIcon>
                  </Tooltip>
                )}
              </Group>
            )}
            {authoring ? (
              authoringEnvironment.data &&
              (resourceInfo.isChild ? (
                <Tooltip label={'Child artifacts cannot be directly withdrawn'} openDelay={1000}>
                  <span>
                    <ActionIcon radius="md" size="md" disabled={true}>
                      <IconTrash size="24" />
                    </ActionIcon>
                  </span>
                </Tooltip>
              ) : (
                <Group>
                  <Tooltip label={'Withdraw Draft Resource'} openDelay={1000}>
                    <ActionIcon
                      radius="md"
                      size="md"
                      variant="subtle"
                      color="red"
                      onClick={() => setIsDeleteConfirmationModalOpen(true)}
                    >
                      <IconTrash size="24" />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              ))
            ) : resourceInfo.status === 'active' ? (
              resourceInfo.isChild ? (
                <Tooltip label={'Child artifacts cannot be directly retired'}>
                  <span>
                    <ActionIcon radius="md" size="md" disabled={true}>
                      <IconFolder size="24" />
                    </ActionIcon>
                  </span>
                </Tooltip>
              ) : (
                <Tooltip label={'Retire Resource'} openDelay={1000}>
                  <ActionIcon
                    radius="md"
                    size="md"
                    variant="subtle"
                    color="red"
                    onClick={() => setIsRetireConfirmationModalOpen(true)}
                  >
                    <IconFolder size="24" />
                  </ActionIcon>
                </Tooltip>
              )
            ) : resourceInfo.isChild ? (
              <Tooltip label={'Child artifacts cannot be directly archived'}>
                <span>
                  <ActionIcon radius="md" size="md" disabled={true}>
                    <IconArchive size="24" />
                  </ActionIcon>
                </span>
              </Tooltip>
            ) : (
              <Tooltip label={'Archive Resource'} openDelay={1000}>
                <ActionIcon
                  radius="md"
                  size="md"
                  variant="subtle"
                  color="red"
                  onClick={() => setIsArchiveConfirmationModalOpen(true)}
                >
                  <IconArchive size="24" />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>
        </Grid>
      </Paper>
    </>
  );
}
