import {
  ActionIcon,
  Center,
  createStyles,
  em,
  Grid,
  Paper,
  Text,
  Tooltip,
  getBreakpointValue,
  rem
} from '@mantine/core';
import Link from 'next/link';
import React from 'react';
import { SquareArrowRight } from 'tabler-icons-react';

interface DependencyInformation {
  type?: string;
  link?: string;
}

const useStyles = createStyles(theme => ({
  card: {
    borderRadius: 6,
    border: `${rem(2)} solid ${theme.colors.gray[3]}`,
    width: '800px',
    [`@media (max-width: ${em(getBreakpointValue(theme.breakpoints.lg) - 1)})`]: {
      width: '100%'
    }
  }
}));

/**
 * Component which displays all data requirement dependencies for a specified resource
 * and displays them as resource cards that contain all required information and link to their
 * respective resources if a link exists
 */
function Dependencies(props: { relatedArtifact: fhir4.RelatedArtifact }) {
  const { classes } = useStyles();
  const display = props.relatedArtifact.display;
  const resourceLink = props.relatedArtifact.resource;

  let dependencyInfo: DependencyInformation = {};

  if (resourceLink?.includes('Library')) {
    const resourceArr: string[] = resourceLink.substring(resourceLink.indexOf('Library')).split('|');
    dependencyInfo = { type: 'Library', link: resourceArr[0] };
  } else if (resourceLink?.includes('Measure')) {
    const resourceArr: string[] = resourceLink.substring(resourceLink.indexOf('Measure')).split('|');
    dependencyInfo = { type: 'Measure', link: resourceArr[0] };
  }

  return (
    <>
      <Center>
        <Paper className={classes.card} shadow="sm" p="md">
          <Grid align="center">
            <Grid.Col span={10}>
              <div>
                <Text size="lg" fw={700}>
                  {display}
                </Text>
              </div>
              <div>
                <Text size="sm" fw={500}>
                  {resourceLink}
                </Text>
              </div>
            </Grid.Col>
            {dependencyInfo.type && (
              <Link href={`/${dependencyInfo.link}`}>
                <Tooltip label={'Open Dependency Resource'} openDelay={1000}>
                  <ActionIcon radius="md" size="md" variant="subtle" color="gray">
                    {<SquareArrowRight size="24" />}
                  </ActionIcon>
                </Tooltip>
              </Link>
            )}
          </Grid>
        </Paper>
      </Center>
    </>
  );
}

export default Dependencies;
