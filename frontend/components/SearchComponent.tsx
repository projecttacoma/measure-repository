import { ArtifactResourceType } from '@/util/types/fhir';
import { Divider, Grid, TextInput, Text, Button } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import Link from 'next/link';
import { useState } from 'react';
import { ArtifactSearchParams } from '@/util/searchParams';

interface SearchComponentProps {
  resourceType: ArtifactResourceType;
}

interface Parameter {
  name: string;
  value: string;
  date?: Date | null;
}

/**
 * SearchInputs is a component for displaying a search inputs for a resource
 */
export default function SearchInputs({ resourceType }: SearchComponentProps) {
  const emptyInputs = ArtifactSearchParams[resourceType].map(p => ({ name: p, value: '' }));
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
            onChange={event => changeSearchInputs(si.name, event.currentTarget.value)}
          />
        </Grid.Col>
      );
    } else {
      return (
        <Grid.Col span={6} key={si.name}>
          <DateInput label={si.name} value={si.date} onChange={event => changeSearchInputs(si.name, si.value, event)} />
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
            ? requestParams.push({ name: 'url', value: urlAndVersion + '|' + si.value })
            : requestParams.push({ name: 'url', value: urlAndVersion });
        }
      } else if (si.name === 'description' || si.name === 'title') {
        requestParams.push({ name: si.name, value: si.value.trim().split(' ').join('%20') });
      } else if (si.name === 'date') {
        if (si.date !== null && si.date !== undefined) {
          requestParams.push({ name: 'date', value: si.date.toISOString() });
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
        <Grid.Col span={2} offset={1}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <Text size="xl" color="gray" weight={700}>
              Request Preview:
            </Text>
          </div>
        </Grid.Col>
        <Grid.Col span={8}>
          <div style={{ border: '1px solid', borderRadius: '4px', borderColor: 'gray', padding: '16px' }}>
            <Text size="lg">{`${process.env.NEXT_PUBLIC_MRS_SERVER}/${resourceType}` + requestPreview()}</Text>
          </div>
        </Grid.Col>
        <Grid.Col span={1} offset={9}>
          <Button color="red.8" fullWidth={true} onClick={() => setSearchInputs(emptyInputs)}>
            Clear
          </Button>
        </Grid.Col>
        <Grid.Col span={1}>
          <Link href={`/${resourceType}/search-result${requestPreview()}`}>
            <Button color="green.8" fullWidth={true}>
              Search
            </Button>
          </Link>
        </Grid.Col>
      </Grid>
    </>
  );
}
