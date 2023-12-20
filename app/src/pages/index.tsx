import { Anchor, Button, Center, Divider, Group, Table, Text, Title } from '@mantine/core';
import { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import Link from 'next/link';

export default function Home({ capabilityStatement }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const renderCapabilityTable = () => {
    return capabilityStatement ? (
      <Table>
        <thead>
          <tr>
            <th>Resource</th>
            <th>Operations</th>
            <th>Search Parameters</th>
          </tr>
        </thead>
        <tbody>
          {capabilityStatement.rest?.[0]?.resource
            ?.sort((a, b) => {
              return a.type > b.type ? 1 : -1; // sort alphabetical by resource type
            })
            .map(r => (
              <tr key={`row-${r.type}`}>
                <td>{r.type}</td>
                <td>
                  {r.operation
                    ?.map(o => {
                      return o.name;
                    })
                    .sort()
                    .join(', ')}
                </td>
                <td>
                  {r.searchParam
                    ?.map(sp => {
                      return sp.name;
                    })
                    .sort()
                    .join(', ')}
                </td>
              </tr>
            ))}
        </tbody>
      </Table>
    ) : (
      <Text c="red.7" style={{ marginBottom: '8px' }}>
        Capability Statement Unavailable
      </Text>
    );
  };

  return (
    <div>
      <Text>
        This application is an interface for a prototype implementation of a{' '}
        <Anchor href="http://hl7.org/fhir/us/cqfmeasures/measure-repository-service.html">
          FHIR Measure Repository Service
        </Anchor>{' '}
        with Measure and Library authoring capabilities. See the{' '}
        <Anchor href="https://github.com/projecttacoma/measure-repository/blob/main/README.md">
          Measure Repository README
        </Anchor>{' '}
        for technical details.
      </Text>
      <Divider my="sm" variant="dotted" />
      <Title order={2}>Service Location:</Title>
      <div style={{ marginTop: '18px', marginBottom: '18px' }}>
        <Anchor
          href={`${process.env.NEXT_PUBLIC_MRS_SERVER}/metadata`}
        >{`${process.env.NEXT_PUBLIC_MRS_SERVER}/metadata`}</Anchor>
      </div>
      <Divider my="sm" variant="dotted" />
      <Title order={2}>Service Capabilities:</Title>
      <div style={{ marginTop: '18px', marginBottom: '18px' }}>{renderCapabilityTable()}</div>
      <Center>
        <Group>
          <Link href={'/search?resourceType=Measure'}>
            <Button>Search Measure Repository</Button>
          </Link>
        </Group>
      </Center>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps<{
  capabilityStatement: fhir4.CapabilityStatement | null;
}> = async () => {
  // Fetch CapabilityStatement
  const res = await fetch(`${process.env.MRS_SERVER}/metadata`);
  const capabilityStatement = res.status === 200 ? ((await res.json()) as fhir4.CapabilityStatement) : null;

  // Pass to the page via props
  return { props: { capabilityStatement } };
};
