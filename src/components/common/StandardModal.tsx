import React from 'react';
import { Dialog, DialogPortal, DialogOverlay } from '@/components/ui/dialog';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type ModalSize = 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';

interface StandardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
  mode?: 'view' | 'edit' | 'create';
  size?: ModalSize;
  onSave?: () => void;
  onCancel?: () => void;
  isSaving?: boolean;
  saveLabel?: string;
  cancelLabel?: string;
  footer?: React.ReactNode;
}

const sizeClasses: Record<ModalSize, string> = {
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
};

export const StandardModal: React.FC<StandardModalProps> = ({
  open,
  onOpenChange,
  title,
  children,
  mode = 'view',
  size = '2xl',
  onSave,
  onCancel,
  isSaving = false,
  saveLabel = 'Save',
  cancelLabel = 'Cancel',
  footer,
}) => {
  const isReadOnly = mode === 'view';
  const showFooter = !isReadOnly || footer;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-[50%] top-[50%] z-50 w-full translate-x-[-50%] translate-y-[-50%] border bg-background shadow-lg duration-200 sm:rounded-lg',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
            'flex flex-col max-h-[85vh]',
            sizeClasses[size]
          )}
        >
          {/* Sticky Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
            <DialogPrimitive.Title className="text-lg font-semibold leading-none tracking-tight">
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
            {children}
          </div>

          {/* Sticky Footer */}
          {showFooter && (
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t shrink-0">
              {footer ? (
                footer
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={onCancel || (() => onOpenChange(false))}
                    disabled={isSaving}
                  >
                    {cancelLabel}
                  </Button>
                  {onSave && (
                    <Button onClick={onSave} disabled={isSaving}>
                      {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {saveLabel}
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
};
