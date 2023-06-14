import { ActionIcon, Grid, Paper, Text, createStyles, em, getBreakpointValue, rem, Tooltip } from '@mantine/core';
import Link from 'next/link';
import React from 'react';
import { ResourceInfo } from '@/util/types/fhir';
import { Edit, ExternalLink } from 'tabler-icons-react';

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
  return (
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
              {authoring ? <Edit size="24" /> : <ExternalLink size="24" />}
            </ActionIcon>
          </Tooltip>
        </Link>
      </Grid>
    </Paper>
  );
}
