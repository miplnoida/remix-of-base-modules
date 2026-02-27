import React from 'react';
import { PageHeader } from './PageHeader';

interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageShellProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: Breadcrumb[];
  actions?: React.ReactNode;
  children: React.ReactNode;
  isLoading?: boolean;
  error?: string | null;
  noPermission?: boolean;
  noPermissionMessage?: string;
}

export const PageShell: React.FC<PageShellProps> = ({
  title,
  subtitle,
  breadcrumbs,
  actions,
  children,
  isLoading = false,
  error = null,
  noPermission = false,
  noPermissionMessage = 'You do not have permission to access this page.',
}) => {
  if (noPermission) {
    return (
      <div className="space-y-6">
        <PageHeader title={title} subtitle={subtitle} breadcrumbs={breadcrumbs} />
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">{noPermissionMessage}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title={title} subtitle={subtitle} breadcrumbs={breadcrumbs} />
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="h-5 w-5 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
            <span>Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title={title} subtitle={subtitle} breadcrumbs={breadcrumbs} />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-destructive font-medium">Something went wrong</p>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={title} subtitle={subtitle} breadcrumbs={breadcrumbs} actions={actions} />
      {children}
    </div>
  );
};
