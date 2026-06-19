/**
 * Country Payment Cycle × Method service.
 * Manages the bn_country_payment_cycle_method junction table — restricts which
 * country-enabled methods are usable for a specific payment cycle.
 *
 * Rules enforced by DB trigger:
 *  - cycle row must reference an existing bn_country_payment_config row
 *  - cycle row can only be is_enabled=true if the country row is enabled
 */
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

export type PaymentCycle =
  | 'ONE_OFF' | 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'AD_HOC';

export const PAYMENT_CYCLES: PaymentCycle[] = [
  'ONE_OFF', 'WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL', 'AD_HOC',
];

export interface CycleMethodRow {
  id: string;
  country_code: string;
  payment_cycle: PaymentCycle;
  payment_method: string;
  is_enabled: boolean;
  is_default_for_cycle: boolean;
  priority: number;
  effective_from: string | null;
  effective_to: string | null;
  entered_by: string | null;
  entered_at: string;
  modified_by: string | null;
  modified_at: string;
}

export async function listCycleMethods(countryCode: string): Promise<CycleMethodRow[]> {
  const { data, error } = await db
    .from('bn_country_payment_cycle_method')
    .select('*')
    .eq('country_code', countryCode)
    .order('payment_cycle', { ascending: true })
    .order('priority', { ascending: true });
  if (error) throw error;
  return (data ?? []) as CycleMethodRow[];
}

/**
 * Toggle the (country, cycle, method) row. Creates if missing, otherwise flips is_enabled.
 * Returns true if final state is enabled.
 */
export async function toggleCycleMethod(
  countryCode: string,
  cycle: PaymentCycle,
  method: string,
  enabled: boolean,
  performedBy: string,
): Promise<boolean> {
  const { data: existing } = await db
    .from('bn_country_payment_cycle_method')
    .select('id,is_enabled')
    .eq('country_code', countryCode)
    .eq('payment_cycle', cycle)
    .eq('payment_method', method)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await db
      .from('bn_country_payment_cycle_method')
      .update({ is_enabled: enabled, modified_by: performedBy })
      .eq('id', existing.id);
    if (error) throw error;
    return enabled;
  }

  const { error } = await db.from('bn_country_payment_cycle_method').insert({
    country_code: countryCode,
    payment_cycle: cycle,
    payment_method: method,
    is_enabled: enabled,
    is_default_for_cycle: false,
    priority: 100,
    entered_by: performedBy,
    modified_by: performedBy,
  });
  if (error) throw error;
  return enabled;
}

export async function deleteCycleMethod(id: string): Promise<void> {
  const { error } = await db.from('bn_country_payment_cycle_method').delete().eq('id', id);
  if (error) throw error;
}
