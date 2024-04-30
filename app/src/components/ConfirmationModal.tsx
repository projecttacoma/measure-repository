import { Modal, Button, Center, Group, Text } from '@mantine/core';
import { AlertTriangle } from 'tabler-icons-react';

export interface ConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  action: string;
  modalText?: string | null;
}

export default function ConfirmationModal({
  open = true,
  onClose,
  onConfirm,
  action,
  modalText
}: ConfirmationModalProps) {
  return (
    <Modal opened={open} onClose={onClose} withCloseButton={false} size="lg">
      <Center>
        <AlertTriangle color={action === 'delete' ? 'red' : 'green'} size={40} />
      </Center>
      <Center>
        <Text weight={700} align="center" lineClamp={2} p={'sm'}>
          {modalText}
        </Text>
      </Center>
      <Center>
        <Group pt={8}>
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onConfirm} color={action === 'clone' ? 'green' : 'red'}>
            {action === 'clone' ? 'Clone' : 'Delete'}
          </Button>
        </Group>
      </Center>
    </Modal>
  );
}
