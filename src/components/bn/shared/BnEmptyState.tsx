/**
 * BN Empty State — Consistent empty/loading/error states
 */
import React from 'react';
import { Loader2, AlertCircle, Inbox, FileX } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BnEmptyStateProps {
  type: 'empty' | 'loading' | 'error' | 'no-results';
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: { label: string; onClick: () => void };
}

const defaults = {
  empty: { title: 'No data yet', description: 'Get started by creating your first record.', Icon: Inbox },
  loading: { title: 'Loading...', description: 'Please wait while data is being fetched.', Icon: Loader2 },
  error: { title: 'Something went wrong', description: 'Please try refreshing the page.', Icon: AlertCircle },
  'no-results': { title: 'No results found', description: 'Try adjusting your search or filter criteria.', Icon: FileX },
};

export const BnEmptyState: React.FC<BnEmptyStateProps> = ({
  type,
  title,
  description,
  icon,
  action,
}) => {
  const d = defaults[type];
  const Icon = d.Icon;

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-muted p-4">
        {icon || <Icon className={`h-8 w-8 text-muted-foreground ${type === 'loading' ? 'animate-spin' : ''}`} />}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-foreground">{title || d.title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description || d.description}</p>
      {action && (
        <Button className="mt-4" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
};
