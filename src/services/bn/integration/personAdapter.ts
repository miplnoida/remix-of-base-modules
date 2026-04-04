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
      .select('address_1, address_2, city, parish, country_code')
      .eq('ssn', ssn.trim())
      .maybeSingle();
    if (error) throw error;
    if (!data?.address_1) return null;
    return {
      line1: data.address_1,
      line2: data.address_2,
      city: data.city,
      parish: data.parish,
      country: data.country_code || 'KN',
    };
  },

  async getDependants(ssn: string): Promise<Dependant[]> {
    const { data, error } = await db
      .from('ip_dependants')
      .select('ssn, first_name, surname, relationship, date_of_birth, gender')
      .eq('parent_ssn', ssn.trim());
    if (error) throw error;
    return (data ?? []).map((d: any) => ({
      ssn: d.ssn,
      fullName: `${d.first_name || ''} ${d.surname || ''}`.trim(),
      relationship: d.relationship,
      dateOfBirth: d.date_of_birth,
      gender: d.gender || 'N',
    }));
  },
};

function mapPersonStatus(raw: string | null): PersonSummary['status'] {
  if (!raw) return 'pending';
  const s = raw.trim().toLowerCase();
  if (s === 'deceased' || s === 'dead') return 'deceased';
  if (s === 'suspended' || s === 'blocked') return 'suspended';
  if (s === 'active' || s === 'verified') return 'active';
  return 'pending';
}
