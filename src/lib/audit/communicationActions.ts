/**
 * Audit Communication — Action Registry
 *
 * Canonical, typed catalog of all configurable per-template "actions" (rules)
 * used by the editor, dispatcher, and instance composer.
 *
 * Storage: ce_audit_communication_template_actions (one row per (template_id, action_key)).
 * Backward compat: legacy attachment_rule_json is read as a fallback; the table wins
 * when both are present (see mergeEffectiveActions below).
 */
import type {
  CeCommActionKey,
  AuditCommunicationTemplateAction,
  CommAttachmentRule,
  CeCommType,
} from '@/types/auditCommunication';

export type ActionGroup = 'attachments' | 'recipient_behavior' | 'workflow' | 'response';

export interface ActionDefinition {
  key: CeCommActionKey;
  label: string;
  description: string;
  group: ActionGroup;
  /** When undefined → applies to all comm_types. */
  applicableCommTypes?: CeCommType[];
  /** Default config when first enabled. */
  defaultConfig?: Record<string, unknown>;
  /** Default sort order in the editor UI. */
  sortOrder: number;
}

export const COMMUNICATION_ACTIONS: ActionDefinition[] = [
  // Attachments
  { key: 'include_report_pdf',     label: 'Include Report PDF',         description: 'Attach the inspection / audit report PDF.',                              group: 'attachments', sortOrder: 10 },
  { key: 'include_evidence',       label: 'Include Evidence',           description: 'Attach evidence files captured during the audit.',                       group: 'attachments', sortOrder: 20 },
  { key: 'include_violations',     label: 'Include Violations',         description: 'Attach the list of detected violations.',                                 group: 'attachments', sortOrder: 30 },
  { key: 'include_findings_memo',  label: 'Include Findings Memo',      description: 'Attach the internal findings memo.',                                      group: 'attachments', sortOrder: 40 },
  { key: 'include_books_annexure', label: 'Include Books Annexure',     description: 'Attach the list of books / records requested.',                           group: 'attachments', sortOrder: 50 },
  { key: 'include_payment_summary',label: 'Include Payment Summary',    description: 'Attach the latest payment / arrears summary.',                            group: 'attachments', sortOrder: 60 },
  { key: 'use_secure_link',        label: 'Use Secure Link',            description: 'Send a secure portal link instead of raw attachments.',                   group: 'attachments', sortOrder: 70 },

  // Recipient behavior
  { key: 'require_acknowledgment', label: 'Require Acknowledgment',     description: 'Recipient must explicitly acknowledge receipt before the case proceeds.', group: 'recipient_behavior', sortOrder: 110 },

  // Online response / portal
  { key: 'allow_online_response',  label: 'Allow Online Response',      description: 'Employer can respond via the secure portal.',                             group: 'response', sortOrder: 210 },
  { key: 'allow_document_upload',  label: 'Allow Document Upload',      description: 'Employer can upload supporting documents from the portal.',               group: 'response', sortOrder: 220 },
  { key: 'allow_clarification',    label: 'Allow Clarification',        description: 'Employer can request clarification on findings.',                         group: 'response', sortOrder: 230 },
  { key: 'allow_dispute',          label: 'Allow Dispute',              description: 'Employer can file a formal dispute against findings.',                    group: 'response', sortOrder: 240 },

  // Workflow
  { key: 'assign_response_review_workflow', label: 'Assign Review Workflow', description: 'Route the employer response into a review workflow.',                group: 'workflow', defaultConfig: { workflow_code: '' }, sortOrder: 310 },
  { key: 'trigger_followup_reminder',       label: 'Trigger Follow-up',      description: 'Schedule an automatic follow-up reminder if no response is received.', group: 'workflow', defaultConfig: { offset_days: 7 }, sortOrder: 320 },
];

export const ACTION_LABELS: Record<CeCommActionKey, string> =
  Object.fromEntries(COMMUNICATION_ACTIONS.map(a => [a.key, a.label])) as Record<CeCommActionKey, string>;

export const ACTION_GROUP_LABELS: Record<ActionGroup, string> = {
  attachments: 'Attachments',
  recipient_behavior: 'Recipient Behavior',
  response: 'Online Response',
  workflow: 'Workflow',
};

/** Filter the catalog to actions applicable to a given comm_type. */
export function getActionsForCommType(commType: CeCommType): ActionDefinition[] {
  return COMMUNICATION_ACTIONS.filter(
    (a) => !a.applicableCommTypes || a.applicableCommTypes.includes(commType)
  );
}

/**
 * Compute the effective enabled-action set for a template.
 * - Structured actions table wins.
 * - Legacy attachment_rule_json fills any missing keys (back-compat).
 */
export function mergeEffectiveActions(
  rows: AuditCommunicationTemplateAction[],
  legacy: CommAttachmentRule | null | undefined,
): Record<CeCommActionKey, boolean> {
  const out = {} as Record<CeCommActionKey, boolean>;
  for (const def of COMMUNICATION_ACTIONS) out[def.key] = false;

  // Legacy first (lower precedence)
  if (legacy) {
    if (legacy.include_report_pdf)     out.include_report_pdf = true;
    if (legacy.include_evidence)       out.include_evidence = true;
    if (legacy.include_violations)     out.include_violations = true;
    if (legacy.include_findings_memo)  out.include_findings_memo = true;
    if (legacy.include_books_annexure) out.include_books_annexure = true;
    if (legacy.include_payment_summary)out.include_payment_summary = true;
    if (legacy.use_secure_link)        out.use_secure_link = true;
  }

  // Structured rows win
  for (const r of rows) out[r.action_key] = r.is_enabled;

  return out;
}
