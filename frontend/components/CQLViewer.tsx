import { useEffect, useState } from 'react';
import { Text } from '@mantine/core';

export default function CQLViewer({ encodedCql }: { encodedCql: string }) {
  const [decodedCql, setDecodedCql] = useState<string | null>(null);

  useEffect(() => {
    setDecodedCql(Buffer.from(encodedCql, 'base64').toString());
  }, [encodedCql]);

  return (
    <div>
      <Text>{decodedCql}</Text>
    </div>
  );
}
