import React from 'react';
import { Center, Grid, List, Space, Table, Text } from '@mantine/core';
import { useEffect, useState } from 'react';
import { useHover } from '@mantine/hooks';

interface modalProps {
  header: string;
  context?: string;
  originalColor: string;
  date?: any;
}

export default function DraftListItem({ header, context, originalColor, date }: modalProps) {
  const [color, setColor] = useState(originalColor);
  const { hovered, ref } = useHover();

  // Changes the color of the div element text depending on if the user is hovering over it
  useEffect(() => {
    if (hovered === true) {
      setColor('#E9ECEF');
    } else {
      setColor(originalColor);
    }
  }, [hovered, originalColor]);

  if (date) {
    const rows = (
      <tr key={date}>
        <td>{date.start}</td>
        <td>{date.end}</td>
      </tr>
    );
    const ths = (
      <tr>
        <th>{`Start Date`}</th>
        <th>{`End Date`}</th>
      </tr>
    );

    return (
      <>
        <Center>
          <List.Item>
            <div
              ref={ref}
              style={{
                width: '900px',
                backgroundColor: color,
                height: '95px',
                wordBreak: 'break-word',
                overflow: 'scroll'
              }}
            >
              <Grid justify="apart">
                <Grid.Col span={3}>
                  <Center h={'75px'}>
                    <Text size="md" color="#495057" fw={400}>
                      <b>{header}</b>:
                    </Text>
                  </Center>
                </Grid.Col>
                <Center h={'115px'}>
                  <List.Item>
                    <Table horizontalSpacing="xl" highlightOnHover withBorder withColumnBorders>
                      <thead>{ths}</thead>
                      <tbody>{rows}</tbody>
                    </Table>
                  </List.Item>
                </Center>
              </Grid>
            </div>
          </List.Item>
        </Center>
        <Space />
      </>
    );
  } else {
    return (
      <>
        <Center>
          <List.Item>
            <div
              ref={ref}
              style={{
                width: '900px',
                backgroundColor: color,
                height: '65px',
                wordBreak: 'break-word',
                overflow: 'scroll'
              }}
            >
              <Grid justify="apart">
                <Grid.Col span={3}>
                  <Center h={'75px'}>
                    <Text size="md" color="#495057" fw={400}>
                      <b>{header}</b>:
                    </Text>
                  </Center>
                </Grid.Col>
                <Grid.Col span={9}>
                  <Space h="xl" />
                  <Text style={{ overflow: 'scroll', wordBreak: 'break-word' }} size="sm" color="#495057" fw={400}>
                    <i>{context}</i>
                  </Text>
                </Grid.Col>
              </Grid>
            </div>
          </List.Item>
        </Center>
        <Space />
      </>
    );
  }
}
