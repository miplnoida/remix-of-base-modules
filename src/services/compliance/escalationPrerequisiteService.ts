// ============================================
// ESCALATION PREREQUISITE SERVICE
// ============================================

import { supabase } from '@/integrations/supabase/client';

export interface EscalationPrerequisite {
  id: string;
  violation_id: string | null;
  case_id: string | null;
  prerequisite_key: string;
  is_satisfied: boolean;
  satisfied_at: string | null;
  satisfied_by: string | null;
  evidence_reference: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch all prerequisites for a violation
 */
export async function getPrerequisites(violationId: string): Promise<EscalationPrerequisite[]> {
  const { data, error } = await supabase
    .from('ce_escalation_prerequisites' as any)
    .select('*')
    .eq('violation_id', violationId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []) as unknown as EscalationPrerequisite[];
}

/**
 * Fetch prerequisites for a case
 */
export async function getCasePrerequisites(caseId: string): Promise<EscalationPrerequisite[]> {
  const { data, error } = await supabase
    .from('ce_escalation_prerequisites' as any)
    .select('*')
    .eq('case_id', caseId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []) as unknown as EscalationPrerequisite[];
}

/**
 * Mark a prerequisite as satisfied
 */
export async function satisfyPrerequisite(
  violationId: string,
  prerequisiteKey: string,
  satisfiedBy: string,
  evidenceReference?: string
): Promise<void> {
  // Upsert: if exists update, otherwise insert
  const { data: existing } = await supabase
    .from('ce_escalation_prerequisites' as any)
    .select('id')
    .eq('violation_id', violationId)
    .eq('prerequisite_key', prerequisiteKey)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('ce_escalation_prerequisites' as any)
      .update({
        is_satisfied: true,
        satisfied_at: new Date().toISOString(),
        satisfied_by: satisfiedBy,
        evidence_reference: evidenceReference || null,
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', (existing as any).id);
  } else {
    await supabase
      .from('ce_escalation_prerequisites' as any)
      .insert({
        violation_id: violationId,
        prerequisite_key: prerequisiteKey,
        is_satisfied: true,
        satisfied_at: new Date().toISOString(),
        satisfied_by: satisfiedBy,
        evidence_reference: evidenceReference || null,
      } as any);
  }
}

/**
 * Revoke a previously satisfied prerequisite
 */
export async function revokePrerequisite(
  violationId: string,
  prerequisiteKey: string
): Promise<void> {
  await supabase
    .from('ce_escalation_prerequisites' as any)
    .update({
      is_satisfied: false,
      satisfied_at: null,
      satisfied_by: null,
      evidence_reference: null,
      updated_at: new Date().toISOString(),
    } as any)
    .eq('violation_id', violationId)
    .eq('prerequisite_key', prerequisiteKey);
}

/**
 * Check if all required prerequisites are met for a violation
 */
export async function checkAllMet(
  violationId: string,
  requiredKeys: string[]
): Promise<{ allMet: boolean; details: Record<string, boolean> }> {
  if (requiredKeys.length === 0) return { allMet: true, details: {} };

  const { data } = await supabase
    .from('ce_escalation_prerequisites' as any)
    .select('prerequisite_key, is_satisfied')
    .eq('violation_id', violationId)
    .in('prerequisite_key', requiredKeys);

  const details: Record<string, boolean> = {};
  for (const key of requiredKeys) {
    const found = (data || []).find((p: any) => p.prerequisite_key === key);
    details[key] = found?.is_satisfied || false;
  }

  return {
    allMet: requiredKeys.every(k => details[k]),
    details,
  };
}

/**
 * Initialize prerequisites for a violation based on escalation rule requirements
 */
export async function initializePrerequisites(
  violationId: string,
  requiredKeys: string[]
): Promise<void> {
  const { data: existing } = await supabase
    .from('ce_escalation_prerequisites' as any)
    .select('prerequisite_key')
    .eq('violation_id', violationId);

  const existingKeys = new Set((existing || []).map((e: any) => e.prerequisite_key));
  const toInsert = requiredKeys
    .filter(k => !existingKeys.has(k))
    .map(k => ({
      violation_id: violationId,
      prerequisite_key: k,
      is_satisfied: false,
    }));

  if (toInsert.length > 0) {
    await supabase.from('ce_escalation_prerequisites' as any).insert(toInsert as any);
  }
}

/**
 * Get escalation log entries for a violation
 */
export async function getEscalationLog(violationId: string) {
  const { data, error } = await supabase
    .from('ce_escalation_log' as any)
    .select('*')
    .eq('violation_id', violationId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}
