/**
 * Phase 3 — Send-time resolver helper.
 *
 * Calls public.resolve_online_response(...) RPC to compute effective portal
 * permissions for a specific communication / acknowledgment instance.
 * The resolved JSON is then frozen onto the instance row so future admin
 * policy edits do NOT retroactively change active portal links.
 */
import { supabase } from '@/integrations/supabase/client';
import type { OnlineResponseMode } from '@/types/onlineResponse';

export interface ResolvedOnlineResponse {
  enabled: boolean;
  mode: OnlineResponseMode;
  permissions: Record<string, boolean>;
  review: Record<string, unknown>;
  ttl_hours?: number | null;
  due_days?: number | null;
  matched_policy_id?: string | null;
  reason?: string;
}

export async function resolveOnlineResponse(args: {
  caseType?: string | null;
  communicationType?: string | null;
  reportType?: string | null;
  enforcementStage?: string | null;
  templateId?: string | null;
  instanceMode?: OnlineResponseMode | null;
  instanceOverrides?: Record<string, unknown> | null;
}): Promise<ResolvedOnlineResponse> {
  const { data, error } = await (supabase as any).rpc('resolve_online_response', {
    p_case_type: args.caseType ?? null,
    p_communication_type: args.communicationType ?? null,
    p_report_type: args.reportType ?? null,
    p_enforcement_stage: args.enforcementStage ?? null,
    p_template_id: args.templateId ?? null,
    p_instance_mode: args.instanceMode ?? null,
    p_instance_overrides: args.instanceOverrides ?? null,
  });
  if (error) throw error;
  return (data || {
    enabled: false,
    mode: 'NONE',
    permissions: {},
    review: {},
  }) as ResolvedOnlineResponse;
}
