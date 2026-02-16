import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ExternalApi {
  id: string;
  api_code: string;
  api_name: string;
  api_group: string;
  description: string | null;
  http_method: string;
  endpoint_url: string;
  requires_auth: boolean;
  auth_type: string;
  is_active: boolean;
  version: string;
  created_at: string;
  updated_at: string;
}

export interface ExternalApiRequestField {
  id: string;
  api_id: string;
  field_name: string;
  data_type: string;
  is_required: boolean;
  location: string;
  sample_value: string | null;
  description: string | null;
  display_order: number;
}

export interface ExternalApiResponseField {
  id: string;
  api_id: string;
  field_name: string;
  data_type: string;
  description: string | null;
  sample_value: string | null;
  display_order: number;
}

export interface ExternalApiChangeLog {
  id: string;
  api_id: string;
  version: string;
  change_description: string;
  changed_at: string;
  changed_by: string | null;
}

export function useExternalApis() {
  return useQuery({
    queryKey: ['external-apis'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('external_api_master')
        .select('*')
        .eq('is_active', true)
        .order('api_group')
        .order('api_name');
      if (error) throw error;
      return data as ExternalApi[];
    },
    staleTime: 5 * 60 * 1000, // 5 min cache
    refetchOnWindowFocus: false,
  });
}

export function useExternalApiDetails(apiId: string | null) {
  const requestFields = useQuery({
    queryKey: ['external-api-request-fields', apiId],
    queryFn: async () => {
      if (!apiId) return [];
      const { data, error } = await supabase
        .from('external_api_request_fields')
        .select('*')
        .eq('api_id', apiId)
        .order('display_order');
      if (error) throw error;
      return data as ExternalApiRequestField[];
    },
    enabled: !!apiId,
    staleTime: 5 * 60 * 1000,
  });

  const responseFields = useQuery({
    queryKey: ['external-api-response-fields', apiId],
    queryFn: async () => {
      if (!apiId) return [];
      const { data, error } = await supabase
        .from('external_api_response_fields')
        .select('*')
        .eq('api_id', apiId)
        .order('display_order');
      if (error) throw error;
      return data as ExternalApiResponseField[];
    },
    enabled: !!apiId,
    staleTime: 5 * 60 * 1000,
  });

  const changeLogs = useQuery({
    queryKey: ['external-api-change-logs', apiId],
    queryFn: async () => {
      if (!apiId) return [];
      const { data, error } = await supabase
        .from('external_api_change_log')
        .select('*')
        .eq('api_id', apiId)
        .order('changed_at', { ascending: false });
      if (error) throw error;
      return data as ExternalApiChangeLog[];
    },
    enabled: !!apiId,
    staleTime: 5 * 60 * 1000,
  });

  return { requestFields, responseFields, changeLogs };
}

export function useAllExternalApis() {
  return useQuery({
    queryKey: ['external-apis-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('external_api_master')
        .select('*')
        .order('api_group')
        .order('api_name');
      if (error) throw error;
      return data as ExternalApi[];
    },
  });
}

export function useExternalApiExecutionLogs(apiId?: string) {
  return useQuery({
    queryKey: ['external-api-execution-logs', apiId],
    queryFn: async () => {
      let query = supabase
        .from('external_api_execution_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (apiId) query = query.eq('api_id', apiId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}
