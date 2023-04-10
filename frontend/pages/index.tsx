import { Anchor, Center, Divider, List, Text, Title } from '@mantine/core';

export default function Home() {
  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', flexDirection: 'column', padding: '4px 20px' }}>
      <Center style={{ flexDirection: 'column', width: '100%' }}>
        <Title order={1} underline>
          Measure Repository Service
        </Title>
      </Center>
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
      <Title order={2} underline>
        Authoring Functionality:
      </Title>
      <Text>
        This application will provide a FHIR Measure authoring environment as outlined in the{' '}
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
            ProjectTacoma Measure Repository frontend README
          </Anchor>
        </List.Item>
        <List.Item>
          <Anchor href="https://github.com/projecttacoma/measure-repository/blob/main/backend/README.md">
            ProjectTacoma Measure Repository backend README
          </Anchor>
        </List.Item>
      </List>
    </div>
  );
}
