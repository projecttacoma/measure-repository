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
import { Edit, SquareArrowRight, Trash, AlertCircle, CircleCheck, Report, Copy } from 'tabler-icons-react';
import { trpc } from '@/util/trpc';
import { notifications } from '@mantine/notifications';
import ConfirmationModal from './ConfirmationModal';

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
  const [isCloneConfirmationModalOpen, setIsCloneConfirmationModalOpen] = useState(false);

  const successNotification = (resourceType: string, childArtifact: boolean, action: string, idOrUrl?: string) => {
    let message;
    if (childArtifact) {
      message = `Draft of child ${resourceType} artifact of url ${idOrUrl} successfully ${
        action === 'delete' ? 'deleted' : 'cloned'
      }`;
    } else {
      message = `Draft of ${resourceType}/${idOrUrl} successfully ${action === 'delete' ? 'deleted' : 'cloned'}`;
    }
    notifications.show({
      title: `${resourceType} ${action === 'delete' ? 'Deleted' : 'Cloned'}!`,
      message: message,
      icon: <CircleCheck />,
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
      message = `Attempt to ${action} draft of child ${resourceType} artifact of url ${idOrUrl} failed with message: ${errorMessage}`;
    } else {
      message = `Attempt to ${action} draft of ${resourceType}/${idOrUrl} failed with message: ${errorMessage}`;
    }
    notifications.show({
      title: `${resourceType} ${action === 'delete' ? 'Deletion' : 'Clone'} Failed!`,
      message: message,
      icon: <AlertCircle />,
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
      setIsCloneConfirmationModalOpen(false);
    },
    onError: (e, variables) => {
      errorNotification(variables.resourceType, e.message, false, 'clone', variables.id);
    }
  });

  const deleteMutation = trpc.draft.deleteDraft.useMutation({
    onSuccess: (data, variables) => {
      successNotification(variables.resourceType, false, 'delete', variables.id);
      data.children.forEach(c => {
        successNotification(c.resourceType, true, 'delete', c.url);
      });
      utils.draft.getDrafts.invalidate();
      setIsCloneConfirmationModalOpen(false);
    },
    onError: (e, variables) => {
      errorNotification(variables.resourceType, e.message, false, 'delete', variables.id);
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
        modalText={`This will clone draft ${resourceInfo.resourceType} "${
          resourceInfo.name ? resourceInfo.name : `${resourceInfo.resourceType}/${resourceInfo.id}`
        }" and any child artifacts.`}
      />
      <ConfirmationModal
        open={isDeleteConfirmationModalOpen}
        onClose={() => setIsDeleteConfirmationModalOpen(false)}
        onConfirm={() => {
          deleteMutation.mutate({
            resourceType: resourceInfo.resourceType,
            id: resourceInfo.id
          });
        }}
        action="delete"
        modalText={`This will delete draft ${resourceInfo.resourceType} "${
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
                  {authoring ? <Edit size="24" /> : <SquareArrowRight size="24" />}
                </ActionIcon>
              </Tooltip>
            </Link>
            <Link
              href={{
                pathname: `/review/${resourceInfo.resourceType}/${resourceInfo.id}`,
                query: { authoring: `${authoring}` }
              }}
            >
              <Tooltip label={authoring ? 'Review Draft Resource' : 'Review Resource'} openDelay={1000}>
                <ActionIcon radius="md" size="md" variant="subtle" color="blue">
                  <Report size="24" />
                </ActionIcon>
              </Tooltip>
            </Link>
            {authoring &&
              (resourceInfo.isChild ? (
                <Group>
                  <Tooltip label={'Child artifacts cannot be directly cloned'}>
                    <span>
                      <ActionIcon radius="md" size="md" disabled={true}>
                        <Copy size="24" />
                      </ActionIcon>
                    </span>
                  </Tooltip>
                  <Tooltip label={'Child artifacts cannot be directly deleted'} openDelay={1000}>
                    <span>
                      <ActionIcon radius="md" size="md" disabled={true}>
                        <Trash size="24" />
                      </ActionIcon>
                    </span>
                  </Tooltip>
                </Group>
              ) : (
                <Group>
                  <Tooltip label={'Clone Draft Resource'} openDelay={1000}>
                    <ActionIcon
                      radius="md"
                      size="md"
                      variant="subtle"
                      color="green"
                      onClick={() => setIsCloneConfirmationModalOpen(true)}
                    >
                      <Copy size="24" />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label={'Delete Draft Resource'} openDelay={1000}>
                    <ActionIcon
                      radius="md"
                      size="md"
                      variant="subtle"
                      color="red"
                      onClick={() => setIsDeleteConfirmationModalOpen(true)}
                    >
                      <Trash size="24" />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              ))}
          </Group>
        </Grid>
      </Paper>
    </>
  );
}
