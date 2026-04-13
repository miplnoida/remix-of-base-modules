import { supabase } from '@/integrations/supabase/client';

export type ResolutionType = 
  | 'PAYMENT_RECEIVED'
  | 'COMPLIANCE_ACHIEVED'
  | 'WRITTEN_OFF'
  | 'ARRANGEMENT_MADE'
  | 'EMPLOYER_CLOSED'
  | 'MERGED_DUPLICATE'
  | 'OTHER';

export const RESOLUTION_TYPE_LABELS: Record<ResolutionType, string> = {
  PAYMENT_RECEIVED: 'Payment Received',
  COMPLIANCE_ACHIEVED: 'Compliance Achieved',
  WRITTEN_OFF: 'Written Off',
  ARRANGEMENT_MADE: 'Arrangement Made',
  EMPLOYER_CLOSED: 'Employer Closed',
  MERGED_DUPLICATE: 'Merged / Duplicate',
  OTHER: 'Other',
};

// Valid status transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  OPEN: ['UNDER_REVIEW', 'ESCALATED', 'RESOLVED', 'CANCELLED'],
  UNDER_REVIEW: ['OPEN', 'ESCALATED', 'RESOLVED', 'CANCELLED'],
  ESCALATED: ['UNDER_REVIEW', 'RESOLVED', 'CANCELLED'],
  RESOLVED: ['CLOSED', 'OPEN'],
  CLOSED: ['OPEN'],
  CANCELLED: ['OPEN'],
};

function canTransition(fromStatus: string, toStatus: string): boolean {
  return VALID_TRANSITIONS[fromStatus]?.includes(toStatus) ?? false;
}

async function recordHistory(
  violationId: string,
  fromStatus: string,
  toStatus: string,
  performedBy: string,
  notes?: string
) {
  await supabase.from('ce_violation_history').insert({
    violation_id: violationId,
    field_changed: 'status',
    from_value: fromStatus,
    to_value: toStatus,
    performed_by: performedBy,
    performed_at: new Date().toISOString(),
    notes: notes || `Status changed: ${fromStatus} → ${toStatus}`,
  } as any);
}

export async function resolveViolation(
  violationId: string,
  resolutionType: ResolutionType,
  resolutionNotes: string,
  resolvedBy: string
): Promise<{ success: boolean; error?: string }> {
  // Fetch current
  const { data: violation, error: fetchErr } = await supabase
    .from('ce_violations')
    .select('status')
    .eq('id', violationId)
    .single();
  if (fetchErr || !violation) return { success: false, error: 'Violation not found' };

  const currentStatus = (violation as any).status;
  if (!canTransition(currentStatus, 'RESOLVED')) {
    return { success: false, error: `Cannot resolve from status: ${currentStatus}` };
  }

  const { error } = await supabase
    .from('ce_violations')
    .update({
      status: 'RESOLVED',
      resolved_at: new Date().toISOString(),
      resolved_by: resolvedBy,
      resolution_notes: `[${resolutionType}] ${resolutionNotes}`,
      updated_by: resolvedBy,
      updated_at: new Date().toISOString(),
    } as any)
    .eq('id', violationId);

  if (error) return { success: false, error: error.message };

  await recordHistory(violationId, currentStatus, 'RESOLVED', resolvedBy,
    `Resolved via ${RESOLUTION_TYPE_LABELS[resolutionType]}: ${resolutionNotes}`);

  return { success: true };
}

export async function closeViolation(
  violationId: string,
  closedBy: string
): Promise<{ success: boolean; error?: string }> {
  const { data: violation } = await supabase
    .from('ce_violations')
    .select('status')
    .eq('id', violationId)
    .single();
  if (!violation) return { success: false, error: 'Violation not found' };

  const currentStatus = (violation as any).status;
  if (!canTransition(currentStatus, 'CLOSED')) {
    return { success: false, error: `Cannot close from status: ${currentStatus}` };
  }

  const { error } = await supabase
    .from('ce_violations')
    .update({
      status: 'CLOSED',
      updated_by: closedBy,
      updated_at: new Date().toISOString(),
    } as any)
    .eq('id', violationId);

  if (error) return { success: false, error: error.message };
  await recordHistory(violationId, currentStatus, 'CLOSED', closedBy, 'Violation closed');
  return { success: true };
}

export async function reopenViolation(
  violationId: string,
  reason: string,
  reopenedBy: string
): Promise<{ success: boolean; error?: string }> {
  const { data: violation } = await supabase
    .from('ce_violations')
    .select('status')
    .eq('id', violationId)
    .single();
  if (!violation) return { success: false, error: 'Violation not found' };

  const currentStatus = (violation as any).status;
  if (!canTransition(currentStatus, 'OPEN')) {
    return { success: false, error: `Cannot reopen from status: ${currentStatus}` };
  }

  const { error } = await supabase
    .from('ce_violations')
    .update({
      status: 'OPEN',
      resolved_at: null,
      resolved_by: null,
      resolution_notes: null,
      updated_by: reopenedBy,
      updated_at: new Date().toISOString(),
    } as any)
    .eq('id', violationId);

  if (error) return { success: false, error: error.message };
  await recordHistory(violationId, currentStatus, 'OPEN', reopenedBy, `Reopened: ${reason}`);
  return { success: true };
}

export async function cancelViolation(
  violationId: string,
  reason: string,
  cancelledBy: string
): Promise<{ success: boolean; error?: string }> {
  const { data: violation } = await supabase
    .from('ce_violations')
    .select('status')
    .eq('id', violationId)
    .single();
  if (!violation) return { success: false, error: 'Violation not found' };

  const currentStatus = (violation as any).status;
  if (!canTransition(currentStatus, 'CANCELLED')) {
    return { success: false, error: `Cannot cancel from status: ${currentStatus}` };
  }

  const { error } = await supabase
    .from('ce_violations')
    .update({
      status: 'CANCELLED',
      resolution_notes: `[CANCELLED] ${reason}`,
      updated_by: cancelledBy,
      updated_at: new Date().toISOString(),
    } as any)
    .eq('id', violationId);

  if (error) return { success: false, error: error.message };
  await recordHistory(violationId, currentStatus, 'CANCELLED', cancelledBy, `Cancelled: ${reason}`);
  return { success: true };
}

export async function escalateViolation(
  violationId: string,
  escalatedBy: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const { data: violation } = await supabase
    .from('ce_violations')
    .select('status')
    .eq('id', violationId)
    .single();
  if (!violation) return { success: false, error: 'Violation not found' };

  const currentStatus = (violation as any).status;
  if (!canTransition(currentStatus, 'ESCALATED')) {
    return { success: false, error: `Cannot escalate from status: ${currentStatus}` };
  }

  const { error } = await supabase
    .from('ce_violations')
    .update({
      status: 'ESCALATED',
      escalated_at: new Date().toISOString(),
      escalated_to: escalatedBy,
      updated_by: escalatedBy,
      updated_at: new Date().toISOString(),
    } as any)
    .eq('id', violationId);

  if (error) return { success: false, error: error.message };
  await recordHistory(violationId, currentStatus, 'ESCALATED', escalatedBy, reason || 'Manual escalation');
  return { success: true };
}
