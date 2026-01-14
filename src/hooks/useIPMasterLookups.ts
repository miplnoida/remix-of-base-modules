import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OccupationType {
  code: string;
  short_description: string | null;
  long_description: string | null;
}

export interface CountryType {
  code: string;
  description: string | null;
  nationality: string | null;
  oecs: number | null;
  caricom: number | null;
}

export interface VerifyType {
  code: string;
  description: string | null;
}

export interface DependentRelationType {
  code: string;
  description: string;
}

export interface EyeColorType {
  code: string;
  description: string | null;
}

export interface PostalDistrictType {
  code: string;
  description: string | null;
}

export interface IPStatusType {
  code: string;
  description: string;
}

export const useOccupations = () => {
  return useQuery({
    queryKey: ['tb_occup'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tb_occup')
        .select('*')
        .order('short_description');
      if (error) throw error;
      return data as OccupationType[];
    },
    staleTime: 1000 * 60 * 30, // 30 minutes cache
  });
};

export const useCountries = () => {
  return useQuery({
    queryKey: ['tb_country'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tb_country')
        .select('*')
        .order('description');
      if (error) throw error;
      return data as CountryType[];
    },
    staleTime: 1000 * 60 * 30,
  });
};

export const useVerifyTypes = () => {
  return useQuery({
    queryKey: ['tb_verify'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tb_verify')
        .select('*')
        .order('description');
      if (error) throw error;
      return data as VerifyType[];
    },
    staleTime: 1000 * 60 * 30,
  });
};

export const useDependentRelations = () => {
  return useQuery({
    queryKey: ['tb_dependent_relation'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tb_dependent_relation')
        .select('*')
        .order('description');
      if (error) throw error;
      return data as DependentRelationType[];
    },
    staleTime: 1000 * 60 * 30,
  });
};

export const useEyeColors = () => {
  return useQuery({
    queryKey: ['tb_eye_color'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tb_eye_color')
        .select('*')
        .order('description');
      if (error) throw error;
      return data as EyeColorType[];
    },
    staleTime: 1000 * 60 * 30,
  });
};

export const usePostalDistricts = () => {
  return useQuery({
    queryKey: ['tb_postal_district'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tb_postal_district')
        .select('*')
        .order('description');
      if (error) throw error;
      return data as PostalDistrictType[];
    },
    staleTime: 1000 * 60 * 30,
  });
};

export const useIPStatuses = () => {
  return useQuery({
    queryKey: ['ip_status'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ip_status')
        .select('*')
        .order('code');
      if (error) throw error;
      return data as IPStatusType[];
    },
    staleTime: 1000 * 60 * 30,
  });
};

// Helper function to get status description from code
export const getStatusDescription = (code: string, statuses: IPStatusType[]): string => {
  const status = statuses.find(s => s.code === code);
  return status?.description || code;
};
