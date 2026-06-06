/**
 * Shared types for the BN Config Builder framework.
 * Canvas JSON shape persisted to bn_product_version (eligibility_config._canvas).
 */

export type BuilderSectionKey =
  | 'eligibility'
  | 'calculation'
  | 'documents'
  | 'screen'
  | 'workflow'
  | 'communications'
  | 'payments'
  | 'servicing';

export type BuilderBlockKind =
  // Eligibility
  | 'eligibility.age'
  | 'eligibility.contribution'
  | 'eligibility.document'
  | 'eligibility.medical_board'
  | 'eligibility.survivor_relationship'
  | 'eligibility.duplicate_claim'
  // Calculation
  | 'formula.variable'
  | 'formula.operator'
  | 'formula.constant'
  | 'formula.cap'
  | 'formula.minimum'
  | 'formula.maximum'
  | 'formula.tier'
  | 'formula.share_percentage'
  // Documents
  | 'document.required'
  | 'document.medical_policy'
  // Screen
  | 'screen.section'
  | 'screen.field'
  // Workflow
  | 'workflow.step'
  | 'workflow.escalation'
  | 'workflow.workbasket_routing'
  // Communications
  | 'comm.event'
  // Cross-cutting
  | 'reason_code';

export interface BuilderBlock {
  id: string;
  kind: BuilderBlockKind;
  /** Properties — varies per kind, validated by inspector. */
  props: Record<string, any>;
  /** Optional nested blocks (e.g. formula tree, screen sections). */
  children?: BuilderBlock[];
}

export interface BuilderCanvas {
  version: 1;
  sections: Record<BuilderSectionKey, BuilderBlock[]>;
  updatedAt?: string;
}

export const EMPTY_CANVAS: BuilderCanvas = {
  version: 1,
  sections: {
    eligibility: [],
    calculation: [],
    documents: [],
    screen: [],
    workflow: [],
    communications: [],
    payments: [],
    servicing: [],
  },
};

export interface BlockDefinition {
  kind: BuilderBlockKind;
  section: BuilderSectionKey;
  label: string;
  description?: string;
  icon?: string; // lucide name
  defaultProps: Record<string, any>;
}

export interface BuilderValidationIssue {
  blockId?: string;
  section?: BuilderSectionKey;
  severity: 'ERROR' | 'WARNING';
  message: string;
}
