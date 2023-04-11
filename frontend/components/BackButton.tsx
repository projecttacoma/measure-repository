import { useRouter } from 'next/router';
import { Button } from '@mantine/core';
import { ArrowNarrowLeft } from 'tabler-icons-react';

/**
 * BackButton is a component for rendering a back button
 * @returns Button that routes user back when clicked
 */
const BackButton = () => {
  const router = useRouter();
  return (
    <Button
      data-testid="back-button"
      onClick={() => router.back()}
      color="cyan"
      radius="md"
      size="sm"
      variant="filled"
      style={{
        float: 'left'
      }}
    >
      <ArrowNarrowLeft size="30" />
    </Button>
  );
};

export default BackButton;
