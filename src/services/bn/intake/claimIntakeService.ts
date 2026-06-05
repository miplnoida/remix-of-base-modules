/**
 * BN Claim Intake Service
 *
 * Single entry point used by every channel (PUBLIC_ONLINE, STAFF_OFFLINE,
 * ASSISTED_COUNTER, BACK_OFFICE_ENTRY) to submit a benefit application.
 *
 * Wraps the transactional RPC `bn_submit_claim_application`, which:
 *   - resolves the active product version for the claim date
 *   - creates `bn_claim` (status INTAKE)
 *   - records the submitted payload in `bn_claim_application`
 *   - captures person / employer / contribution snapshots
 *   - materialises the document checklist
 *   - records intake validations
 *   - starts the workflow instance when configured
 */
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

export type ApplicationChannel =
  | 'PUBLIC_ONLINE'
  | 'STAFF_OFFLINE'
  | 'ASSISTED_COUNTER'
  | 'BACK_OFFICE_ENTRY'
  | 'MIGRATED_LEGACY';

export interface SubmitClaimApplicationInput {
  ssn: string;
  productCode: string;
  claimDate: string; // yyyy-MM-dd
  channel: ApplicationChannel;
  formPayload: Record<string, any>;
  employerRegno?: string | null;
  submittedByUserId?: string | null;
  sourceIp?: string | null;
  userAgent?: string | null;
}

export interface SubmitClaimApplicationResult {
  claimId: string;
  claimNumber: string;
  workflowInstanceId: string | null;
}

export async function submitClaimApplication(
  input: SubmitClaimApplicationInput,
): Promise<SubmitClaimApplicationResult> {
  const { data, error } = await db.rpc('bn_submit_claim_application', {
    p_ssn: input.ssn,
    p_product_code: input.productCode,
    p_claim_date: input.claimDate,
    p_channel: input.channel,
    p_form_payload: input.formPayload ?? {},
    p_employer_regno: input.employerRegno ?? null,
    p_submitted_by_user_id: input.submittedByUserId ?? null,
    p_source_ip: input.sourceIp ?? null,
    p_user_agent: input.userAgent ?? null,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return {
    claimId: row.claim_id,
    claimNumber: row.claim_number,
    workflowInstanceId: row.workflow_instance_id ?? null,
  };
}
