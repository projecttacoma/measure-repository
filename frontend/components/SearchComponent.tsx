import { ArtifactResourceType } from '@/util/types/fhir';
import { Divider, Grid, TextInput, Text, Button } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import Link from 'next/link';
import { useState } from 'react';
import { ArtifactSearchParams } from '@/util/searchParams';
import { Search, SquareX } from 'tabler-icons-react';

interface SearchComponentProps {
  resourceType: ArtifactResourceType;
}

interface Parameter {
  name: string;
  description: string;
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
            onChange={event => changeSearchInputs(si.name, si.value, event)}
          />
        </Grid.Col>
      );
    }
  });

  /**
   * Returns the requestPreview string based on the search inputs
   */
  const requestPreview = () => {
    let requestPreview = '';
    const requestParams: Parameter[] = [];
    let urlAndVersion: string;
    searchInputs.forEach(si => {
      if (si.name === 'url') {
        urlAndVersion = si.value;
      } else if (si.name === 'version') {
        if (urlAndVersion !== '') {
          si.value !== ''
            ? requestParams.push(
                { name: 'url', description: si.description, value: urlAndVersion },
                { name: 'version', description: si.description, value: si.value }
              )
            : requestParams.push({ name: 'url', description: si.description, value: urlAndVersion });
        }
      } else if (si.name === 'description' || si.name === 'title') {
        requestParams.push({
          name: si.name,
          description: si.description,
          value: si.value.trim().split(' ').join('%20')
        });
      } else if (si.name === 'date') {
        if (si.date !== null && si.date !== undefined) {
          requestParams.push({ name: 'date', description: si.description, value: si.date.toISOString() });
        }
      } else {
        requestParams.push(si);
      }
    });
    const query = requestParams.filter(si => si.value !== '').map(si => si.name + '=' + si.value);
    query.length !== 0 ? (requestPreview += '?' + query.join('&')) : '';
    return requestPreview;
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
          <div style={{ padding: '16px' }}>
            <Text size="xl" color="gray" weight={500}>
              {`${process.env.NEXT_PUBLIC_MRS_SERVER}/${resourceType}` + requestPreview()}
            </Text>
          </div>
        </Grid.Col>
        <Grid.Col offset={8} span={2}>
          <div>
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
              variant="outline"
              fullWidth
              color="red.8"
              onClick={() => setSearchInputs(emptyInputs)}
            >
              <SquareX />
              Clear
            </Button>
          </div>
        </Grid.Col>
        <Grid.Col span={2}>
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
              color="green.8"
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
