/**
 * Central registry of system-code entities that must be auto-generated
 * by the central numbering engine (core_number_sequence + core_generate_number).
 *
 * Rule of thumb:
 *   - System / internal codes  → listed here, auto-generated, read-only in UI.
 *   - Business / reference codes (statute, bank, court, ISO) → NOT listed here;
 *     keep manual/validated input.
 *
 * The `useAutoCode` hook and the `<AutoCodeField />` component both read from
 * this registry. A future lint rule (`scripts/lint-no-manual-code.ts`) will
 * fail CI if any create form binds an editable input to a `*_code` field
 * whose entity appears here.
 */

export interface AutoCodeEntity {
  /** Stable key used by hooks/components. */
  key: string;
  /** p_module_code passed to the numbering RPC. */
  moduleCode: string;
  /** p_entity_type passed to the numbering RPC. */
  entityType: string;
  /** Human label for logs / admin UI. */
  label: string;
  /** Pattern seeded in core_number_sequence (for docs — the engine is source of truth). */
  pattern: string;
  /** Table + column the code lands in (informational). */
  target: { table: string; column: string };
  /** Whether the pattern needs a department/module discriminator at generate time. */
  needsDepartmentCode?: boolean;
}

export const AUTO_CODE_REGISTRY: Record<string, AutoCodeEntity> = {
  // ── Phase A ─────────────────────────────────────────────────────────
  TEXT_BLOCK: {
    key: "TEXT_BLOCK",
    moduleCode: "CORE",
    entityType: "TEXT_BLOCK",
    label: "Text Block",
    pattern: "TB-{DEPARTMENT}-{SEQ}",
    target: { table: "core_text_block", column: "text_block_code" },
    needsDepartmentCode: true,
  },
  TEMPLATE: {
    key: "TEMPLATE",
    moduleCode: "CORE",
    entityType: "TEMPLATE",
    label: "Template",
    pattern: "TPL-{DEPARTMENT}-{SEQ}",
    target: { table: "core_template", column: "template_code" },
    needsDepartmentCode: true,
  },
  TEMPLATE_CATEGORY: {
    key: "TEMPLATE_CATEGORY",
    moduleCode: "CORE",
    entityType: "TEMPLATE_CATEGORY",
    label: "Template Category",
    pattern: "TCAT-{SEQ}",
    target: { table: "core_template_category", column: "category_code" },
  },
  TEMPLATE_TOKEN: {
    key: "TEMPLATE_TOKEN",
    moduleCode: "CORE",
    entityType: "TEMPLATE_TOKEN",
    label: "Template Token",
    pattern: "TTOK-{DEPARTMENT}-{SEQ}",
    target: { table: "core_template_token", column: "token_code" },
    needsDepartmentCode: true,
  },
  TEMPLATE_CHANNEL: {
    key: "TEMPLATE_CHANNEL",
    moduleCode: "CORE",
    entityType: "TEMPLATE_CHANNEL",
    label: "Template Channel",
    pattern: "CH-{SEQ}",
    target: { table: "core_template_channel", column: "channel_code" },
  },
  COMM_ASSET: {
    key: "COMM_ASSET",
    moduleCode: "CORE",
    entityType: "COMM_ASSET",
    label: "Communication Asset",
    pattern: "CA-{DEPARTMENT}-{SEQ}",
    target: { table: "comm_media_asset", column: "code" },
    needsDepartmentCode: true,
  },

  // ── Phase B (Legal) ─────────────────────────────────────────────────
  LEGAL_STAGE: {
    key: "LEGAL_STAGE",
    moduleCode: "LEGAL",
    entityType: "STAGE",
    label: "Legal Stage",
    pattern: "LGS-{DEPARTMENT}-{SEQ}",
    target: { table: "lg_case_source_stage", column: "stage_code" },
    needsDepartmentCode: true,
  },
  LEGAL_RULE: {
    key: "LEGAL_RULE",
    moduleCode: "LEGAL",
    entityType: "RULE",
    label: "Legal Rule",
    pattern: "LGR-{DEPARTMENT}-{SEQ}",
    target: { table: "lg_stage_action_rule", column: "rule_code" },
    needsDepartmentCode: true,
  },
  SLA_RULE: {
    key: "SLA_RULE",
    moduleCode: "CORE",
    entityType: "SLA_RULE",
    label: "SLA Rule",
    pattern: "SLA-{DEPARTMENT}-{SEQ}",
    target: { table: "legal_referral_sla_rule", column: "rule_code" },
    needsDepartmentCode: true,
  },
  FEE_RULE: {
    key: "FEE_RULE",
    moduleCode: "LEGAL",
    entityType: "FEE_RULE",
    label: "Fee Rule",
    pattern: "FEE-{SEQ}",
    target: { table: "lg_fee_rule", column: "rule_code" },
  },
  FEE_WAIVER_POLICY: {
    key: "FEE_WAIVER_POLICY",
    moduleCode: "LEGAL",
    entityType: "FEE_WAIVER",
    label: "Fee Waiver Policy",
    pattern: "FWP-{SEQ}",
    target: { table: "lg_fee_waiver_policy", column: "policy_code" },
  },
  DOCUMENT_RULE: {
    key: "DOCUMENT_RULE",
    moduleCode: "CORE",
    entityType: "DOC_RULE",
    label: "Document Rule",
    pattern: "DOC-{DEPARTMENT}-{SEQ}",
    target: { table: "lg_stage_document_rule", column: "rule_code" },
    needsDepartmentCode: true,
  },

  // ── Phase C (Workflow / approvals) ──────────────────────────────────
  WORKFLOW_RULE: {
    key: "WORKFLOW_RULE",
    moduleCode: "CORE",
    entityType: "WORKFLOW_RULE",
    label: "Workflow / Approval Rule",
    pattern: "WFR-{DEPARTMENT}-{SEQ}",
    target: { table: "lg_workflow_policy", column: "policy_code" },
    needsDepartmentCode: true,
  },
};

/**
 * Business / reference codes that MUST remain user-controlled input.
 * Kept here so the future lint rule can whitelist them explicitly.
 */
export const BUSINESS_CODE_FIELDS: ReadonlyArray<{ table: string; column: string; reason: string }> = [
  { table: "core_legal_reference", column: "reference_code", reason: "Statute / regulation identifier" },
  { table: "lg_court", column: "code", reason: "External court identifier" },
  { table: "lg_court_venue", column: "code", reason: "External venue identifier" },
  { table: "bn_bank_master", column: "bank_code", reason: "Regulator-assigned bank code" },
  { table: "bn_bank_branch", column: "branch_code", reason: "Regulator-assigned branch code" },
  { table: "bn_reason_code", column: "code", reason: "Regulatory reason code" },
  { table: "bn_product", column: "product_code", reason: "Externally published product code" },
];

export function getAutoCodeEntity(key: string): AutoCodeEntity | undefined {
  return AUTO_CODE_REGISTRY[key];
}
