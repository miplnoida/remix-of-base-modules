/**
 * BNCard — themed Card wrapper used by all Benefits screens.
 * Composes the global Card primitive so cards look identical across modules.
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface BNCardProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  headerActions?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
  /** Remove inner padding for grids/tables that manage their own. */
  flush?: boolean;
}

export const BNCard: React.FC<BNCardProps> = ({
  title, description, headerActions, footer, className, bodyClassName, children, flush,
}) => (
  <Card className={cn(className)}>
    {(title || headerActions) && (
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="min-w-0">
          {title && <CardTitle className="t-card-title">{title}</CardTitle>}
          {description && <CardDescription className="t-helper mt-1">{description}</CardDescription>}
        </div>
        {headerActions && <div className="flex flex-wrap items-center gap-2">{headerActions}</div>}
      </CardHeader>
    )}
    <CardContent className={cn(flush ? 'p-0' : '', bodyClassName)}>
      {children}
    </CardContent>
    {footer && (
      <div className="flex items-center justify-end gap-2 border-t px-5 py-3">{footer}</div>
    )}
  </Card>
);
