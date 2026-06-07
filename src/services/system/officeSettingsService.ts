/**
 * Office settings service — returns issuing-office branding used on letters.
 */
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

export interface OfficeSettings {
  id: string;
  office_code: string;
  office_name: string;
  department_name?: string | null;
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  logo_url?: string | null;
  signature_block?: string | null;
  is_default?: boolean | null;
}

export async function getDefaultOffice(): Promise<OfficeSettings | null> {
  const { data } = await db
    .from('system_office_settings')
    .select('*')
    .eq('is_default', true)
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data || null;
}

export async function getOfficeByCode(code: string): Promise<OfficeSettings | null> {
  const { data } = await db
    .from('system_office_settings').select('*').eq('office_code', code).maybeSingle();
  return data || null;
}

export function officeMergeTokens(o: OfficeSettings | null): Record<string, string> {
  if (!o) return { OFFICE_NAME: '', OFFICE_ADDRESS: '', OFFICE_PHONE: '', OFFICE_EMAIL: '', DEPARTMENT_NAME: '' };
  const addr = [o.address_line_1, o.address_line_2, [o.city, o.state].filter(Boolean).join(', '), o.postal_code, o.country]
    .filter(Boolean).join(', ');
  return {
    OFFICE_NAME: o.office_name || '',
    DEPARTMENT_NAME: o.department_name || '',
    OFFICE_ADDRESS: addr,
    OFFICE_PHONE: o.phone || '',
    OFFICE_EMAIL: o.email || '',
  };
}
