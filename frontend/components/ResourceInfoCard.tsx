import { Button, Grid, Paper, Sx, Text, rem } from '@mantine/core';
import Link from 'next/link';
import React from 'react';
import { ResourceInfo } from '@/util/types/fhir';
import { ArrowNarrowRight } from 'tabler-icons-react';

export interface ResourceInfoCardProps {
  resourceInfo: ResourceInfo;
  selected?: boolean;
}

export default function PatientInfoCard({ resourceInfo, selected }: ResourceInfoCardProps) {
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
          borderRadius: 12,
          border: `${rem(1)} solid ${theme.colors.gray[3]}`
        };
        if (selected) {
          style.border = `${rem(1)} solid ${theme.colors.blue[3]}`;
        }
        return style;
      }}
    >
      <Grid align="center">
        <Grid.Col span={10}>
          <div>
            <Text size="md" fw={700}>
              {resourceInfo.id}
            </Text>
          </div>
          {selected && (
            <div>
              {Object.entries(resourceInfo).map(([key, val]) => {
                return (
                  val && (
                    <Text size="sm" color="dimmed">
                      {`${key.charAt(0).toUpperCase() + key.slice(1)}: ${val}`}
                    </Text>
                  )
                );
              })}
            </div>
          )}
        </Grid.Col>
        {selected && (
          <div>
            <Grid.Col>
              <Link href={`/${resourceInfo.resourceType}/${resourceInfo.id}`} key={resourceInfo.id}>
                <Button
                  radius="md"
                  size="md"
                  styles={() => ({
                    inner: {
                      justifyContent: 'left'
                    }
                  })}
                  rightIcon={<ArrowNarrowRight size="24" />}
                >
                  View
                </Button>
              </Link>
            </Grid.Col>
          </div>
        )}
      </Grid>
    </Paper>
  );
}
