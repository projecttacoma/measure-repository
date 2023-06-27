import { Modal, Button, Center, Group, Text } from '@mantine/core';
import { AlertTriangle } from 'tabler-icons-react';

export interface ConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string | null;
  modalText?: string | null;
}

export default function ConfirmationModal({
  open = true,
  onClose,
  onConfirm,
  title,
  modalText
}: ConfirmationModalProps) {
  return (
    <Modal opened={open} onClose={onClose} withCloseButton={false} size="lg" title={title}>
      <Center>
        <AlertTriangle color="red" size={35} />
      </Center>
      <Center>
        <Text weight={700} align="center" lineClamp={2}>
          {modalText}
        </Text>
      </Center>
      <Center>
        <Group style={{ paddingTop: '5px' }}>
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
