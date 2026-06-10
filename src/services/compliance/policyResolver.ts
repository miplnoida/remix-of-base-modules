/**
 * policyResolver — single source-of-truth for compliance parameter values.
 *
 * Resolves a rule variable (e.g. grace_period, levy_penalty_initial_rate) to its
 * live value by following ce_rule_variable_mappings → c3_calculation_config.
 *
 * SNAPSHOT CONTRACT
 * -----------------
 * Use `resolveCurrent()` ONLY at:
 *   - rule/violation CREATION time
 *   - explicit user click of "Reload defaults"
 *
 * NEVER re-resolve on edit/reopen. Saved records carry their own frozen
 * snapshot (ce_detection_rules.parameters._snapshot,
 * ce_violations.parameters_snapshot). Loading must read the snapshot as-is so
 * historical records stay immutable when Finance later changes a rate.
 */
import { supabase } from '@/integrations/supabase/client';

export interface ResolvedVariable {
  variable_key: string;
  display_name: string;
  value: number | null;
  source_table: string | null;
  source_key: string | null;
  resolved_at: string;
  /** True when the mapping points at a c3_calculation_config key that does not (yet) exist. */
  unresolved: boolean;
}

export interface PolicyParameterSnapshot {
  resolved_at: string;
  source: 'c3_calculation_config';
  values: Record<string, { value: number | null; source_key: string | null; display_name: string }>;
}

/** Resolve a single variable_key to its current live value. */
export async function resolveCurrent(variableKey: string): Promise<ResolvedVariable | null> {
  const { data: mapping, error: mErr } = await supabase
    .from('ce_rule_variable_mappings')
    .select('variable_key, display_name, source_table, c3_config_key')
    .eq('variable_key', variableKey)
    .maybeSingle();
  if (mErr || !mapping) return null;

  if (!mapping.c3_config_key) {
    return {
      variable_key: variableKey,
      display_name: (mapping as any).display_name,
      value: null,
      source_table: (mapping as any).source_table,
      source_key: null,
      resolved_at: new Date().toISOString(),
      unresolved: true,
    };
  }

  const { data: cfg } = await supabase
    .from('c3_calculation_config')
    .select('config_value')
    .eq('config_key', mapping.c3_config_key)
    .eq('is_active', true)
    .maybeSingle();

  return {
    variable_key: variableKey,
    display_name: (mapping as any).display_name,
    value: cfg ? Number(cfg.config_value) : null,
    source_table: (mapping as any).source_table,
    source_key: mapping.c3_config_key,
    resolved_at: new Date().toISOString(),
    unresolved: !cfg,
  };
}

/** Resolve multiple variable_keys in a single pair of round-trips. */
export async function resolveMany(variableKeys: string[]): Promise<ResolvedVariable[]> {
  if (variableKeys.length === 0) return [];

  const { data: mappings } = await supabase
    .from('ce_rule_variable_mappings')
    .select('variable_key, display_name, source_table, c3_config_key')
    .in('variable_key', variableKeys);

  const configKeys = (mappings ?? [])
    .map(m => (m as any).c3_config_key)
    .filter(Boolean) as string[];

  const { data: configs } = configKeys.length
    ? await supabase
        .from('c3_calculation_config')
        .select('config_key, config_value')
        .in('config_key', configKeys)
        .eq('is_active', true)
    : { data: [] as any[] };

  const cfgMap = new Map((configs ?? []).map(c => [c.config_key, Number(c.config_value)]));
  const now = new Date().toISOString();

  return variableKeys.map(vk => {
    const m: any = (mappings ?? []).find((mm: any) => mm.variable_key === vk);
    if (!m) {
      return { variable_key: vk, display_name: vk, value: null, source_table: null, source_key: null, resolved_at: now, unresolved: true };
    }
    const liveVal = m.c3_config_key ? cfgMap.get(m.c3_config_key) : undefined;
    return {
      variable_key: vk,
      display_name: m.display_name,
      value: liveVal ?? null,
      source_table: m.source_table,
      source_key: m.c3_config_key,
      resolved_at: now,
      unresolved: !m.c3_config_key || liveVal === undefined,
    };
  });
}

/** Build a frozen snapshot block to persist alongside a rule or violation. */
export function buildSnapshot(resolved: ResolvedVariable[]): PolicyParameterSnapshot {
  const values: PolicyParameterSnapshot['values'] = {};
  for (const r of resolved) {
    values[r.variable_key] = {
      value: r.value,
      source_key: r.source_key,
      display_name: r.display_name,
    };
  }
  return {
    resolved_at: new Date().toISOString(),
    source: 'c3_calculation_config',
    values,
  };
}
