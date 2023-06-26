import { ActionIcon, TextInput } from '@mantine/core';
import { X } from 'tabler-icons-react';

export interface ArtifactFieldInputProps {
  label: string;
  value: string;
  setField: (val: string) => void;
}

export default function ArtifactFieldInput({ label, value, setField }: ArtifactFieldInputProps) {
  return (
    <div>
      <TextInput
        label={label}
        value={value}
        onChange={e => setField(e.target.value)}
        rightSection={
          <ActionIcon
            onClick={() => {
              setField('');
            }}
          >
            <X size={16} />
          </ActionIcon>
        }
      />
    </div>
  );
}
