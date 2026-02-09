import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface LookupItem {
  code: string;
  description: string;
}

export interface InspectorItem {
  code: string;
  insp_name: string;
}

export function useSEPLookups() {
  const [occupations, setOccupations] = useState<LookupItem[]>([]);
  const [industries, setIndustries] = useState<LookupItem[]>([]);
  const [offices, setOffices] = useState<LookupItem[]>([]);
  const [villages, setVillages] = useState<LookupItem[]>([]);
  const [sectors, setSectors] = useState<LookupItem[]>([]);
  const [inspectors, setInspectors] = useState<InspectorItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [occRes, indRes, offRes, vilRes, secRes, insRes] = await Promise.all([
          supabase.from('tb_occup').select('code, short_description').order('code'),
          supabase.from('tb_indus').select('code, short_description').order('code'),
          supabase.from('tb_office').select('code, description').order('code'),
          supabase.from('tb_villages').select('code, description').order('description'),
          supabase.from('tb_sector').select('code, description').order('code'),
          supabase.from('tb_inspector').select('code, insp_name').order('code'),
        ]);

        setOccupations((occRes.data || []).map((r: any) => ({ code: r.code, description: r.short_description })));
        setIndustries((indRes.data || []).map((r: any) => ({ code: r.code, description: r.short_description })));
        setOffices((offRes.data || []).map((r: any) => ({ code: r.code, description: r.description })));
        setVillages((vilRes.data || []).map((r: any) => ({ code: r.code, description: r.description })));
        setSectors((secRes.data || []).map((r: any) => ({ code: r.code, description: r.description })));
        setInspectors((insRes.data || []).map((r: any) => ({ code: r.code, insp_name: r.insp_name })));
      } catch (err) {
        console.error('Failed to load SEP lookups:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return { occupations, industries, offices, villages, sectors, inspectors, loading };
}
