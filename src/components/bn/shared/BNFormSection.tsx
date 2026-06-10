/**
 * BNFormSection — consistent form grouping with title + responsive grid.
 */
import React from 'react';
import { cn } from '@/lib/utils';
import { BNSectionHeader } from './BNSectionHeader';

interface BNFormSectionProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
  children: React.ReactNode;
}

const colMap: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
};

export const BNFormSection: React.FC<BNFormSectionProps> = ({
  title, subtitle, actions, columns = 2, className, children,
}) => (
  <section className={cn('space-y-4', className)}>
    {title && <BNSectionHeader title={title} subtitle={subtitle} actions={actions} />}
    <div className={cn('grid gap-4', colMap[columns])}>{children}</div>
  </section>
);

/** Label + control wrapper enforcing the standard label / helper styles. */
export const BNField: React.FC<{
  label: string;
  htmlFor?: string;
  required?: boolean;
  helper?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}> = ({ label, htmlFor, required, helper, error, className, children }) => (
  <div className={cn('space-y-1.5', className)}>
    <label htmlFor={htmlFor} className="t-field-label flex items-center gap-1">
      {label}
      {required && <span className="text-destructive">*</span>}
    </label>
    {children}
    {error ? (
      <p className="t-validation">{error}</p>
    ) : helper ? (
      <p className="t-helper">{helper}</p>
    ) : null}
  </div>
);
