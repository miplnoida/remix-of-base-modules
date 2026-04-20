/**
 * Phase G — Materialize accepted public submissions into formal compliance
 * records (ce_audit_employer_responses / ce_audit_disputes) and back-link
 * the submission row so officers see they're already promoted.
 */
import { supabase } from '@/integrations/supabase/client';
import type {
  FindingResponseSubmission,
  FindingDisputeSubmission,
} from '@/types/auditPublicSubmissions';

interface LinkContext {
  /** UserCode of the officer performing the action (for created_by/raised_by). */
  userCode: string | null;
}

/** Resolve employer_id for a given inspection. */
async function resolveEmployerId(inspectionId: string): Promise<string> {
  const { data, error } = await (supabase as any)
    .from('ce_inspections')
    .select('employer_id')
    .eq('id', inspectionId)
    .maybeSingle();
  if (error) throw error;
  if (!data?.employer_id) throw new Error('Inspection has no employer linked');
  return data.employer_id as string;
}

/**
 * Promote an accepted public RESPONSE submission to ce_audit_employer_responses.
 * Idempotent: if already linked, returns the existing linked id.
 */
export async function linkResponseSubmission(
  submission: FindingResponseSubmission,
  ctx: LinkContext
): Promise<string> {
  if (submission.linked_response_id) return submission.linked_response_id;

  const employer_id = await resolveEmployerId(submission.inspection_id);

  const insertRow = {
    inspection_id: submission.inspection_id,
    employer_id,
    response_kind: 'finding_response',
    body: submission.response_text,
    payload: {
      source: 'public_portal',
      submission_id: submission.id,
      finding_id: submission.finding_id,
      submitter_name: submission.submitter_name,
      submitter_designation: submission.submitter_designation,
      submitter_email: submission.submitter_email,
      attachment_url: submission.attachment_url,
    },
    submitted_by: submission.submitter_name,
    submitted_at: submission.submitted_at,
  };

  const { data, error } = await (supabase as any)
    .from('ce_audit_employer_responses')
    .insert(insertRow)
    .select('id')
    .single();
  if (error) throw error;

  const linkedId = data.id as string;
  const { error: upErr } = await (supabase as any)
    .from('ce_audit_finding_response_submissions')
    .update({ linked_response_id: linkedId })
    .eq('id', submission.id);
  if (upErr) throw upErr;

  return linkedId;
}

/**
 * Promote an accepted/upheld public DISPUTE submission to ce_audit_disputes.
 * Idempotent: returns the existing linked id if present.
 */
export async function linkDisputeSubmission(
  submission: FindingDisputeSubmission,
  ctx: LinkContext
): Promise<string> {
  if (submission.linked_dispute_id) return submission.linked_dispute_id;

  const employer_id = await resolveEmployerId(submission.inspection_id);

  const insertRow = {
    inspection_id: submission.inspection_id,
    employer_id,
    finding_id: submission.finding_id,
    violation_id: submission.violation_id,
    dispute_reason: submission.dispute_reason,
    body: submission.dispute_details,
    status: 'open',
    raised_by: submission.submitter_name,
    raised_at: submission.submitted_at,
  };

  const { data, error } = await (supabase as any)
    .from('ce_audit_disputes')
    .insert(insertRow)
    .select('id')
    .single();
  if (error) throw error;

  const linkedId = data.id as string;
  const { error: upErr } = await (supabase as any)
    .from('ce_audit_finding_dispute_submissions')
    .update({ linked_dispute_id: linkedId })
    .eq('id', submission.id);
  if (upErr) throw upErr;

  return linkedId;
}
