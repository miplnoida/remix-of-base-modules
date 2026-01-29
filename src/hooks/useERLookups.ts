import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Types for lookup data
export interface LookupItem {
  code: string;
  label: string;
}

// Fetch office codes from tb_office
const fetchOfficeCodes = async (): Promise<LookupItem[]> => {
  const { data, error } = await supabase
    .from('tb_office')
    .select('code, description')
    .order('code');
  
  if (error) throw error;
  
  return (data || []).map(item => ({
    code: item.code?.trim() || '',
    label: `${item.code?.trim() || ''} - ${item.description?.trim() || ''}`
  }));
};

// Fetch ownership/legal status codes from tb_legal_status
const fetchOwnershipCodes = async (): Promise<LookupItem[]> => {
  const { data, error } = await supabase
    .from('tb_legal_status')
    .select('code, description')
    .order('code');
  
  if (error) throw error;
  
  return (data || []).map(item => ({
    code: item.code?.trim() || '',
    label: `${item.code?.trim() || ''} - ${item.description?.trim() || ''}`
  }));
};

// Fetch sector codes from tb_sector
const fetchSectorCodes = async (): Promise<LookupItem[]> => {
  const { data, error } = await supabase
    .from('tb_sector')
    .select('code, description')
    .order('code');
  
  if (error) throw error;
  
  return (data || []).map(item => ({
    code: item.code?.trim() || '',
    label: `${item.code?.trim() || ''} - ${item.description?.trim() || ''}`
  }));
};

// Fetch industrial codes from tb_indus
const fetchIndustrialCodes = async (): Promise<LookupItem[]> => {
  const { data, error } = await supabase
    .from('tb_indus')
    .select('code, short_description')
    .order('code');
  
  if (error) throw error;
  
  return (data || []).map(item => ({
    code: item.code?.trim() || '',
    label: `${item.code?.trim() || ''} - ${item.short_description?.trim() || ''}`
  }));
};

// Fetch village codes from tb_villages
const fetchVillageCodes = async (): Promise<LookupItem[]> => {
  const { data, error } = await supabase
    .from('tb_villages')
    .select('code, description')
    .order('code');
  
  if (error) throw error;
  
  return (data || []).map(item => ({
    code: item.code?.trim() || '',
    label: `${item.code?.trim() || ''} - ${item.description?.trim() || ''}`
  }));
};

// Fetch activity types from tb_activity
const fetchActivityTypes = async (): Promise<LookupItem[]> => {
  const { data, error } = await supabase
    .from('tb_activity')
    .select('code, short_description')
    .order('code');
  
  if (error) throw error;
  
  return (data || []).map(item => ({
    code: item.code?.trim() || '',
    label: `${item.code?.trim() || ''} - ${item.short_description?.trim() || ''}`
  }));
};

// Fetch inspector codes from tb_inspector
const fetchInspectorCodes = async (): Promise<LookupItem[]> => {
  const { data, error } = await supabase
    .from('tb_inspector')
    .select('code, insp_name')
    .order('code');
  
  if (error) throw error;
  
  return (data || []).map(item => ({
    code: item.code?.trim() || '',
    label: `${item.code?.trim() || ''} - ${item.insp_name?.trim() || ''}`
  }));
};

// Combined hook to fetch all ER lookups
export function useERLookups() {
  const officeCodes = useQuery({
    queryKey: ['er-lookup', 'office'],
    queryFn: fetchOfficeCodes,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const ownershipCodes = useQuery({
    queryKey: ['er-lookup', 'ownership'],
    queryFn: fetchOwnershipCodes,
    staleTime: 5 * 60 * 1000,
  });

  const sectorCodes = useQuery({
    queryKey: ['er-lookup', 'sector'],
    queryFn: fetchSectorCodes,
    staleTime: 5 * 60 * 1000,
  });

  const industrialCodes = useQuery({
    queryKey: ['er-lookup', 'industrial'],
    queryFn: fetchIndustrialCodes,
    staleTime: 5 * 60 * 1000,
  });

  const villageCodes = useQuery({
    queryKey: ['er-lookup', 'village'],
    queryFn: fetchVillageCodes,
    staleTime: 5 * 60 * 1000,
  });

  const activityTypes = useQuery({
    queryKey: ['er-lookup', 'activity'],
    queryFn: fetchActivityTypes,
    staleTime: 5 * 60 * 1000,
  });

  const inspectorCodes = useQuery({
    queryKey: ['er-lookup', 'inspector'],
    queryFn: fetchInspectorCodes,
    staleTime: 5 * 60 * 1000,
  });

  return {
    officeCodes: officeCodes.data || [],
    ownershipCodes: ownershipCodes.data || [],
    sectorCodes: sectorCodes.data || [],
    industrialCodes: industrialCodes.data || [],
    villageCodes: villageCodes.data || [],
    activityTypes: activityTypes.data || [],
    inspectorCodes: inspectorCodes.data || [],
    isLoading: 
      officeCodes.isLoading || 
      ownershipCodes.isLoading || 
      sectorCodes.isLoading || 
      industrialCodes.isLoading || 
      villageCodes.isLoading || 
      activityTypes.isLoading || 
      inspectorCodes.isLoading,
  };
}
