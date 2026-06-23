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

export async function listAudit(sequenceId?: string, limit = 100): Promise<NumberAuditEntry[]> {
  let q = sb.from("core_number_sequence_audit").select("*").order("generated_at", { ascending: false }).limit(limit);
  if (sequenceId) q = q.eq("sequence_id", sequenceId);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export const coreNumberingService = {
  generate: generateNumber,
  preview: previewNextNumber,
  recordOverride,
  listSequences,
  updateSequence,
  listAudit,
};

export default coreNumberingService;
