/**
 * BNSectionHeader — labels a section inside a page or card.
 */
import React from 'react';
import { cn } from '@/lib/utils';

interface BNSectionHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}

export const BNSectionHeader: React.FC<BNSectionHeaderProps> = ({
  title, subtitle, actions, className, icon,
}) => (
  <div className={cn('flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between', className)}>
    <div className="flex items-start gap-2 min-w-0">
      {icon && <div className="mt-0.5 text-muted-foreground shrink-0">{icon}</div>}
      <div className="min-w-0">
        <h2 className="t-section-title truncate">{title}</h2>
        {subtitle && <p className="t-section-subtitle mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);
