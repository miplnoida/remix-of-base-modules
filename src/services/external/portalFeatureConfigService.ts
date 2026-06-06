import { supabase } from '@/integrations/supabase/client';

export const FEATURE_KEYS = [
  'peopleIMangeEnabled',
  'guardianPayeeEnabled',
  'representativeAccessEnabled',
  'beneficiarySelfServiceEnabled',
  'contributionHistoryEnabled',
  'employmentHistoryEnabled',
  'paymentHistoryEnabled',
  'lifeCertificateEnabled',
  'schoolCertificateEnabled',
  'bankUpdateEnabled',
  'appealsEnabled',
  'eligibilityEstimatorEnabled',
] as const;

export type FeatureKey = typeof FEATURE_KEYS[number];

export type PortalFeatureConfig = Record<FeatureKey, boolean>;

export interface FeatureConfigRow {
  id: string;
  feature_key: FeatureKey;
  feature_name: string;
  description: string | null;
  enabled: boolean;
  affected_personas: string[];
  affected_menus: string[];
  last_updated_by: string | null;
  last_updated_at: string;
}

const DEFAULTS: PortalFeatureConfig = FEATURE_KEYS.reduce((acc, k) => {
  acc[k] = true;
  return acc;
}, {} as PortalFeatureConfig);

export async function getPortalFeatureConfig(): Promise<PortalFeatureConfig> {
  const { data, error } = await supabase
    .from('external_portal_feature_config' as any)
    .select('feature_key, enabled');
  if (error || !data) return { ...DEFAULTS };
  const out: PortalFeatureConfig = { ...DEFAULTS };
  for (const row of data as any[]) {
    if (FEATURE_KEYS.includes(row.feature_key)) {
      out[row.feature_key as FeatureKey] = !!row.enabled;
    }
  }
  return out;
}

export async function listFeatureConfigRows(): Promise<FeatureConfigRow[]> {
  const { data, error } = await supabase
    .from('external_portal_feature_config' as any)
    .select('*')
    .order('feature_name', { ascending: true });
  if (error || !data) return [];
  return data as unknown as FeatureConfigRow[];
}

export async function updateFeatureToggle(
  featureKey: FeatureKey,
  enabled: boolean,
  performedBy: string,
): Promise<void> {
  // read current value first for audit
  const { data: current } = await supabase
    .from('external_portal_feature_config' as any)
    .select('enabled, feature_name')
    .eq('feature_key', featureKey)
    .maybeSingle();
  const oldValue = (current as any)?.enabled ?? null;
  const featureName = (current as any)?.feature_name ?? featureKey;

  const { error } = await supabase
    .from('external_portal_feature_config' as any)
    .update({
      enabled,
      last_updated_by: performedBy,
      last_updated_at: new Date().toISOString(),
    })
    .eq('feature_key', featureKey);
  if (error) throw error;

  // audit (fire-and-forget)
  try {
    await supabase.from('system_audit_trail' as any).insert({
      action: enabled ? 'PORTAL_FEATURE_ENABLED' : 'PORTAL_FEATURE_DISABLED',
      entity_type: 'external_portal_feature_config',
      entity_id: featureKey,
      description: `${featureName}: ${oldValue} → ${enabled}`,
      old_value: { enabled: oldValue },
      new_value: { enabled },
      performed_by: performedBy,
      performed_at: new Date().toISOString(),
    } as any);
  } catch {
    /* non-blocking */
  }
}
