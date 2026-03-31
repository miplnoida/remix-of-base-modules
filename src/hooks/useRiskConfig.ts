/**
 * Centralized Risk Configuration Hook
 * Single source of truth for risk ratings across the entire Audit module.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// ============= Types =============
export interface RiskConfigMaster {
  id: string;
  config_name: string;
  description: string | null;
  formula_type: string;
  formula_display: string;
  dept_risk_method: string;
  scale_min: number;
  scale_max: number;
  is_active: boolean;
  version: number;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
}

export interface RiskBand {
  id: string;
  label: string;
  min_score: number;
  max_score: number;
  color: string;
  sort_order: number;
  is_active: boolean;
}

export interface RiskParameter {
  id: string;
  label: string;
  score: number;
  description: string;
  sort_order: number;
  is_active: boolean;
}

// ============= Config Master =============
export function useRiskConfigMaster() {
  return useQuery({
    queryKey: ['ia_risk_config_master'],
    queryFn: async (): Promise<RiskConfigMaster | null> => {
      const { data, error } = await supabase
        .from('ia_risk_config_master' as any)
        .select('*')
        .eq('is_active', true)
        .order('version', { ascending: false })
        .limit(1)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data as any;
    },
  });
}

export function useRiskConfigMasterMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const update = useMutation({
    mutationKey: ['InternalAudit', 'ia_risk_config_master', 'update'],
    mutationFn: async ({ id, ...u }: { id: string; [k: string]: any }) => {
      const { data, error } = await supabase
        .from('ia_risk_config_master' as any)
        .update({ ...u, updated_at: new Date().toISOString() } as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ia_risk_config_master'] });
      toast({ title: 'Risk Configuration Updated', description: 'Changes saved successfully' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { update };
}

// ============= Centralized Risk Rating Calculator =============
/**
 * Returns the risk rating label and color for a given score
 * based on the configured classification thresholds.
 */
export function useRiskRatingCalculator() {
  const { data: bands = [] } = useQuery({
    queryKey: ['ia_risk_classification_thresholds'],
    queryFn: async (): Promise<RiskBand[]> => {
      const { data, error } = await supabase
        .from('ia_risk_classification_thresholds' as any)
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });

  const { data: configMaster } = useRiskConfigMaster();

  const getRiskRating = (score: number): { label: string; color: string } => {
    for (const band of bands) {
      if (score >= band.min_score && score <= band.max_score) {
        return { label: band.label, color: band.color };
      }
    }
    return { label: 'Unknown', color: '#6b7280' };
  };

  const calculateScore = (likelihood: number, impact: number): number => {
    const formula = configMaster?.formula_type || 'likelihood_x_impact';
    switch (formula) {
      case 'likelihood_x_impact':
        return likelihood * impact;
      case 'likelihood_plus_impact':
        return likelihood + impact;
      case 'weighted_average':
        return Math.round((likelihood + impact) / 2);
      default:
        return likelihood * impact;
    }
  };

  const getDeptRiskMethod = () => configMaster?.dept_risk_method || 'maximum';

  return { getRiskRating, calculateScore, getDeptRiskMethod, bands, configMaster };
}
