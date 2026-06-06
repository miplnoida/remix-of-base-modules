/**
 * seedSelfLink — best-effort, idempotent.
 *
 * Per PR-B (answer #1: "yes seed", answer #2: "SSN-only"):
 *   - If the logged-in user has NO verified SELF link and their auth
 *     `user_metadata.ssn` matches a row in ip_master, create a VERIFIED
 *     SELF link in external_user_person_link.
 *   - Matching is strict SSN equality. No email / name fuzzy match.
 *
 * Safe to call on every login; the table has a unique (user_id) per SELF
 * constraint so duplicates are silently ignored.
 */
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

export async function seedSelfLinkIfMissing(userId: string, ssnHint?: string | null): Promise<boolean> {
  if (!userId) return false;
  try {
    const { data: existing } = await db
      .from('external_user_person_link')
      .select('id')
      .eq('user_id', userId)
      .eq('relationship_type', 'SELF')
      .eq('verification_status', 'VERIFIED')
      .maybeSingle();
    if (existing) return false;

    let ssn = (ssnHint ?? '').trim();
    if (!ssn) {
      const { data: session } = await supabase.auth.getSession();
      const meta = (session.session?.user?.user_metadata ?? {}) as Record<string, any>;
      ssn = String(meta.ssn ?? meta.SSN ?? '').trim();
    }
    if (!ssn) return false;

    const { data: ip } = await db
      .from('ip_master')
      .select('ssn')
      .eq('ssn', ssn)
      .maybeSingle();
    if (!ip?.ssn) return false;

    await db.from('external_user_person_link').insert({
      user_id: userId,
      ssn: ip.ssn,
      relationship_type: 'SELF',
      verification_status: 'VERIFIED',
      is_primary: true,
      verified_at: new Date().toISOString(),
      verification_method: 'AUTO_SSN_MATCH',
    });
    await db.from('external_persona_audit').insert({
      user_id: userId,
      event_type: 'SELF_LINK_SEEDED',
      payload: { ssn: ip.ssn, method: 'AUTO_SSN_MATCH' },
    });
    return true;
  } catch {
    return false;
  }
}
