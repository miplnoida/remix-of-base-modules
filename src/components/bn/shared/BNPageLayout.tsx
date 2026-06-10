/**
 * BNPageLayout — standard page shell for all Benefits screens.
 * Provides consistent vertical rhythm, max-width, and title block.
 */
import React from 'react';
import { cn } from '@/lib/utils';

interface BNPageLayoutProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  breadcrumb?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** When true, removes default padding so the page can manage its own spacing. */
  bare?: boolean;
}

export const BNPageLayout: React.FC<BNPageLayoutProps> = ({
  title, subtitle, actions, breadcrumb, children, className, bare,
}) => (
  <div className={cn(!bare && 'space-y-6 p-4 sm:p-6', className)}>
    {breadcrumb && <div className="t-helper">{breadcrumb}</div>}
    {(title || actions) && (
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {title && <h1 className="t-page-title truncate">{title}</h1>}
          {subtitle && <p className="t-page-subtitle mt-1">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </header>
    )}
    {children}
  </div>
);
