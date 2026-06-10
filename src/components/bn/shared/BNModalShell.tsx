/**
 * BNModalShell — standard modal for all Benefits screens.
 *
 * Wraps the global StandardModal so every BN dialog gets:
 *  - max-height 85vh
 *  - sticky header with close X
 *  - sticky footer with Save/Cancel
 *  - scrollable body
 *  - consistent title / body / footer typography
 */
import React from 'react';
import { StandardModal } from '@/components/common/StandardModal';

type ModalSize = 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';

interface BNModalShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  size?: ModalSize;
  mode?: 'view' | 'edit' | 'create';
  onSave?: () => void;
  onCancel?: () => void;
  isSaving?: boolean;
  saveLabel?: string;
  cancelLabel?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export const BNModalShell: React.FC<BNModalShellProps> = ({
  open, onOpenChange, title, description, size = '2xl', mode = 'edit',
  onSave, onCancel, isSaving, saveLabel, cancelLabel, footer, children,
}) => (
  <StandardModal
    open={open}
    onOpenChange={onOpenChange}
    title={title}
    size={size}
    mode={mode}
    onSave={onSave}
    onCancel={onCancel}
    isSaving={isSaving}
    saveLabel={saveLabel}
    cancelLabel={cancelLabel}
    footer={footer}
  >
    {description && <p className="t-helper mb-3">{description}</p>}
    {children}
  </StandardModal>
);
