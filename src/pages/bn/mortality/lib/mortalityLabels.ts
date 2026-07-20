/**
 * BN-MORT-UX-2 §4 — Shared, business-friendly labels for Mortality enums.
 * Never scatter `.replaceAll('_', ' ')` across components.
 */

export const MORTALITY_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  REPORTED: 'Reported',
  MATCHED: 'Matched',
  VERIFICATION_PENDING: 'Verification pending',
  PROVISIONALLY_HELD: 'Provisionally held',
  VERIFIED: 'Verified',
  IMPACT_REVIEW: 'Impact review',
  APPROVAL_PENDING: 'Approval pending',
  CONFIRMED: 'Confirmed',
  FOLLOW_ON_PROCESSING: 'Follow-on processing',
  COMPLETED: 'Completed',
  CLOSED: 'Closed',
  CONFLICT: 'Conflict',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
  DUPLICATE: 'Duplicate',
  REVERSED: 'Reversed',
};

export const MORTALITY_SOURCE_LABELS: Record<string, string> = {
  REGISTRAR_FEED: 'Registrar feed',
  IP_MODULE: 'IP module',
  FAMILY_NOTIFICATION: 'Family notification',
  HOSPITAL_NOTICE: 'Hospital notice',
  STAFF_ENTRY: 'Staff entry',
  OTHER: 'Other',
};

function titleCase(raw: string): string {
  const s = raw.replace(/_/g, ' ').toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function mortalityStatusLabel(status: string | null | undefined): string {
  if (!status) return '—';
  return MORTALITY_STATUS_LABELS[status] ?? titleCase(status);
}

export function mortalitySourceLabel(source: string | null | undefined): string {
  if (!source) return '—';
  return MORTALITY_SOURCE_LABELS[source] ?? titleCase(source);
}
