/**
 * Phase 4 — Portal gating helper.
 *
 * Reads the FROZEN snapshot stored on the acknowledgment row (or any
 * communication instance) and returns the booleans the public portal UI
 * should respect. Never reads live policies — those have already been
 * resolved at send time.
 */
import type { AuditReportAcknowledgment } from '@/types/auditReport';
import type { OnlineResponseMode } from '@/types/onlineResponse';

export interface PortalGate {
  /** Show the report PDF/preview to the recipient */
  canView: boolean;
  /** Show the acknowledge / sign block */
  canAcknowledge: boolean;
  /** Show the response composer */
  canSubmitResponse: boolean;
  /** Show the dispute composer */
  canDispute: boolean;
  /** Show the document upload field */
  canUpload: boolean;
  /** Resolved mode (for badge display) */
  mode: OnlineResponseMode;
  /** Why interactions are disabled, if any */
  disabledReason?: string;
}

const FULL_PERMS = {
  portal_enabled: true,
  allow_acknowledgment: true,
  allow_document_upload: true,
  allow_clarification: true,
  allow_narrative_response: true,
  allow_dispute: true,
  allow_corrective_action_response: true,
  allow_payment_response: true,
};

export function gateFromAcknowledgment(ack?: AuditReportAcknowledgment | null): PortalGate {
  if (!ack) {
    return {
      canView: false,
      canAcknowledge: false,
      canSubmitResponse: false,
      canDispute: false,
      canUpload: false,
      mode: 'NONE',
      disabledReason: 'No acknowledgment record',
    };
  }

  // Backwards-compat: pre-Phase-3 links have no snapshot — preserve old
  // behavior (acknowledge-only) so existing in-flight links keep working.
  const mode: OnlineResponseMode = (ack.portalResolvedMode as OnlineResponseMode) || 'ACKNOWLEDGMENT_ONLY';
  const enabled = ack.portalResolvedEnabled ?? true;
  const perms = ack.portalResolvedPermissions || {};

  if (!enabled || mode === 'NONE') {
    return {
      canView: false,
      canAcknowledge: false,
      canSubmitResponse: false,
      canDispute: false,
      canUpload: false,
      mode: 'NONE',
      disabledReason: 'Online response is not enabled for this communication',
    };
  }

  if (mode === 'VIEW_ONLY') {
    return {
      canView: true,
      canAcknowledge: false,
      canSubmitResponse: false,
      canDispute: false,
      canUpload: false,
      mode,
      disabledReason: 'This document is read-only',
    };
  }

  // ACKNOWLEDGMENT_ONLY / LIMITED / FULL — read flags from snapshot,
  // defaulting LIMITED/FULL to permissive when a flag is absent.
  const defaults = mode === 'ACKNOWLEDGMENT_ONLY'
    ? { allow_acknowledgment: true }
    : mode === 'FULL_RESPONSE'
    ? FULL_PERMS
    : {}; // LIMITED → strictly what policy provided

  const merged: Record<string, boolean> = { ...defaults, ...perms };

  return {
    canView: true,
    canAcknowledge: !!merged.allow_acknowledgment,
    canSubmitResponse: !!(merged.allow_narrative_response || merged.allow_clarification || merged.allow_corrective_action_response),
    canDispute: !!merged.allow_dispute,
    canUpload: !!merged.allow_document_upload,
    mode,
  };
}
