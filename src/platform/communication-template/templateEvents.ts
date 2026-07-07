/**
 * OM-5 — audit event codes for canonical Document Templates.
 * Re-exports the canonical group from AUDIT_EVENTS so callers have a small,
 * scoped surface without importing the whole registry.
 */
import { AUDIT_EVENTS } from '@/platform/audit/auditEventTypes';

export const DOCUMENT_TEMPLATE_EVENTS = AUDIT_EVENTS.documentTemplate;
