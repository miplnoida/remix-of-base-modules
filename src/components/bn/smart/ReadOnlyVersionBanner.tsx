/**
 * ReadOnlyVersionBanner — status-aware guidance shown on the Product Editor
 * (and any tab) when the selected product version is not directly editable.
 *
 * - ACTIVE  → "live version, changes require a new draft" + optional Create Draft action
 * - DRAFT   → friendly note (this draft can be edited)
 * - PENDING_APPROVAL → read-only until approved or withdrawn
 * - RETIRED / ARCHIVED → clone to new draft
 *
 * Backward compatible with the previous API: callers may pass either
 * `show` (legacy) or rely on automatic detection by `status`.
 */
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Lock, FilePlus2, CheckCircle2, Clock, Archive } from 'lucide-react';

const READ_ONLY_STATUSES = [
  'ACTIVE', 'APPROVED', 'PUBLISHED', 'PENDING_APPROVAL', 'PENDING_REVIEW',
  'RETIRED', 'ARCHIVED', 'SUSPENDED', 'REJECTED',
];

export function isVersionReadOnly(status: string | null | undefined): boolean {
  if (!status) return false;
  return READ_ONLY_STATUSES.includes(status.toUpperCase());
}

interface Props {
  status?: string | null;
  /** Legacy explicit flag used by older callers (DocumentSetup etc.). */
  show?: boolean;
  /** Verb to use in the secondary message when read-only. */
  draftActionLabel?: string;
  /** When provided, an inline "Create Draft Version" CTA is rendered. */
  onCreateDraft?: () => void;
  /** Disable the CTA while a clone is in flight. */
  creatingDraft?: boolean;
}

export function ReadOnlyVersionBanner({
  status,
  show,
  draftActionLabel = 'edit',
  onCreateDraft,
  creatingDraft,
}: Props) {
  const normalised = (status ?? '').toUpperCase();
  const readOnly = show ?? isVersionReadOnly(normalised);
  if (!readOnly && normalised !== 'DRAFT') return null;

  // DRAFT — positive guidance, not a warning
  if (normalised === 'DRAFT') {
    return (
      <Alert className="border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30">
        <CheckCircle2 className="h-4 w-4" />
        <AlertTitle>Draft version — editable</AlertTitle>
        <AlertDescription>
          This draft can be edited. Publish after validation and approval.
        </AlertDescription>
      </Alert>
    );
  }

  const isPending = normalised === 'PENDING_APPROVAL' || normalised === 'PENDING_REVIEW';
  const isRetired = normalised === 'RETIRED' || normalised === 'ARCHIVED';
  const isActive = normalised === 'ACTIVE' || normalised === 'PUBLISHED' || normalised === 'APPROVED';

  const Icon = isPending ? Clock : isRetired ? Archive : Lock;

  const title = isActive
    ? 'Live version — changes require a new draft'
    : isPending
      ? `Awaiting approval — read-only`
      : isRetired
        ? 'Retired version — clone to a new draft to reuse'
        : `Read-only — status is ${normalised}`;

  const body = isActive
    ? 'This is a live version. To make changes safely, create a new draft. Existing claims continue to use the current rules until the draft is approved and published.'
    : isPending
      ? 'This version is awaiting approval. It cannot be modified until it is approved (becomes Active) or withdrawn back to Draft.'
      : isRetired
        ? 'This version is retired. Clone it to create a new draft you can edit and publish.'
        : `This record is locked. Create a new draft version to ${draftActionLabel}.`;

  return (
    <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/30">
      <Icon className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span>{body}</span>
        {onCreateDraft && !isPending && (
          <Button
            size="sm"
            variant="default"
            onClick={onCreateDraft}
            disabled={creatingDraft}
            className="gap-2 self-start sm:self-auto"
          >
            <FilePlus2 className="h-4 w-4" />
            {creatingDraft ? 'Creating draft…' : isRetired ? 'Clone to New Draft' : 'Create Draft Version'}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
