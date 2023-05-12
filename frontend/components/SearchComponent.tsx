import { ArtifactResourceType } from '@/util/types/fhir';
import { Divider, Grid, TextInput, Text, Button } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import Link from 'next/link';
import { useState } from 'react';
import { ArtifactSearchParams } from '@/util/searchParams';
import { Search } from 'tabler-icons-react';

interface SearchComponentProps {
  resourceType: ArtifactResourceType;
}

interface Parameter {
  name: string;
  description?: string;
  value: string;
  date?: Date | null;
}

/**
 * SearchComponent is a component for displaying search inputs for a resource
 */
export default function SearchComponent({ resourceType }: SearchComponentProps) {
  const emptyInputs = ArtifactSearchParams[resourceType].map(p => ({
    name: p.param,
    description: p.description,
    value: ''
  }));
  const [searchInputs, setSearchInputs] = useState<Parameter[]>(emptyInputs);

  function changeSearchInputs(name: string, newValue: string, newDate?: Date | null) {
    setSearchInputs(
      searchInputs?.map(si => {
        if (si.name === name) {
          return { ...si, value: newValue, date: newDate };
        } else {
          return si;
        }
      })
    );
  }

  /**
   * Returns each of the given resource type's search parameters as a Text input or
   * a date input
   */
  const searchInputDisplays = searchInputs.map(si => {
    if (si.name === 'version') {
      return (
        <Grid.Col span={6} key={si.name}>
          <TextInput
            label={si.name}
            value={si.value}
            description={si.description}
            disabled={searchInputs.find(si => si.name === 'url')?.value === ''}
            onChange={event => changeSearchInputs(si.name, event.currentTarget.value)}
          />
        </Grid.Col>
      );
    } else if (si.name !== 'date') {
      return (
        <Grid.Col span={6} key={si.name}>
          <TextInput
            label={si.name}
            value={si.value}
            description={si.description}
            onChange={event => changeSearchInputs(si.name, event.currentTarget.value)}
          />
        </Grid.Col>
      );
    } else {
      return (
        <Grid.Col span={6} key={si.name}>
          <DateInput
            label={si.name}
            value={si.date}
            description={si.description}
            onChange={date => changeSearchInputs(si.name, si.value, date)}
          />
        </Grid.Col>
      );
    }
  });

  /**
   * Returns the requestPreview string based on the search inputs
   */
  const requestPreview = () => {
    const requestParams: Parameter[] = [];
    let url = '';
    let version = '';
    searchInputs.forEach(si => {
      if (si.name === 'url') {
        url = encodeURIComponent(si.value);
      } else if (si.name === 'version') {
        version = encodeURIComponent(si.value);
      } else if (si.name === 'date') {
        if (si.date != null) {
          requestParams.push({ name: 'date', description: si.description, value: si.date.toISOString() });
        }
      } else {
        requestParams.push({
          name: si.name,
          description: si.description,
          value: encodeURIComponent(si.value)
        });
      }
    });
    if (url !== '') {
      requestParams.push({ name: 'url', value: url });
      requestParams.push({ name: 'version', value: version });
    }
    const query = requestParams.filter(si => si.value !== '').map(si => si.name + '=' + si.value);
    return query.length !== 0 ? `?${query.join('&')}` : '';
  };

  return (
    <>
      <Grid>{searchInputDisplays}</Grid>
      <Divider my="sm" style={{ paddingBottom: '6px' }} />
      <Grid>
        <Grid.Col span={4}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <Text size="xl" color="gray" weight={700}>
              Request Preview:
            </Text>
          </div>
        </Grid.Col>
        <Grid.Col span={8}>
          <div style={{ padding: '16px', overflowWrap: 'anywhere' }}>
            <Text size="xl" color="gray" weight={500}>
              {`${process.env.NEXT_PUBLIC_MRS_SERVER}/${resourceType}` + requestPreview()}
            </Text>
          </div>
        </Grid.Col>
        <Grid.Col offset={10} span={2}>
          <Link href={`/${resourceType}/search-result${requestPreview()}`}>
            <Button
              styles={{
                root: {
                  padding: '2px'
                },
                inner: {
                  paddingLeft: '10px',
                  justifyContent: 'left'
                }
              }}
              fullWidth
              color="cyan"
              radius="md"
            >
              <Search />
              Search
            </Button>
          </Link>
        </Grid.Col>
      </Grid>
    </>
  );
}
