/**
 * Fact Source Templates — declarative presets that pre-fill the Fact editor
 * with safe defaults for common derivation patterns. Templates DO NOT generate
 * resolvers; they just remove the cognitive load of correctly wiring metadata.
 */
import type { EligibilityFactInput } from './eligibilityFactService';

export type FactTemplateId =
  | 'DIRECT_FIELD'
  | 'AGE_FROM_DOB'
  | 'DAYS_BETWEEN_DATES'
  | 'COUNT_PAID_WEEKS_IN_WINDOW'
  | 'DOCUMENT_EXISTS'
  | 'DOCUMENT_STATUS'
  | 'EMPLOYER_STATUS'
  | 'EXISTENCE_CHECK'
  | 'DECEASED_CONTRIBUTION_SNAPSHOT'
  | 'RESOLVER_ONLY';

export interface FactTemplate {
  id: FactTemplateId;
  label: string;
  description: string;
  defaults: Partial<EligibilityFactInput>;
}

const WEEKS_BASE = {
  base_table: 'ip_wages',
  base_date_column: 'period',
  base_value_columns: ['wages_paid1','wages_paid2','wages_paid3','wages_paid4','wages_paid5','wages_paid6','wages_paid7'],
  base_code_columns: ['paid_code1','paid_code2','paid_code3','paid_code4','paid_code5','paid_code6','paid_code7'],
  count_logic: 'count week if any wages_paid1..7 > 0',
  output_table: 'bn_claim_contribution_snapshot',
  output_column: 'contribution_json',
  snapshot_builder: 'ensureContributionSnapshot',
};

export const FACT_TEMPLATES: FactTemplate[] = [
  {
    id: 'DIRECT_FIELD',
    label: 'Direct database field',
    description: 'A literal column on a known table (e.g. ip_master.status).',
    defaults: {
      source_type: 'DIRECT_FIELD',
      data_type: 'string',
      requires_snapshot: false,
      requires_claim_context: false,
      allowed_operators: ['EQUALS','NOT_EQUALS','IN','NOT_IN','EXISTS'],
    },
  },
  {
    id: 'AGE_FROM_DOB',
    label: 'Age computed from DOB',
    description: 'Age in years at a chosen anchor date, computed from ip_master.dob.',
    defaults: {
      source_type: 'DERIVED_AGGREGATE',
      data_type: 'number',
      base_table: 'ip_master',
      base_date_column: 'dob',
      window_anchor: 'claim_date',
      count_logic: 'years between dob and anchor',
      requires_snapshot: false,
      requires_ssn: true,
      allowed_operators: ['GREATER_OR_EQUAL','LESS_OR_EQUAL','BETWEEN','EQUALS'],
    },
  },
  {
    id: 'DAYS_BETWEEN_DATES',
    label: 'Days between two dates',
    description: 'Calendar days between an event date and an anchor date.',
    defaults: {
      source_type: 'DERIVED_AGGREGATE',
      data_type: 'number',
      window_anchor: 'claim_date',
      count_logic: 'days between event_date and anchor',
      requires_claim_context: true,
      allowed_operators: ['LESS_OR_EQUAL','GREATER_OR_EQUAL','BETWEEN'],
    },
  },
  {
    id: 'COUNT_PAID_WEEKS_IN_WINDOW',
    label: 'Count paid weeks in window',
    description: 'Counts weekly wage rows in a rolling window (e.g. last 13 weeks). Output stored in contribution_json.window_N.',
    defaults: {
      source_type: 'DERIVED_AGGREGATE',
      data_type: 'number',
      window_type: 'WEEKS',
      window_size: 13,
      window_anchor: 'claim_date',
      output_json_key: 'window_13',
      requires_snapshot: true,
      requires_claim_context: true,
      requires_ssn: true,
      allowed_operators: ['GREATER_OR_EQUAL','GREATER_THAN','BETWEEN','LESS_THAN'],
      ...WEEKS_BASE,
    },
  },
  {
    id: 'DOCUMENT_EXISTS',
    label: 'Document exists',
    description: 'Checks whether a specific document type is attached to the claim.',
    defaults: {
      source_type: 'DOCUMENT_CHECK',
      data_type: 'boolean',
      source_table: 'bn_claim_document',
      source_column: 'doc_type',
      requires_claim_context: true,
      allowed_operators: ['BOOLEAN','EXISTS'],
    },
  },
  {
    id: 'DOCUMENT_STATUS',
    label: 'Document status',
    description: 'Reads the status of an expected document type on the claim.',
    defaults: {
      source_type: 'DOCUMENT_CHECK',
      data_type: 'string',
      source_table: 'bn_claim_document',
      source_column: 'status',
      requires_claim_context: true,
      allowed_operators: ['EQUALS','NOT_EQUALS','IN','NOT_IN'],
    },
  },
  {
    id: 'EMPLOYER_STATUS',
    label: 'Employer status',
    description: 'Reads employer registration status from er_master.',
    defaults: {
      source_type: 'DIRECT_FIELD',
      data_type: 'string',
      source_table: 'er_master',
      source_column: 'status',
      allowed_operators: ['EQUALS','NOT_EQUALS','IN','NOT_IN'],
    },
  },
  {
    id: 'EXISTENCE_CHECK',
    label: 'Existence check',
    description: 'Asserts a row exists in a registered table for the SSN / claim.',
    defaults: {
      source_type: 'EXISTENCE_CHECK',
      data_type: 'boolean',
      allowed_operators: ['EXISTS','BOOLEAN'],
    },
  },
  {
    id: 'DECEASED_CONTRIBUTION_SNAPSHOT',
    label: 'Deceased contributor snapshot',
    description: 'Reads contribution windows from the deceased contributor (Survivor / Funeral benefits).',
    defaults: {
      source_type: 'DERIVED_AGGREGATE',
      data_type: 'number',
      window_type: 'WEEKS',
      window_size: 156,
      window_anchor: 'death_date',
      output_json_key: 'deceased_window_156',
      requires_snapshot: true,
      requires_deceased_ssn: true,
      allowed_operators: ['GREATER_OR_EQUAL','BETWEEN'],
      ...WEEKS_BASE,
    },
  },
  {
    id: 'RESOLVER_ONLY',
    label: 'Custom resolver only',
    description: 'No physical table — value comes entirely from a developer-registered resolver.',
    defaults: {
      source_type: 'RESOLVER_ONLY',
      data_type: 'string',
      allowed_operators: ['EQUALS','NOT_EQUALS','EXISTS'],
    },
  },
];

export function getFactTemplate(id: FactTemplateId): FactTemplate | undefined {
  return FACT_TEMPLATES.find(t => t.id === id);
}

/** Apply template defaults to current input (does not overwrite fact_key/label). */
export function applyFactTemplate(current: EligibilityFactInput, id: FactTemplateId): EligibilityFactInput {
  const tpl = getFactTemplate(id);
  if (!tpl) return current;
  return { ...current, ...tpl.defaults };
}
