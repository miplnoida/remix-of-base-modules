/**
 * BN Action Toolbar — Contextual action bar for claim/config pages
 */
import React from 'react';
import { cn } from '@/lib/utils';

interface BnActionToolbarProps {
  children: React.ReactNode;
  className?: string;
  sticky?: boolean;
}

export const BnActionToolbar: React.FC<BnActionToolbarProps> = ({ children, className, sticky }) => (
  <div
    className={cn(
      'flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3',
      sticky && 'sticky top-0 z-10',
      className
    )}
  >
    {children}
  </div>
);

export const BnToolbarGroup: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn('flex items-center gap-2', className)}>{children}</div>
);
