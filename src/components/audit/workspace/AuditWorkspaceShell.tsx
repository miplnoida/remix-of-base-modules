import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/common';
import { AuditLifecycleStepper } from './AuditLifecycleStepper';
import { AuditSummaryStrip } from './AuditSummaryStrip';
import { cn } from '@/lib/utils';

interface Breadcrumb {
  label: string;
  href?: string;
}

interface AuditWorkspaceShellProps {
  title: string;
  subtitle?: string;
  code?: string;
  backTo?: string;
  breadcrumbs?: Breadcrumb[];
  status?: string;
  executionStatus?: string;
  summaryProps?: React.ComponentProps<typeof AuditSummaryStrip>;
  actions?: React.ReactNode;
  alerts?: React.ReactNode;
  children: React.ReactNode;
  isLoading?: boolean;
  className?: string;
}

export function AuditWorkspaceShell({
  title, subtitle, code, backTo, breadcrumbs,
  status, executionStatus, summaryProps, actions, alerts,
  children, isLoading, className,
}: AuditWorkspaceShellProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Loading workspace...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-5', className)}>
      {/* Top bar: Back + Title + Status + Actions */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          {backTo && (
            <Button variant="ghost" size="icon" className="mt-0.5 shrink-0" onClick={() => navigate(backTo)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="min-w-0">
            {/* Breadcrumbs */}
            {breadcrumbs && breadcrumbs.length > 0 && (
              <nav className="flex items-center text-xs text-muted-foreground mb-1 flex-wrap">
                {breadcrumbs.map((crumb, i) => (
                  <span key={i} className="inline-flex items-center">
                    {i > 0 && <span className="mx-1.5 text-border">/</span>}
                    {crumb.href ? (
                      <button onClick={() => navigate(crumb.href!)} className="hover:text-foreground transition-colors">
                        {crumb.label}
                      </button>
                    ) : (
                      <span className="text-foreground font-medium">{crumb.label}</span>
                    )}
                  </span>
                ))}
              </nav>
            )}
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold tracking-tight text-foreground truncate">{title}</h1>
              {code && <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground">{code}</span>}
              {status && <StatusBadge status={status} />}
              {executionStatus && executionStatus !== status && <StatusBadge status={executionStatus} />}
            </div>
            {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>

      {/* Lifecycle stepper */}
      {executionStatus && (
        <div className="overflow-x-auto">
          <AuditLifecycleStepper executionStatus={executionStatus} />
        </div>
      )}

      {/* Alerts */}
      {alerts}

      {/* Summary strip */}
      {summaryProps && <AuditSummaryStrip {...summaryProps} />}

      {/* Main content */}
      {children}
    </div>
  );
}
