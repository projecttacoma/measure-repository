import { Anchor, Center, Divider, List, Text, Title } from '@mantine/core';

export default function Homepage() {
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
        with Measure authoring capabilities.
      </Text>
      <Divider my="sm" variant="dotted" />
      <Title order={2} underline>
        Getting Started:
      </Title>
      <Text>
        The backend Measure Repository Service server must be running on port 3000 in order for this application to pull
        data from the server. To start the backend Measure Repository Service server on port 3000, run "npm run
        start:all" or "npm run start:backend" from the root of the repository.
      </Text>
      <Text>More functionality coming soon!</Text>
      <Divider my="sm" variant="dotted" />
      <Title order={2} underline>
        Authoring Functionality:
      </Title>
      <Text>Coming Soon!</Text>
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
          <Anchor href="https://github.com/projecttacoma/measure-repository">
            ProjectTacoma Measure Repository Backend README
          </Anchor>
        </List.Item>
      </List>
    </div>
  );
}