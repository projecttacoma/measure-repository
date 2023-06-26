import { Button, Center, Collapse, createStyles, em, getBreakpointValue, List, Paper, rem } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { ArrowsMaximize, ArrowsMinimize } from 'tabler-icons-react';
import { useState } from 'react';

const useStyles = createStyles(theme => ({
  card: {
    borderRadius: 12,
    border: `${rem(2)} solid ${theme.colors.gray[3]}`,
    width: '1200px',
    [`@media (max-width: ${em(getBreakpointValue(theme.breakpoints.lg) - 1)})`]: {
      width: '100%'
    }
  }
}));

interface codeInterface {
  code: string;
  system: string;
}

/**
 * Component which takes in data requirements and then reformats it in a new div element
 */
function DataRequirements({ props }: any) {
  const [opened, { toggle }] = useDisclosure(false);
  // const [buttonIcon, setButtonicon] = useState(<ArrowsMaximize />);
  const { classes } = useStyles();

  const type = props.type;
  const extensions = props.extension;
  const dateFilters = props.dateFilter;
  const codeFilters = props.codeFilter;
  const codes: codeInterface[] = [];
  const valueSets = props.codeFilter.filter(function (x: any) {
    return x?.valueSet !== undefined;
  });

  codeFilters?.forEach((arr: { code: { code: any; system: any }[] }) => {
    arr?.code?.forEach((element: { code: any; system: any }) => {
      let code: codeInterface = { code: element?.code, system: element?.system };
      codes.push(code);
    });
  });

  return (
    <>
      {/* <Center>
        <Paper className={classes.card} shadow="sm" p="md">
          <Group position="center" mb={5}>
            <Button onClick={toggle}>Toggle with linear transition</Button>
          </Group>
        </Paper>
      </Center> */}

      <Center>
        <Paper className={classes.card} shadow="sm" p="md">
          <div>
            {/* <Group> */}
            <Center>
              {/* <h2>Requirements</h2> */}
              <Button variant="default" color="green" size="lg" leftIcon={<ArrowsMaximize />} onClick={toggle}>
                Click to Expand
              </Button>
            </Center>
            {/* </Group> */}
            <Collapse in={opened} transitionDuration={500} transitionTimingFunction="linear">
              <br />
              <List>
                <List.Item>
                  <b>Type: </b>
                  {type}
                </List.Item>
                <br />
                <List.Item>
                  <b>Extension: </b>
                  <br />
                </List.Item>
                <List withPadding>
                  {extensions.map((item: any, index: any, index2: any) => (
                    <>
                      {item?.url != undefined && (
                        <List.Item key={index}>
                          <b> URL: </b>
                          {item.url}{' '}
                        </List.Item>
                      )}
                      {item?.valueString != undefined && (
                        <List.Item key={index2}>
                          <b> ValueString: </b>
                          {item.valueString}{' '}
                        </List.Item>
                      )}
                      <br />
                    </>
                  ))}
                </List>
                {dateFilters?.length > 0 && (
                  <>
                    <List.Item>
                      <b>DateFilter(s):</b>
                    </List.Item>
                    <List withPadding>
                      {dateFilters?.map((item: any, index: any, index2: any) => (
                        <>
                          <List.Item key={index}>
                            <b> Start Date: </b>
                            {new Date(item.valuePeriod.start).getUTCMonth() + 1}/
                            {new Date(item.valuePeriod.start).getUTCDate()}/
                            {new Date(item.valuePeriod.start).getUTCFullYear()} <br />
                          </List.Item>
                          <List.Item key={index2}>
                            <b> End Date: </b> {new Date(item.valuePeriod.end).getUTCMonth() + 1}/
                            {new Date(item.valuePeriod.end).getUTCDate()}/
                            {new Date(item.valuePeriod.end).getUTCFullYear()} <br />
                          </List.Item>
                        </>
                      ))}
                    </List>
                  </>
                )}
                <br />
                <List.Item>
                  <b>CodeFilter(s):</b>
                </List.Item>
                {/* ))} */}
                {codes.length > 0 && (
                  <List withPadding>
                    <List.Item>
                      <b>Code(s):</b>
                    </List.Item>
                    <List withPadding>
                      {codes?.map((item: any, index: any, index2: any) => (
                        <>
                          {item?.code && (
                            <List.Item key={index}>
                              <b> Code: </b> {item?.code} <br />
                            </List.Item>
                          )}
                          {item?.system && (
                            <List.Item key={index2}>
                              <b> System: </b> {item?.system} <br />
                            </List.Item>
                          )}
                          <br />
                        </>
                      ))}
                    </List>
                  </List>
                )}
                {valueSets.length > 0 && (
                  <List withPadding>
                    <List.Item>
                      <b>Value Set(s):</b>
                    </List.Item>
                    <List withPadding>
                      {valueSets?.map((item: any, index3: any) => (
                        <List.Item key={index3}>
                          {item?.valueSet} <br />
                        </List.Item>
                      ))}
                    </List>
                  </List>
                )}
              </List>
            </Collapse>
          </div>
        </Paper>
      </Center>
    </>
  );
}

export default DataRequirements;
