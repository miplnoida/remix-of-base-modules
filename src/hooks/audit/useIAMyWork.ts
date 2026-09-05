/**
 * IA Phase 5 — My Work / Continue Audit read models.
 *
 * NO SECOND TASK ENGINE. Every list below is a server-side read model derived
 * from canonical Internal Audit state:
 *   - ia_q_my_audit_work    (existing Action Centre work queue)
 *   - ia_q_continue_audit   (Phase 5 resume resolver, canonical state only)
 *   - ia_q_my_audits        (Phase 5 assigned-audit summary)
 * Nothing is written, cached as truth, or duplicated into another table.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { normalizeAuditLink } from '@/hooks/useAuditActionCentre';

async function callRpc<T = any>(fn: string): Promise<T[]> {
  const { data, error } = await (supabase.rpc as any)(fn);
  if (error) throw new Error(error.message);
  return Array.isArray(data) ? data : [];
}

export interface ContinueAuditItem {
  engagement_id: string;
  engagement_code: string | null;
  engagement_name: string | null;
  department_name: string | null;
  stage: string;
  priority: number;
  work_type: string;
  work_label: string;
  work_detail: string | null;
  reason: string | null;
  link: string;
  planned_end_date: string | null;
}

export interface MyAuditItem {
  engagement_id: string;
  engagement_code: string | null;
  engagement_name: string | null;
  department_name: string | null;
  stage: string;
  status: string;
  my_role: string;
  is_closed: boolean;
  procedures_total: number;
  procedures_done: number;
  findings_total: number;
  findings_open: number;
  exceptions_open: number;
  actions_overdue: number;
  planned_start_date: string | null;
  planned_end_date: string | null;
}

export interface MyWorkItem {
  required_action: string;
  reference: string | null;
  audit: string | null;
  stage: string | null;
  status: string | null;
  severity: string | null;
  due_date: string | null;
  overdue_days: number;
  engagement_id: string;
  record_id: string;
  link: string;
  department_name?: string | null;
}

export function useIaContinueAudit(enabled = true) {
  return useQuery({
    queryKey: ['ia_q_continue_audit'],
    queryFn: async () => {
      const rows = await callRpc<ContinueAuditItem>('ia_q_continue_audit');
      return rows.map((r) => ({ ...r, link: normalizeAuditLink(r.link) || r.link }));
    },
    enabled,
    staleTime: 30_000,
  });
}

export function useIaMyAudits(enabled = true) {
  return useQuery({
    queryKey: ['ia_q_my_audits'],
    queryFn: () => callRpc<MyAuditItem>('ia_q_my_audits'),
    enabled,
    staleTime: 30_000,
  });
}

/** Stages of `ia_q_my_audit_work` the auditor cannot progress on their own. */
const WAITING_ON_OTHERS = new Set(['Responses', 'Corrective Actions', 'Follow-Up']);
const REVIEW_WORK = new Set(['Fieldwork Review', 'Quality Review']);

export interface GroupedMyWork {
  needsMyAction: MyWorkItem[];
  needsReview: MyWorkItem[];
  waitingOnOthers: MyWorkItem[];
  dueSoon: MyWorkItem[];
  all: MyWorkItem[];
}

/**
 * Splits the canonical work queue into the daily buckets. Waiting-on-others
 * items are never counted as auditor-overdue work (Phase 5 §15).
 */
export function groupMyWork(items: MyWorkItem[]): GroupedMyWork {
  const needsReview: MyWorkItem[] = [];
  const waitingOnOthers: MyWorkItem[] = [];
  const needsMyAction: MyWorkItem[] = [];

  for (const item of items) {
    const stage = item.stage || '';
    if (REVIEW_WORK.has(stage)) needsReview.push(item);
    else if (WAITING_ON_OTHERS.has(stage)) waitingOnOthers.push(item);
    else needsMyAction.push(item);
  }

  const horizon = new Date();
  horizon.setDate(horizon.getDate() + 7);
  const dueSoon = [...needsMyAction, ...needsReview].filter(
    (i) => i.due_date && new Date(i.due_date) <= horizon,
  );

  return { needsMyAction, needsReview, waitingOnOthers, dueSoon, all: items };
}

export function useIaMyWorkBuckets(enabled = true) {
  const query = useQuery({
    queryKey: ['ia_q_my_audit_work'],
    queryFn: async () => {
      const rows = await callRpc<MyWorkItem>('ia_q_my_audit_work');
      return rows.map((r) => ({ ...r, link: normalizeAuditLink(r.link) || r.link }));
    },
    enabled,
    staleTime: 30_000,
  });

  return { ...query, buckets: groupMyWork(query.data ?? []) };
}
