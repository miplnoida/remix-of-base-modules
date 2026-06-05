import { AlertTriangle } from 'lucide-react';

interface Props {
  status?: string | null;
  show: boolean;
}

/**
 * Banner displayed on tabs when the selected product version is not editable.
 * A version is editable only when its status is DRAFT.
 */
export function ReadOnlyVersionBanner({ status, show }: Props) {
  if (!show) return null;
  return (
    <div className="mb-3 flex items-center gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
      <AlertTriangle className="h-4 w-4" />
      <span>
        This version is <strong>read-only{status ? ` (${status})` : ''}</strong>.
        Create a new draft version to make changes.
      </span>
    </div>
  );
}
