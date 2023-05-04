import { Button, Grid, Paper, Sx, Text, rem } from '@mantine/core';
import Link from 'next/link';
import React from 'react';
import { ResourceInfo } from '@/util/types/fhir';
import { ExternalLink } from 'tabler-icons-react';

export interface ResourceInfoCardProps {
  resourceInfo: ResourceInfo;
}

export default function ResourceInfoCard({ resourceInfo }: ResourceInfoCardProps) {
  return (
    <Paper
      shadow="sm"
      p="md"
      sx={theme => {
        const style: Sx = {
          ':hover': {
            cursor: 'pointer',
            backgroundColor: theme.colors.gray[0]
          },
          borderRadius: 6,
          border: `${rem(1)} solid ${theme.colors.gray[3]}`
        };
        return style;
      }}
    >
      <Grid align="center">
        <Grid.Col span={10}>
          <div>
            <Text size="lg" fw={700}>
              {resourceInfo.name ? resourceInfo.name : resourceInfo.id}
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
              {resourceInfo.url} {resourceInfo.version && `|${resourceInfo.version}`}
            </Text>
          )}
          {resourceInfo.identifier && <Text size="sm">{`Identifier: ${resourceInfo.identifier}`}</Text>}
        </Grid.Col>
        <Link href={`/${resourceInfo.resourceType}/${resourceInfo.id}`} key={resourceInfo.id}>
          <Button radius="md" size="md" variant="subtle" color="gray" rightIcon={<ExternalLink size="24" />} />
        </Link>
      </Grid>
    </Paper>
  );
}
