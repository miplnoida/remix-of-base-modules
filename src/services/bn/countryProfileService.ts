/**
 * countryProfileService — read/update for the bn_country main-record fields
 * the Country Pack dashboard exposes (formats, office contacts, letterhead).
 * Used by CountryProfileEditor.
 */
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

export interface CountryProfileFields {
  country_code: string;
  country_name?: string;
  currency_code?: string;
  currency_symbol?: string | null;
  locale?: string;
  timezone?: string;
  default_language?: string | null;
  date_format?: string | null;
  number_format?: string | null;
  phone_format?: string | null;
  office_name?: string | null;
  office_address?: string | null;
  office_phone?: string | null;
  office_email?: string | null;
  office_website?: string | null;
  letterhead_logo_url?: string | null;
}

export async function getCountryProfile(countryCode: string): Promise<CountryProfileFields | null> {
  const { data, error } = await db
    .from('bn_country')
    .select(
      'country_code,country_name,currency_code,currency_symbol,locale,timezone,default_language,date_format,number_format,phone_format,office_name,office_address,office_phone,office_email,office_website,letterhead_logo_url',
    )
    .eq('country_code', countryCode)
    .maybeSingle();
  if (error) throw error;
  return data as CountryProfileFields | null;
}

export async function updateCountryProfile(p: CountryProfileFields, userCode?: string) {
  const payload: any = { ...p, modified_by: userCode ?? null };
  delete payload.country_code; // not updated
  const { error } = await db.from('bn_country').update(payload).eq('country_code', p.country_code);
  if (error) throw error;
}
