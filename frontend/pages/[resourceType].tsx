import { Center } from '@mantine/core';
import { GetServerSideProps } from 'next';

export default function ResourceList({ ids, resourceType }: { ids: Array<string>; resourceType: string }) {
  console.log('ids', ids);
  console.log('resourceType', resourceType);
  const idItems = ids.map(id => <li key={id}>{id}</li>);
  return (
    <>
      <Center style={{ alignItems: 'center', paddingTop: '80px' }}>
        <div>
          <h2>{`${resourceType} IDs`}</h2>
          <ul>{idItems}</ul>
        </div>
      </Center>
    </>
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
