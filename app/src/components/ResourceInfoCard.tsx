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
import { Edit, SquareArrowRight, Trash, AlertCircle, CircleCheck, Report } from 'tabler-icons-react';
import { trpc } from '@/util/trpc';
import { notifications } from '@mantine/notifications';
import DeletionConfirmationModal from './DeletionConfirmationModal';

export interface ResourceInfoCardProps {
  resourceInfo: ResourceInfo;
  authoring?: boolean;
}

const useStyles = createStyles(theme => ({
  card: {
    borderRadius: 6,
    border: `${rem(1)} solid ${theme.colors.gray[3]}`,
    width: '800px',
    [`@media (max-width: ${em(getBreakpointValue(theme.breakpoints.lg) - 1)})`]: {
      width: '100%'
    }
  }
}));

export default function ResourceInfoCard({ resourceInfo, authoring }: ResourceInfoCardProps) {
  const { classes } = useStyles();
  const ctx = trpc.useContext();
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);

  const deleteMutation = trpc.draft.deleteDraft.useMutation({
    onSuccess: () => {
      notifications.show({
        title: `Draft ${resourceInfo.resourceType} Deleted!`,
        message: `Draft ${resourceInfo.resourceType}/${resourceInfo.id} successfully deleted`,
        icon: <CircleCheck />,
        color: 'green'
      });
      ctx.draft.getDraftCounts.invalidate();
      ctx.draft.getDrafts.invalidate();
    },
    onError: e => {
      notifications.show({
        title: `Draft ${resourceInfo.resourceType} Deletion Failed!`,
        message: `Attempt to delete draft of ${resourceInfo.resourceType}/${resourceInfo.id} failed with message: ${e.message}`,
        icon: <AlertCircle />,
        color: 'red'
      });
    }
  });

  return (
    <>
      <DeletionConfirmationModal
        open={isConfirmationModalOpen}
        onClose={() => setIsConfirmationModalOpen(false)}
        modalText={`This will delete draft ${resourceInfo.resourceType} "${
          resourceInfo.name ? resourceInfo.name : `${resourceInfo.resourceType}/${resourceInfo.id}`
        }" permanently.`}
        onConfirm={() => {
          deleteMutation.mutate({
            resourceType: resourceInfo.resourceType,
            id: resourceInfo.id
          });
        }}
      />
      <Paper className={classes.card} shadow="sm" p="md">
        <Grid align="center">
          <Grid.Col span={10}>
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
              href={`/review/${resourceInfo.resourceType}/${resourceInfo.id}authoring=${authoring}`}
              key={`index-${resourceInfo.id}`}
            >
              <Tooltip label={authoring ? 'Review Draft Artifact' : 'Review Artifact'} openDelay={1000}>
                <ActionIcon radius="md" size="md" variant="subtle" color="gray">
                  <Report size="24" />
                </ActionIcon>
              </Tooltip>
            </Link>
            {authoring && (
              <Tooltip label={'Delete Draft Resource'} openDelay={1000}>
                <ActionIcon
                  radius="md"
                  size="md"
                  variant="subtle"
                  color="red"
                  onClick={() => setIsConfirmationModalOpen(true)}
                >
                  <Trash size="24" />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>
        </Grid>
      </Paper>
    </>
  );
}
