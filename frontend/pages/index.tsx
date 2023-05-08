import { Anchor, Divider, List, Table, Text, Title } from '@mantine/core';
import { GetServerSideProps, InferGetServerSidePropsType } from 'next';

export default function Home({ capabilityStatement }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', flexDirection: 'column', padding: '4px 20px' }}>
      <Title order={2} underline>
        Summary:
      </Title>
      <Text>
        This application is an interface for a prototype implementation of a{' '}
        <Anchor href="https://build.fhir.org/ig/HL7/cqf-measures/measure-repository-service.html">
          FHIR Measure Repository Service
        </Anchor>{' '}
        with Measure and Library authoring capabilities.
      </Text>
      <Divider my="sm" variant="dotted" />
      <Title order={2} underline>
        Getting Started:
      </Title>
      <Text>
        The backend Measure Repository Service server must be running on port 3000 in order for this application to pull
        data from the server. To start the backend Measure Repository Service server on port 3000, run &quot;npm run
        start:all&quot; or &quot;npm run start:backend&quot; from the root of the repository.
      </Text>
      <Text>More functionality coming soon!</Text>
      <Divider my="sm" variant="dotted" />
      <Title order={2} underline style={{ marginBottom: '8px' }}>
        Capabilities:
      </Title>
      <Title order={3} underline>
        Capability Statement
      </Title>
      <div style={{ marginBottom: '8px' }}>
        {capabilityStatement ? (
          <Table>
            <thead>
              <tr>
                <th>Resource</th>
                <th>Operations</th>
                <th>Search Parameters</th>
              </tr>
            </thead>
            <tbody>{capabilityStatement.rest?.[0]?.resource?.map(r => CapabilityRow(r))}</tbody>
          </Table>
        ) : (
          <Text c="red.7" style={{ marginBottom: '8px' }}>
            Capability Statement Unavailable
          </Text>
        )}
      </div>
      <Title order={3} underline>
        Resource Read and Search
      </Title>
      <Text style={{ marginBottom: '8px' }}>
        This application provides an interface for Measure Repository Service read and search operations. Users can view
        the JSON content of resources on the server by clicking the desired resource type in the navigation bar, then
        selecting the resource from the displayed list. Resources can also be searched for by any of their{' '}
        <Anchor href="https://build.fhir.org/ig/HL7/cqf-measures/measure-repository-service.html#search">
          core search
        </Anchor>{' '}
        parameters on the search page.
      </Text>
      <Title order={3} underline>
        Authoring Functionality
      </Title>
      <Text>
        This application will provide a FHIR Measure and Library authoring environment as outlined in the{' '}
        <Anchor href="https://build.fhir.org/ig/HL7/cqf-measures/measure-repository-service.html#authoring-measure-repository">
          Authoring Measure Repository spec
        </Anchor>
        . This environment will provide users with the ability to draft new Measures and Libraries from existing ones
        and revise the content of these resources in a JSON editor. Users will be able to publish their drafted
        resources and submit them to the Measure Repository Service server upon completion.
      </Text>
      <Divider my="sm" variant="dotted" />
      <Title order={2} underline>
        Links:
      </Title>
      <List withPadding>
        <List.Item>
          <Anchor href="https://build.fhir.org/ig/HL7/cqf-measures/measure-repository-service.html">
            Measure Repository Service FHIR Implementation Guide
          </Anchor>
        </List.Item>
        <List.Item>
          <Anchor href="https://build.fhir.org/ig/HL7/cqf-measures/measure-repository-service.html#authoring-measure-repository">
            Authoring Measure Repository
          </Anchor>
        </List.Item>
        <List.Item>
          <Anchor href="https://github.com/projecttacoma/measure-repository">
            ProjectTacoma Measure Repository Github
          </Anchor>
        </List.Item>
        <List.Item>
          <Anchor href="https://github.com/projecttacoma/measure-repository/blob/main/frontend/README.md">
            ProjectTacoma Measure Repository Frontend README
          </Anchor>
        </List.Item>
        <List.Item>
          <Anchor href="https://github.com/projecttacoma/measure-repository/blob/main/backend/README.md">
            ProjectTacoma Measure Repository Backend README
          </Anchor>
        </List.Item>
      </List>
    </div>
  );
}

export function CapabilityRow(resource: fhir4.CapabilityStatementRestResource) {
  return (
    <tr key={`row-${resource.type}`}>
      <td>{resource.type}</td>
      <td>
        {resource.operation
          ?.map(o => {
            return o.name;
          })
          .join(', ')}
      </td>
      <td>
        {resource.searchParam
          ?.map(sp => {
            return sp.name;
          })
          .join(', ')}
      </td>
    </tr>
  );
}

export const getServerSideProps: GetServerSideProps<{
  capabilityStatement: fhir4.CapabilityStatement | null;
}> = async () => {
  // Fetch CapabilityStatement
  const res = await fetch(`${process.env.NEXT_PUBLIC_MRS_SERVER}/metadata`);
  const capabilityStatement = res.status === 200 ? ((await res.json()) as fhir4.CapabilityStatement) : null;

  // Pass to the page via props
  return { props: { capabilityStatement } };
};
