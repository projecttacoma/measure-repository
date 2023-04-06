import { GetServerSideProps } from 'next';
import { Button, Grid, Divider } from '@mantine/core';
import Link from 'next/link';

export default function ResourceList({ ids, resourceType }: { ids: Array<string>; resourceType: string }) {
  console.log('ids', ids);
  console.log('resourceType', resourceType);
  const idItems = ids.map(id => {
    return (
      <Link href={`/${resourceType}/${id}`} key={id}>
        <div>
          <Button
            color="cyan"
            radius="md"
            size="md"
            variant="subtle"
            style={{
              padding: '2px'
            }}
          >
            <div>
              {resourceType}/{id}
            </div>
          </Button>
        </div>
      </Link>
    );
  });
  return (
    <div
      style={{
        width: '78vw'
      }}
    >
      <Grid columns={7}>
        <Grid.Col offset={3} span={2} style={{ paddingTop: '5px' }}>
          <h2 style={{ color: 'gray', marginTop: '0px', marginBottom: '8px' }}>{`${resourceType} IDs`}</h2>
        </Grid.Col>
        <Grid.Col
          span={2}
          style={{
            paddingTop: '5px'
          }}
        ></Grid.Col>
      </Grid>
      <Divider my="md" style={{ marginTop: '14px' }} />
      <div>
        <div
          style={{
            textAlign: 'left',
            overflowWrap: 'break-word',
            height: '500px',
            padding: '10px',
            backgroundColor: '#FFFFFF',
            border: '1px solid',
            borderColor: '#DEE2E6',
            borderRadius: '20px',
            marginTop: '10px',
            marginBottom: '20px',
            marginLeft: '150px',
            marginRight: '150px'
          }}
        >
          <ul>{idItems}</ul>
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async context => {
  const { resourceType } = context.query;
  // Fetch data from external API
  const res = await fetch(`${process.env.NEXT_PUBLIC_MRS_SERVER}/${resourceType}`);
  const bundle = (await res.json()) as fhir4.Bundle;
  const ids = bundle.entry?.map(entry => entry.resource?.id);

  // Pass data to the page via props
  return { props: { ids: ids, resourceType: resourceType } };
};
