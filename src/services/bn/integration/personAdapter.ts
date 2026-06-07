/**
 * BN Person Adapter — Reads from ip_master for claimant identity
 * 
 * This adapter isolates the BN module from direct ip_master access.
 * When the platform migrates to ASP.NET APIs, only this file changes.
 */
import { supabase } from '@/integrations/supabase/client';
import type { IBnPersonAdapter, PersonSummary, AddressRecord, Dependant } from './contracts';

const db = supabase as any;

export const bnPersonAdapter: IBnPersonAdapter = {
  async lookupPerson(ssn: string): Promise<PersonSummary | null> {
    const { data, error } = await db
      .from('ip_master')
      .select('ssn, firstname, surname, dob, sex, status, email_addr, phone, resident_addr1, resident_addr2, district, place_of_residence')
      .eq('ssn', ssn.trim())
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      ssn: data.ssn,
      fullName: `${data.firstname || ''} ${data.surname || ''}`.trim(),
      dateOfBirth: data.dob,
      gender: data.sex || 'N',
      status: mapPersonStatus(data.status),
      email: data.email_addr,
      phone: data.phone,
      address: data.resident_addr1 ? {
        line1: data.resident_addr1,
        line2: data.resident_addr2,
        city: data.district,
        parish: data.district,
        country: data.place_of_residence || 'KN',
      } : undefined,
    };
  },

  async getPersonDOB(ssn: string): Promise<string | null> {
    const { data, error } = await db
      .from('ip_master')
      .select('dob')
      .eq('ssn', ssn.trim())
      .maybeSingle();
    if (error) throw error;
    return data?.dob ?? null;
  },

  async getPersonStatus(ssn: string): Promise<string> {
    const { data, error } = await db
      .from('ip_master')
      .select('status')
      .eq('ssn', ssn.trim())
      .maybeSingle();
    if (error) throw error;
    return mapPersonStatus(data?.status);
  },

  async getPersonAddress(ssn: string): Promise<AddressRecord | null> {
    const { data, error } = await db
      .from('ip_master')
      .select('resident_addr1, resident_addr2, district, place_of_residence')
      .eq('ssn', ssn.trim())
      .maybeSingle();
    if (error) throw error;
    if (!data?.resident_addr1) return null;
    return {
      line1: data.resident_addr1,
      line2: data.resident_addr2,
      city: data.district,
      parish: data.district,
      country: data.place_of_residence || 'KN',
    };
  },

  async getDependants(ssn: string): Promise<Dependant[]> {
    const { data, error } = await db
      .from('ip_dependants')
      .select('dep_ssn, dep_firstname, dep_surname, relationship, dep_dob, dep_sex')
      .eq('ssn', ssn.trim());
    if (error) throw error;
    return (data ?? []).map((d: any) => ({
      ssn: d.dep_ssn,
      fullName: `${d.dep_firstname || ''} ${d.dep_surname || ''}`.trim(),
      relationship: d.relationship,
      dateOfBirth: d.dep_dob,
      gender: d.dep_sex || 'N',
    }));
  },
};

function mapPersonStatus(raw: string | null): PersonSummary['status'] {
  if (!raw) return 'pending';
  const s = raw.trim().toUpperCase();
  // Legacy ip_master single-letter codes: A=Active, V=Verified, D=Deceased, S=Suspended, I=Inactive, P=Pending
  if (['D', 'DEAD', 'DECEASED'].includes(s)) return 'deceased';
  if (['S', 'B', 'SUSPENDED', 'BLOCKED'].includes(s)) return 'suspended';
  if (['A', 'V', 'R', 'ACTIVE', 'VERIFIED', 'REGISTERED'].includes(s)) return 'active';
  return 'pending';
}
