import { Accordion, Center, createStyles, em, getBreakpointValue, List, Paper, rem } from '@mantine/core';

interface codeInterface {
  code: string;
  system: string;
}

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

/**
 * Component which displays all data requirements of a specified resource and displays them
 * as resource cards that contain all required information
 */
function DataRequirements({ props }: any) {
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
      const code: codeInterface = { code: element?.code, system: element?.system };
      codes.push(code);
    });
  });

  return (
    <Center>
      <Paper className={classes.card} shadow="sm" p="md">
        <Accordion variant="contained" radius="lg" defaultValue="customization">
          <Accordion.Item value="customization">
            <Accordion.Control>
              {' '}
              <Center>
                <h2>{type} </h2>
              </Center>
            </Accordion.Control>
            <Accordion.Panel>
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
                      <b>DateFilter:</b>
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
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      </Paper>
    </Center>
  );
}

export default DataRequirements;
