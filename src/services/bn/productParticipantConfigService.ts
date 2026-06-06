import { supabase } from '@/integrations/supabase/client';
import type {
  BnProductParticipantConfig,
  BnProductParticipantConfigInput,
} from '@/types/bnParticipant';

const TABLE = 'bn_product_participant_config';

export async function fetchParticipantConfigByVersion(
  productVersionId: string,
): Promise<BnProductParticipantConfig | null> {
  const { data, error } = await (supabase as any)
    .from(TABLE)
    .select('*')
    .eq('product_version_id', productVersionId)
    .maybeSingle();
  if (error) throw error;
  return (data as BnProductParticipantConfig) ?? null;
}

export async function upsertParticipantConfig(
  input: BnProductParticipantConfigInput & { id?: string },
): Promise<BnProductParticipantConfig> {
  const { data, error } = await (supabase as any)
    .from(TABLE)
    .upsert(input, { onConflict: 'product_version_id' })
    .select('*')
    .single();
  if (error) throw error;
  return data as BnProductParticipantConfig;
}
