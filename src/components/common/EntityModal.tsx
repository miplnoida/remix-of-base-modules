import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

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
  maxWidth = 'max-w-2xl',
}) => {
  const isReadOnly = mode === 'view';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={maxWidth}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="py-4 max-h-[60vh] overflow-y-auto">
          {children}
        </div>
        {!isReadOnly && (
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={onCancel || (() => onOpenChange(false))} disabled={isSaving}>
              {cancelLabel}
            </Button>
            {onSave && (
              <Button onClick={onSave} disabled={isSaving}>
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {saveLabel}
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
