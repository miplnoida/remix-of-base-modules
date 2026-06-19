/**
 * Governance Classification Registry — Phase 2.
 * Reads `bn_config_entity_registry` and exposes per-entity governance class.
 */
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

export type GovernanceClass = 'SYSTEM' | 'CONFIGURATION' | 'REGULATORY' | 'FINANCIAL';

export interface ConfigEntityMeta {
  entity_type: string;
  governance_class: GovernanceClass;
  lifecycle_required: boolean;
  effective_dating_required: boolean;
  approval_policy_code: string | null;
  notes: string | null;
}

let cache: Map<string, ConfigEntityMeta> | null = null;

export async function loadRegistry(): Promise<Map<string, ConfigEntityMeta>> {
  if (cache) return cache;
  const { data, error } = await db
    .from('bn_config_entity_registry')
    .select('entity_type, governance_class, lifecycle_required, effective_dating_required, approval_policy_code, notes');
  if (error) throw error;
  const m = new Map<string, ConfigEntityMeta>();
  for (const r of data ?? []) m.set(r.entity_type, r as ConfigEntityMeta);
  cache = m;
  return m;
}

export async function getClass(entityType: string): Promise<GovernanceClass | null> {
  const r = await loadRegistry();
  return r.get(entityType)?.governance_class ?? null;
}

export async function requiresApproval(entityType: string): Promise<boolean> {
  const cls = await getClass(entityType);
  return cls === 'CONFIGURATION' || cls === 'REGULATORY' || cls === 'FINANCIAL';
}

export async function getMeta(entityType: string): Promise<ConfigEntityMeta | null> {
  const r = await loadRegistry();
  return r.get(entityType) ?? null;
}

export function clearRegistryCache() { cache = null; }
