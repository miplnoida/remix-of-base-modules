import React from 'react';
import { StandardModal } from './StandardModal';

interface EntityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  mode?: 'view' | 'edit' | 'create';
  children: React.ReactNode;
  onSave?: () => void;
  onCancel?: () => void;
  isSaving?: boolean;
  saveLabel?: string;
  cancelLabel?: string;
  maxWidth?: string;
}

const maxWidthToSize = (maxWidth?: string) => {
  if (!maxWidth) return '2xl' as const;
  if (maxWidth.includes('5xl')) return '5xl' as const;
  if (maxWidth.includes('4xl')) return '4xl' as const;
  if (maxWidth.includes('3xl')) return '3xl' as const;
  if (maxWidth.includes('xl')) return 'xl' as const;
  if (maxWidth.includes('lg')) return 'lg' as const;
  if (maxWidth.includes('md')) return 'md' as const;
  return '2xl' as const;
};

export const EntityModal: React.FC<EntityModalProps> = ({
  open,
  onOpenChange,
  title,
  mode = 'view',
  children,
  onSave,
  onCancel,
  isSaving = false,
  saveLabel = 'Save',
  cancelLabel = 'Cancel',
  maxWidth,
}) => {
  return (
    <StandardModal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      mode={mode}
      size={maxWidthToSize(maxWidth)}
      onSave={onSave}
      onCancel={onCancel}
      isSaving={isSaving}
      saveLabel={saveLabel}
      cancelLabel={cancelLabel}
    >
      {children}
    </StandardModal>
  );
};
