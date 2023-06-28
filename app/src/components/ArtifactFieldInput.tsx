import { ActionIcon, TextInput } from '@mantine/core';
import { X } from 'tabler-icons-react';

export interface ArtifactFieldInputProps {
  label: string;
  value: string;
  disabled?: boolean;
  setField: (val: string) => void;
}

export default function ArtifactFieldInput({ label, value, disabled, setField }: ArtifactFieldInputProps) {
  return (
    <div>
      <TextInput
        label={label}
        value={value}
        disabled={disabled}
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
