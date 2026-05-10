import { CheckCircle2, AlertCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDisplayDate } from '@/lib/dateFormat';

/**
 * Fetches the timestamp of the last successful C3-Wizard publish.
 * Used as a fallback baseline for rows that don't have their own
 * `last_published_at` column (income codes, SE rates, calc config, etc.).
 */
export function useLastSuccessfulC3PublishAt() {
  return useQuery({
    queryKey: ['c3-last-successful-publish-at'],
    queryFn: async (): Promise<string | null> => {
      const { data } = await supabase
        .from('c3_config_sync_log')
        .select('published_at')
        .eq('status', 'success')
        .order('published_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data?.published_at ?? null;
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

interface C3RowSyncStatusProps {
  /** Row's own last_published_at (if the table has the column). */
  lastPublishedAt?: string | null;
  /** Row's last modification timestamp. Falls back to created_at. */
  modifiedOn?: string | null;
  /** Created timestamp — used when modifiedOn is null. */
  createdOn?: string | null;
  /** Global last successful publish — used when row has no last_published_at. */
  globalLastPublishedAt?: string | null;
}

/**
 * Per-row sync indicator for C3 configuration tables.
 * - Green check: row's content is synced to C3-Wizard.
 * - Amber alert: row was modified/created after the last sync.
 */
export function C3RowSyncStatus({
  lastPublishedAt,
  modifiedOn,
  createdOn,
  globalLastPublishedAt,
}: C3RowSyncStatusProps) {
  const rowChangedAt = modifiedOn || createdOn || null;
  const baseline = lastPublishedAt ?? globalLastPublishedAt ?? null;

  let isPending: boolean;
  if (!baseline) {
    // Never published → row is pending.
    isPending = true;
  } else if (!rowChangedAt) {
    isPending = false;
  } else {
    isPending = new Date(rowChangedAt).getTime() > new Date(baseline).getTime();
  }

  const tooltip = isPending
    ? rowChangedAt
      ? `Pending sync — modified ${formatDisplayDate(rowChangedAt)}`
      : 'Pending sync to C3-Wizard'
    : baseline
      ? `Synced ${formatDisplayDate(baseline)}`
      : 'Synced';

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`inline-flex items-center justify-center ${
              isPending ? 'text-amber-500' : 'text-success'
            }`}
            aria-label={tooltip}
          >
            {isPending ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
