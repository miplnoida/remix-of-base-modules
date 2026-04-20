/**
 * Recipient resolution: priority order
 *   1. visit_contact  (ce_inspection_employer_interactions)
 *   2. compliance_contact (placeholder — falls back to er_master if not found)
 *   3. er_master.email / er_master.mobile / er_master.phone
 * All resolved recipients are returned with their `source` for snapshotting.
 */
import { supabase } from '@/integrations/supabase/client';
import type { CeCommRecipientSource } from '@/types/auditCommunication';

export interface ResolvedRecipient {
  name?: string;
  email?: string;
  mobile?: string;
  role?: string;
  source: CeCommRecipientSource;
  is_primary: boolean;
}

interface ResolveOpts {
  inspectionId?: string | null;
  employerId: string;
  prioritySources?: CeCommRecipientSource[];
}

export const auditCommunicationRecipientService = {
  async resolve(opts: ResolveOpts): Promise<ResolvedRecipient[]> {
    const order = opts.prioritySources ?? ['visit_contact', 'compliance_contact', 'er_master'];
    const out: ResolvedRecipient[] = [];

    for (const src of order) {
      if (src === 'visit_contact' && opts.inspectionId) {
        const { data } = await (supabase as any)
          .from('ce_inspection_employer_interactions')
          .select('representative_name, representative_designation, representative_email, representative_phone')
          .eq('inspection_id', opts.inspectionId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        const email = (data as any)?.representative_email || null;
        const phone = (data as any)?.representative_phone || null;
        if (email || phone) {
          out.push({
            name: (data as any)?.representative_name,
            role: (data as any)?.representative_designation,
            email: email ?? undefined,
            mobile: phone ?? undefined,
            source: 'visit_contact',
            is_primary: out.length === 0,
          });
          // If we got a visit contact, we usually don't also need er_master
          // — but caller can still request er_master via priority list.
          if (out.length >= 1) continue;
        }
      }

      if (src === 'er_master') {
        const { data } = await (supabase as any)
          .from('er_master')
          .select('name, email, mobile, phone')
          .eq('regno', opts.employerId)
          .maybeSingle();
        if (data) {
          const email = (data as any).email || null;
          const mobile = (data as any).mobile || (data as any).phone || null;
          if (email || mobile) {
            out.push({
              name: (data as any).name,
              email: email ?? undefined,
              mobile: mobile ?? undefined,
              source: 'er_master',
              is_primary: out.length === 0,
            });
          }
        }
      }
      // 'compliance_contact' source: hook-point for future ce_employer_compliance_contact table.
    }

    return out;
  },
};
