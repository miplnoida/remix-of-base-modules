/**
 * Central Numbering / Code Generation Service
 * -------------------------------------------
 * Every module mints reference numbers through this service. Numbers are
 * issued atomically by the SQL RPC `core_generate_number`, which locks the
 * sequence row and writes an audit entry. Manual overrides are also audited.
 *
 * Supported tokens (resolved server-side):
 *   {MODULE} {ENTITY} {COUNTRY} {YYYY} {YY} {MM} {DD} {SEQ}
 *   {BRANCH} {DEPARTMENT}
 */
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export interface GenerateNumberOptions {
  moduleCode: string;
  entityType: string;
  countryCode?: string;       // default 'SKN'
  branchCode?: string | null;
  departmentCode?: string | null;
  userCode?: string | null;
}

export interface GeneratedNumber {
  sequenceId: string;
  sequenceValue: number;
  generatedNumber: string;
}

export class NumberSequenceMissingError extends Error {
  constructor(public opts: GenerateNumberOptions) {
    super(
      `No active numbering sequence configured for ${opts.moduleCode}/${opts.entityType}/${opts.countryCode ?? "SKN"}.` +
      ` Ask an administrator to set it up under Admin → Numbering Rules.`,
    );
    this.name = "NumberSequenceMissingError";
  }
}

/** Generate (and consume) the next reference number. Transaction-safe. */
export async function generateNumber(opts: GenerateNumberOptions): Promise<GeneratedNumber> {
  const { data, error } = await sb.rpc("core_generate_number", {
    p_module_code:     opts.moduleCode,
    p_entity_type:     opts.entityType,
    p_country_code:    opts.countryCode ?? "SKN",
    p_branch_code:     opts.branchCode ?? null,
    p_department_code: opts.departmentCode ?? null,
    p_user_code:       opts.userCode ?? null,
  });
  if (error) {
    if (String(error.message || "").toLowerCase().includes("no active numbering sequence")) {
      throw new NumberSequenceMissingError(opts);
    }
    throw error;
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.generated_number) throw new NumberSequenceMissingError(opts);
  return {
    sequenceId: row.sequence_id,
    sequenceValue: Number(row.sequence_value),
    generatedNumber: row.generated_number,
  };
}

/** Preview the next number for a sequence without consuming it. */
export async function previewNextNumber(opts: GenerateNumberOptions): Promise<string | null> {
  const { data, error } = await sb.rpc("core_preview_next_number", {
    p_module_code:     opts.moduleCode,
    p_entity_type:     opts.entityType,
    p_country_code:    opts.countryCode ?? "SKN",
    p_branch_code:     opts.branchCode ?? null,
    p_department_code: opts.departmentCode ?? null,
  });
  if (error) throw error;
  return (data as string) ?? null;
}

/** Audit a manually-entered (override) number. Requires override permission upstream. */
export async function recordOverride(opts: {
  moduleCode: string; entityType: string; countryCode?: string;
  manualNumber: string; reason: string; userCode?: string | null;
}): Promise<string> {
  const { data, error } = await sb.rpc("core_record_number_override", {
    p_module_code:     opts.moduleCode,
    p_entity_type:     opts.entityType,
    p_country_code:    opts.countryCode ?? "SKN",
    p_manual_number:   opts.manualNumber,
    p_override_reason: opts.reason,
    p_user_code:       opts.userCode ?? null,
  });
  if (error) throw error;
  return data as string;
}

/* ---------- Admin CRUD helpers (used by Admin → Numbering Rules) ---------- */

export interface CoreNumberSequence {
  id: string;
  module_code: string;
  entity_type: string;
  country_code: string;
  prefix_pattern: string;
  number_pattern: string;
  separator: string;
  padding_length: number;
  current_number: number;
  reset_frequency: "NEVER" | "YEARLY" | "MONTHLY" | "DAILY";
  last_period_key: string | null;
  is_active: boolean;
  description: string | null;
  updated_at: string;
}

export async function listSequences(): Promise<CoreNumberSequence[]> {
  const { data, error } = await sb
    .from("core_number_sequence")
    .select("*")
    .order("module_code", { ascending: true })
    .order("entity_type", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function updateSequence(
  id: string,
  patch: Partial<Pick<CoreNumberSequence, "prefix_pattern" | "number_pattern" | "padding_length" | "separator" | "reset_frequency" | "is_active" | "description">>,
  userCode?: string | null,
): Promise<CoreNumberSequence> {
  const { data, error } = await sb
    .from("core_number_sequence")
    .update({ ...patch, updated_by: userCode ?? null })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export interface NumberAuditEntry {
  id: string;
  sequence_id: string | null;
  module_code: string;
  entity_type: string;
  country_code: string;
  generated_number: string;
  sequence_value: number;
  pattern_used: string;
  is_override: boolean;
  override_reason: string | null;
  generated_by: string | null;
  generated_at: string;
}

export async function listAudit(sequenceId?: string, limit = 200): Promise<NumberAuditEntry[]> {
  let q = sb.from("core_number_sequence_audit").select("*").order("generated_at", { ascending: false }).limit(limit);
  if (sequenceId) q = q.eq("sequence_id", sequenceId);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

/** Latest issued number for a sequence (excluding adjustments). */
export async function lastIssuedNumber(sequenceId: string): Promise<NumberAuditEntry | null> {
  const { data, error } = await sb
    .from("core_number_sequence_audit")
    .select("*")
    .eq("sequence_id", sequenceId)
    .not("generated_number", "ilike", "ADJUST:%")
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as NumberAuditEntry | null) ?? null;
}

export async function createSequence(input: {
  module_code: string;
  entity_type: string;
  country_code: string;
  prefix_pattern: string;
  number_pattern: string;
  separator?: string;
  padding_length?: number;
  reset_frequency?: CoreNumberSequence["reset_frequency"];
  description?: string | null;
  is_active?: boolean;
}, userCode?: string | null): Promise<CoreNumberSequence> {
  const payload = {
    module_code: input.module_code.trim().toUpperCase(),
    entity_type: input.entity_type.trim().toUpperCase(),
    country_code: (input.country_code ?? "SKN").trim().toUpperCase(),
    prefix_pattern: input.prefix_pattern,
    number_pattern: input.number_pattern,
    separator: input.separator ?? "-",
    padding_length: input.padding_length ?? 6,
    reset_frequency: input.reset_frequency ?? "YEARLY",
    description: input.description ?? null,
    is_active: input.is_active ?? true,
    current_number: 0,
    created_by: userCode ?? null,
    updated_by: userCode ?? null,
  };
  const { data, error } = await sb
    .from("core_number_sequence")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function duplicateSequence(id: string, overrides: { entity_type?: string; module_code?: string; country_code?: string } = {}, userCode?: string | null): Promise<CoreNumberSequence> {
  const src = (await listSequences()).find(r => r.id === id);
  if (!src) throw new Error("Source sequence not found");
  return createSequence({
    module_code: overrides.module_code ?? src.module_code,
    entity_type: overrides.entity_type ?? `${src.entity_type}_COPY`,
    country_code: overrides.country_code ?? src.country_code,
    prefix_pattern: src.prefix_pattern,
    number_pattern: src.number_pattern,
    separator: src.separator,
    padding_length: src.padding_length,
    reset_frequency: src.reset_frequency,
    description: src.description,
    is_active: false,
  }, userCode);
}

export async function resetSequence(sequenceId: string, newCurrent: number, reason: string, userCode?: string | null): Promise<CoreNumberSequence> {
  const { data, error } = await sb.rpc("core_reset_number_sequence", {
    p_sequence_id: sequenceId,
    p_new_current: newCurrent,
    p_reason: reason,
    p_user_code: userCode ?? null,
  });
  if (error) throw error;
  return data as CoreNumberSequence;
}

/** Validate a pattern string. Returns array of error messages (empty = OK). */
export function validatePattern(pattern: string): string[] {
  const errors: string[] = [];
  if (!pattern || !pattern.trim()) {
    errors.push("Pattern is required");
    return errors;
  }
  if (!/\{SEQ\}/.test(pattern)) errors.push("Pattern must contain {SEQ}");
  const allowed = ["MODULE","ENTITY","COUNTRY","YYYY","YY","MM","DD","SEQ","BRANCH","DEPARTMENT"];
  const tokens = Array.from(pattern.matchAll(/\{([A-Z_]+)\}/g)).map(m => m[1]);
  for (const t of tokens) {
    if (!allowed.includes(t)) errors.push(`Unknown token {${t}}`);
  }
  return errors;
}

/**
 * Static registry of entity types that the application is wired to consume.
 * Used by the admin "Used By" tab to warn admins about missing sequences.
 */
export interface UsedByEntry {
  module_code: string;
  entity_type: string;
  used_in: string; // human-readable code location
  description: string;
}

export const USED_BY_REGISTRY: UsedByEntry[] = [
  { module_code: "LEGAL", entity_type: "LEGAL_CASE",       used_in: "lgCaseService.generateLgCaseNo",     description: "Legal Case reference number" },
  { module_code: "LEGAL", entity_type: "LEGAL_INTAKE",     used_in: "lgIntakeService.nextIntakeNo",       description: "Legal Intake reference number" },
  { module_code: "LEGAL", entity_type: "LEGAL_NOTICE",     used_in: "lgCaseService.generateLgNoticeNo",   description: "Legal Notice reference number" },
  { module_code: "LEGAL", entity_type: "LEGAL_HEARING",    used_in: "(reserved)",                          description: "Legal Hearing reference number" },
  { module_code: "LEGAL", entity_type: "LEGAL_ORDER",      used_in: "lgOrderService.generateLgOrderNo",   description: "Legal Order / Judgment reference number" },
  { module_code: "LEGAL", entity_type: "LEGAL_SETTLEMENT", used_in: "(reserved)",                          description: "Legal Settlement reference number" },
  { module_code: "LEGAL", entity_type: "LEGAL_FEE_CHARGE", used_in: "(reserved)",                          description: "Legal Fee/Charge reference number" },
  { module_code: "LEGAL", entity_type: "LEGAL_DOCUMENT",   used_in: "coreTemplateService.allocateReference", description: "Legal generated document reference" },
];

export const coreNumberingService = {
  generate: generateNumber,
  preview: previewNextNumber,
  recordOverride,
  listSequences,
  updateSequence,
  createSequence,
  duplicateSequence,
  resetSequence,
  listAudit,
  lastIssuedNumber,
  validatePattern,
  USED_BY_REGISTRY,
};

export default coreNumberingService;
