/**
 * BNGridSidePanel — standardized side sheet for row detail / edit.
 * Fixes the "expanding modal" bug: capped at viewport height, internal scroll,
 * supports ESC + backdrop click + explicit close button.
 */
import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export interface BNGridSidePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Slot for sticky action footer. */
  footer?: React.ReactNode;
  /** Width preset. */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
}

const sizeClass = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-xl',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl',
};

export const BNGridSidePanel: React.FC<BNGridSidePanelProps> = ({
  open, onOpenChange, title, description, footer, size = 'lg', children,
}) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          'flex flex-col p-0 w-full h-dvh max-h-dvh overflow-hidden',
          sizeClass[size],
        )}
      >
        <SheetHeader className="px-5 py-4 border-b shrink-0">
          <SheetTitle className="text-base">{title}</SheetTitle>
          {description && <SheetDescription className="text-xs">{description}</SheetDescription>}
        </SheetHeader>
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-5 py-4">{children}</div>
        </ScrollArea>
        {footer && (
          <div className="border-t px-5 py-3 bg-muted/20 shrink-0">
            {footer}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
