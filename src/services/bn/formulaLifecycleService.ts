/**
 * Formula Lifecycle Service
 *
 * Thin wrapper over the `bn_formula_*` RPCs that enforce safe transitions
 * (DRAFT → IN_REVIEW → ACTIVE → RETIRED), single-active rule, safe-delete,
 * cloning and new-version creation. Every action is awaited and stamps
 * the supplied user_code.
 */
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

export type FormulaStatus = 'DRAFT' | 'IN_REVIEW' | 'ACTIVE' | 'RETIRED';

export interface FormulaUsage {
  binding_count: number;
  active_version_count: number;
  total_versions: number;
}

export async function getFormulaUsage(templateId: string): Promise<FormulaUsage> {
  const { data, error } = await db.rpc('bn_formula_check_usage', { _template_id: templateId });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return {
    binding_count: Number(row?.binding_count ?? 0),
    active_version_count: Number(row?.active_version_count ?? 0),
    total_versions: Number(row?.total_versions ?? 0),
  };
}

export async function cloneFormula(opts: {
  templateId: string; newCode: string; newName: string; userCode: string;
}): Promise<string> {
  const { data, error } = await db.rpc('bn_formula_clone_template', {
    _template_id: opts.templateId,
    _new_code: opts.newCode,
    _new_name: opts.newName,
    _user_code: opts.userCode,
  });
  if (error) throw error;
  return data as string;
}

export async function createNewVersion(templateId: string, userCode: string): Promise<string> {
  const { data, error } = await db.rpc('bn_formula_new_version', {
    _template_id: templateId,
    _user_code: userCode,
  });
  if (error) throw error;
  return data as string;
}

export async function transitionVersion(opts: {
  versionId: string; newStatus: FormulaStatus; userCode: string;
}): Promise<void> {
  const { error } = await db.rpc('bn_formula_transition_version', {
    _version_id: opts.versionId,
    _new_status: opts.newStatus,
    _user_code: opts.userCode,
  });
  if (error) throw error;
}

export async function safeDeleteFormula(templateId: string, userCode: string): Promise<void> {
  const { error } = await db.rpc('bn_formula_safe_delete_template', {
    _template_id: templateId,
    _user_code: userCode,
  });
  if (error) throw error;
}

export async function listVersions(templateId: string) {
  const { data, error } = await db
    .from('bn_formula_version')
    .select('id, version_no, governance_status, is_active, expression, effective_from, effective_to, entered_by, entered_at, modified_by, updated_at, notes')
    .eq('formula_template_id', templateId)
    .order('version_no', { ascending: false });
  if (error) throw error;
  return data ?? [];
}
