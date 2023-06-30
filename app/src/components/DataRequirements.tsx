import { Accordion, Center, createStyles, em, getBreakpointValue, List, Paper, rem } from '@mantine/core';

interface CodeInterface {
  code: string | undefined;
  system: string | undefined;
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
function DataRequirements({ type, extension, dateFilter, codeFilter }: fhir4.DataRequirement) {
  const { classes } = useStyles();
  const codes: CodeInterface[] = [];

  const codeFiltersWithVS = codeFilter?.filter(cf => {
    return cf?.valueSet !== undefined;
  });

  codeFilter?.forEach(cf => {
    cf?.code?.forEach(c => {
      const code: CodeInterface = { code: c.code, system: c.system };
      codes.push(code);
    });
  });

  return (
    <Center>
      <Paper className={classes.card} shadow="sm" p="md">
        <Accordion variant="contained" radius="lg" defaultValue="customization">
          <Accordion.Item value="customization">
            <Accordion.Control>
              <Center>
                <h2>{type} </h2>
              </Center>
            </Accordion.Control>
            <Accordion.Panel>
              <List>
                <List.Item>
                  <b>Extension(s): </b>
                  <br />
                </List.Item>
                <List withPadding>
                  {extension?.map(e => (
                    <>
                      <List.Item>
                        <b>URL:</b>
                        {e.url}
                      </List.Item>
                      {e?.valueString && (
                        <List.Item>
                          <b> ValueString: </b>
                          {e.valueString}
                        </List.Item>
                      )}
                      <br />
                    </>
                  ))}
                </List>
                {dateFilter && dateFilter?.length > 0 && (
                  <>
                    <List.Item>
                      <b>DateFilter(s):</b>
                    </List.Item>
                    <List withPadding>
                      {dateFilter?.map(data => (
                        <>
                          <List.Item>
                            <b> Start Date: </b>
                            {data?.valuePeriod?.start} <br />
                          </List.Item>
                          <List.Item>
                            <b> End Date: </b> {data?.valuePeriod?.end} <br />
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
                      {codes.map(codeInterface => (
                        <>
                          {codeInterface.code && (
                            <List.Item>
                              <b> Code: </b> {codeInterface?.code} <br />
                            </List.Item>
                          )}
                          {codeInterface.system && (
                            <List.Item>
                              <b> System: </b> {codeInterface?.system} <br />
                            </List.Item>
                          )}
                          <br />
                        </>
                      ))}
                    </List>
                  </List>
                )}
                {codeFiltersWithVS && codeFiltersWithVS.length > 0 && (
                  <List withPadding>
                    <List.Item>
                      <b>Value Set(s):</b>
                    </List.Item>
                    <List withPadding>
                      {codeFiltersWithVS.map(c => (
                        <List.Item>
                          {c.valueSet} <br />
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
