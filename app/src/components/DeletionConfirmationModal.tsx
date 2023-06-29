import { Modal, Button, Center, Group, Text } from '@mantine/core';
import { AlertTriangle } from 'tabler-icons-react';

export interface DeletionConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  modalText?: string | null;
}

export default function DeletionConfirmationModal({
  open = true,
  onClose,
  onConfirm,
  modalText
}: DeletionConfirmationModalProps) {
  return (
    <Modal opened={open} onClose={onClose} withCloseButton={false} size="lg">
      <Center>
        <AlertTriangle color="red" size={40} />
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
          <Button onClick={onConfirm} color="red">
            Delete
          </Button>
        </Group>
      </Center>
    </Modal>
  );
}
