/**
 * BN Detail Row — Key-value display for detail panels
 */
import React from 'react';
import { cn } from '@/lib/utils';

interface BnDetailRowProps {
  label: string;
  value: React.ReactNode;
  className?: string;
  muted?: boolean;
}

export const BnDetailRow: React.FC<BnDetailRowProps> = ({ label, value, className, muted }) => (
  <div className={cn('flex items-baseline justify-between gap-4 py-2', className)}>
    <span className="text-sm text-muted-foreground whitespace-nowrap">{label}</span>
    <span className={cn('text-sm font-medium text-right', muted && 'text-muted-foreground')}>
      {value || '—'}
    </span>
  </div>
);

interface BnDetailSectionProps {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export const BnDetailSection: React.FC<BnDetailSectionProps> = ({ title, children, actions }) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between border-b pb-2">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {actions}
    </div>
    <div className="divide-y divide-border/50">{children}</div>
  </div>
);
