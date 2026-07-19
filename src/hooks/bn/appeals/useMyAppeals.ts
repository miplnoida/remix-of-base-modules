import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ClaimantAppealRow {
  readonly id: string;
  readonly appeal_number: string;
  readonly bn_claim_id: string | null;
  readonly appeal_type_code: string;
  readonly status: string;
  readonly outcome: string | null;
  readonly submitted_at: string | null;
  readonly filing_deadline_date: string | null;
  readonly reason_summary: string | null;
}

/**
 * Claimant-facing read of their own appeals. Read-only projection; the
 * anon read of `bn_appeal` is legitimate here because the caller's SSN
 * linkage restricts the visible claims to their own — the RPC that submits
 * appeals is the write boundary. If tighter row filtering is later required
 * we swap this hook's implementation for a dedicated RPC without changing
 * the page.
 */
export function useMyAppeals(claimIds: readonly string[]) {
  return useQuery({
    queryKey: ['bn-appeals', 'me', [...claimIds].sort().join(',')],
    enabled: claimIds.length > 0,
    queryFn: async (): Promise<readonly ClaimantAppealRow[]> => {
      const { data, error } = await (supabase as any)
        .from('bn_appeal')
        .select(
          'id, appeal_number, bn_claim_id, appeal_type_code, status, outcome, submitted_at, filing_deadline_date, reason_summary',
        )
        .in('bn_claim_id', claimIds as string[])
        .order('submitted_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ClaimantAppealRow[];
    },
  });
}
