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

export interface ResourceInformation {
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
function Dependencies(props: { value: fhir4.RelatedArtifact; sourceName: string | undefined }) {
  const { classes } = useStyles();
  const type = props.value.type;
  const display = props.value.display;
  const resource = props.value.resource;
  const sourceName = JSON.stringify(props.sourceName);

  let resourceInfo: ResourceInformation = {};

  if (resource?.includes('Library')) {
    let substr = resource.substring(resource.indexOf('Library'));
    let myArray: string[] = substr?.split('|');
    resourceInfo = { type: 'Library', link: myArray[0] };
  } else if (resource?.includes('Measure')) {
    let substr = resource.substring(resource.indexOf('Measure'));
    let myArray: string[] = substr?.split('|');
    resourceInfo = { type: 'Measure', link: myArray[0] };
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
                  {resource}
                </Text>
              </div>
            </Grid.Col>
            {resourceInfo?.type && (
              <Link href={`http://localhost:3001/${resourceInfo?.link}#JSON`} key={1}>
                <Tooltip label={'Open to Resource'} openDelay={1000}>
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
