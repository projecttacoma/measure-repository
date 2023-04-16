import { useEffect, useState } from 'react';
import { Badge, Button, Stack } from '@mantine/core';
import Link from 'next/link';

/**
 * Component which retrieves all resources and their counts and translates them into buttons
 * @returns array of JSX Buttons
 */
const ResourceCounts = () => {
  // set initial state to no resources
  const [resources, setResources] = useState<Record<string, number>>({
    Measure: 0,
    Library: 0
  });
  const [errorMessage, setErrorMessage] = useState<string>('');
  useEffect(() => {
    // Note: count may not update without refresh if there ends up being a way to change it on the server through the app
    Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_MRS_SERVER}/Measure`),
      fetch(`${process.env.NEXT_PUBLIC_MRS_SERVER}/Library`)
    ])
      .then(([resMeasure, resLibrary]) => Promise.all([resMeasure.json(), resLibrary.json()]))
      .then(([measureBundle, libraryBundle]) => {
        setResources({ Measure: measureBundle.total || 0, Library: libraryBundle.total || 0 });
      })
      .catch(error => {
        console.log(error.message, '...start the server');
        setErrorMessage(error.message);
      });
  }, []);

  /**
   * Returns the resource counts key:value pairs object as an array of buttons
   * @returns array of JSX Buttons that are resources and their counts
   */
  const ResourceButtonsGroup = () => {
    if (errorMessage) {
      // Note: Can show error message here if it would be helpful to the user.
      return (
        <div
          style={{
            padding: '15px',
            color: '#E00000',
            border: '1px solid',
            borderColor: '#DEE2E6',
            borderRadius: '20px',
            marginLeft: '15px',
            marginRight: '15px'
          }}
        >
          {' '}
          Resources could not be displayed due to an error retrieving them from the server.{' '}
        </div>
      );
    }
    const buttonArray = Object.keys(resources).map(resourceType => (
      <Link href={`/${resourceType}`} key={resourceType}>
        <Button
          fullWidth
          compact
          color="cyan"
          radius="md"
          size="md"
          variant="subtle"
          styles={{
            root: {
              padding: '2px'
            },
            inner: {
              paddingLeft: '15px',
              justifyContent: 'left'
            }
          }}
          rightIcon={<Badge color="cyan">{resources[resourceType]}</Badge>}
          key={resourceType}
        >
          {resourceType}
        </Button>
      </Link>
    ));
    return <div> {buttonArray} </div>;
  };

  return (
    <Stack
      align="left"
      spacing="xs"
      style={{
        marginBottom: 30,
        marginLeft: 15
      }}
    >
      <ResourceButtonsGroup />
    </Stack>
  );
};

export { ResourceCounts };
