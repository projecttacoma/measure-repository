import { Accordion, Center, createStyles, em, getBreakpointValue, List, Paper, rem } from '@mantine/core';

interface codeInterface {
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
  const codes: codeInterface[] = [];

  const valueSets = codeFilter?.filter(function (x: fhir4.DataRequirementCodeFilter) {
    return x?.valueSet !== undefined;
  });

  codeFilter?.forEach((arr: fhir4.DataRequirementCodeFilter) => {
    arr?.code?.forEach((element: fhir4.Coding) => {
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
                  <b>Extension(s): </b>
                  <br />
                </List.Item>
                <List withPadding>
                  {extension?.map((item: any, index: any, index2: any) => (
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
                {dateFilter && dateFilter?.length > 0 && (
                  <>
                    <List.Item>
                      <b>DateFilter(s):</b>
                    </List.Item>
                    <List withPadding>
                      {dateFilter?.map((item: fhir4.DataRequirementDateFilter, index: any, index2: any) => (
                        <>
                          <List.Item key={index}>
                            <b> Start Date: </b>
                            {item?.valuePeriod?.start} <br />
                          </List.Item>
                          <List.Item key={index2}>
                            <b> End Date: </b> {item?.valuePeriod?.end} <br />
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
                {valueSets && valueSets.length > 0 && (
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
