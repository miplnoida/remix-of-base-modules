/**
 * Block Registry — single source of truth for draggable blocks in the BN builder.
 * Section ownership determines which lane a block can be dropped into.
 */
import type { BlockDefinition, BuilderBlockKind } from './types';

export const BLOCK_REGISTRY: Record<BuilderBlockKind, BlockDefinition> = {
  // ---------- Eligibility ----------
  'eligibility.age': {
    kind: 'eligibility.age', section: 'eligibility',
    label: 'Age Condition', icon: 'Calendar',
    description: 'Age between min and max on a reference date',
    defaultProps: { min_age: 16, max_age: 65, reference_date: 'CLAIM_DATE' },
  },
  'eligibility.contribution': {
    kind: 'eligibility.contribution', section: 'eligibility',
    label: 'Contribution Condition', icon: 'Coins',
    description: 'Minimum contributions in a window',
    defaultProps: { min_contributions: 26, window_type: 'CONSECUTIVE_WEEKS', window_value: 52 },
  },
  'eligibility.document': {
    kind: 'eligibility.document', section: 'eligibility',
    label: 'Document Condition', icon: 'FileCheck',
    description: 'Specific document must be present and verified',
    defaultProps: { document_code: '', verification_required: true },
  },
  'eligibility.medical_board': {
    kind: 'eligibility.medical_board', section: 'eligibility',
    label: 'Medical Board Condition', icon: 'Stethoscope',
    description: 'Requires medical board recommendation',
    defaultProps: { decision: 'APPROVED', min_disability_pct: 0 },
  },
  'eligibility.survivor_relationship': {
    kind: 'eligibility.survivor_relationship', section: 'eligibility',
    label: 'Survivor Relationship', icon: 'Users',
    description: 'Relationship to deceased contributor',
    defaultProps: { relationship: 'SPOUSE' },
  },
  'eligibility.duplicate_claim': {
    kind: 'eligibility.duplicate_claim', section: 'eligibility',
    label: 'Duplicate Claim Check', icon: 'ShieldAlert',
    description: 'Block when an open claim already exists',
    defaultProps: { lookback_days: 365 },
  },

  // ---------- Calculation / Formula ----------
  'formula.variable': {
    kind: 'formula.variable', section: 'calculation',
    label: 'Variable', icon: 'Variable',
    description: 'Reference a registered formula variable',
    defaultProps: { variable_key: '' },
  },
  'formula.operator': {
    kind: 'formula.operator', section: 'calculation',
    label: 'Operator', icon: 'Plus',
    defaultProps: { operator: '+' },
  },
  'formula.constant': {
    kind: 'formula.constant', section: 'calculation',
    label: 'Constant', icon: 'Hash',
    defaultProps: { value: 0 },
  },
  'formula.cap': {
    kind: 'formula.cap', section: 'calculation',
    label: 'Cap', icon: 'ArrowUpFromLine',
    defaultProps: { cap: 0, cap_type: 'WEEKLY' },
  },
  'formula.minimum': {
    kind: 'formula.minimum', section: 'calculation',
    label: 'Minimum', icon: 'Minimize2',
    defaultProps: { min: 0 },
  },
  'formula.maximum': {
    kind: 'formula.maximum', section: 'calculation',
    label: 'Maximum', icon: 'Maximize2',
    defaultProps: { max: 0 },
  },
  'formula.tier': {
    kind: 'formula.tier', section: 'calculation',
    label: 'Tier', icon: 'Layers',
    defaultProps: { tiers: [] },
  },
  'formula.share_percentage': {
    kind: 'formula.share_percentage', section: 'calculation',
    label: 'Share %', icon: 'Percent',
    defaultProps: { percentage: 0, applies_to: 'BASE' },
  },

  // ---------- Documents ----------
  'document.required': {
    kind: 'document.required', section: 'documents',
    label: 'Required Document', icon: 'FileText',
    description: 'Pull from Document Library; required/optional/conditional',
    defaultProps: { document_code: '', requirement: 'REQUIRED', stage: 'INTAKE', public_upload: true, waiver_allowed: false, verification_required: true },
  },
  'document.medical_policy': {
    kind: 'document.medical_policy', section: 'documents',
    label: 'Medical Policy', icon: 'HeartPulse',
    defaultProps: { policy_code: '' },
  },

  // ---------- Screen / Field ----------
  'screen.section': {
    kind: 'screen.section', section: 'screen',
    label: 'Section', icon: 'LayoutGrid',
    defaultProps: { title: 'Section', columns: 2 },
  },
  'screen.field': {
    kind: 'screen.field', section: 'screen',
    label: 'Field', icon: 'TextCursorInput',
    defaultProps: { field_type: 'TEXT', label: '', required_condition: 'ALWAYS', visible_channels: ['INTERNAL'], editable_roles: [], data_source: '', help_text: '' },
  },

  // ---------- Workflow ----------
  'workflow.step': {
    kind: 'workflow.step', section: 'workflow',
    label: 'Workflow Step', icon: 'GitBranch',
    defaultProps: { step_code: '', role: 'INTAKE_OFFICER', workbasket_id: '', sla_hours: 24, escalation_policy_id: '', allowed_actions: [], comm_event_code: '' },
  },
  'workflow.escalation': {
    kind: 'workflow.escalation', section: 'workflow',
    label: 'Escalation Policy', icon: 'AlertTriangle',
    defaultProps: { policy_code: '', target_role: 'CLAIMS_SUPERVISOR', severity: 'MEDIUM', trigger: 'SLA_BREACH' },
  },
  'workflow.workbasket_routing': {
    kind: 'workflow.workbasket_routing', section: 'workflow',
    label: 'Workbasket Routing', icon: 'Inbox',
    defaultProps: { step_code: '', workbasket_id: '' },
  },

  // ---------- Communications ----------
  'comm.event': {
    kind: 'comm.event', section: 'communications',
    label: 'Communication Event', icon: 'MailPlus',
    defaultProps: { event_code: '', recipient_type: 'CLAIMANT', delivery_method: 'EMAIL', template_code: '', mandatory: false, fallback_method: 'POSTAL', approval_required: false },
  },

  // ---------- Cross-cutting ----------
  reason_code: {
    kind: 'reason_code', section: 'eligibility',
    label: 'Reason Code', icon: 'Tag',
    defaultProps: { reason_code: '' },
  },
};

export function listBlocksForSection(section: string): BlockDefinition[] {
  return Object.values(BLOCK_REGISTRY).filter((b) => b.section === section);
}

export function newBlock(kind: BuilderBlockKind): import('./types').BuilderBlock {
  const def = BLOCK_REGISTRY[kind];
  return {
    id: `blk_${Math.random().toString(36).slice(2, 10)}`,
    kind,
    props: structuredClone(def.defaultProps),
  };
}
