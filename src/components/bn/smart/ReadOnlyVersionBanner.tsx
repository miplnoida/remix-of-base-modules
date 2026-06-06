/**
 * ReadOnlyVersionBanner — shown when a product/rule version is not editable.
 */
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Lock } from 'lucide-react';

const READ_ONLY_STATUSES = ['ACTIVE', 'PENDING_APPROVAL', 'RETIRED', 'ARCHIVED', 'SUSPENDED'];

export function isVersionReadOnly(status: string | null | undefined): boolean {
  if (!status) return false;
  return READ_ONLY_STATUSES.includes(status.toUpperCase());
}

interface Props {
  status: string;
  /** What the user could do if it were a draft */
  draftActionLabel?: string;
}

export function ReadOnlyVersionBanner({ status, draftActionLabel = 'edit' }: Props) {
  if (!isVersionReadOnly(status)) return null;
  return (
    <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/30">
      <Lock className="h-4 w-4" />
      <AlertTitle>Read-only — status is {status}</AlertTitle>
      <AlertDescription>
        This record is locked. Create a new draft version to {draftActionLabel}. Changes to active records are forbidden to preserve audit integrity.
      </AlertDescription>
    </Alert>
  );
}
