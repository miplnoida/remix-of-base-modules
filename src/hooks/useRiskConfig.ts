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

  /**
   * Maps text-based likelihood/impact labels ("Low", "Medium", "High") to numeric scores.
   * Falls back to a sensible default if bands aren't loaded yet.
   */
  const likelihoodImpactTextToScore = (label: string): number => {
    const defaults: Record<string, number> = { 'Very Low': 1, Low: 2, Medium: 3, High: 4, 'Very High': 5 };
    return defaults[label] ?? 3;
  };

  /**
   * Calculates department-level risk from an array of functions,
   * using the configured dept_risk_method.
   */
  const calculateDeptRisk = (
    functions: Array<{ likelihood?: string; impact?: string; weight_percentage?: number }>
  ): { score: number; label: string; color: string; method: string } => {
    const method = getDeptRiskMethod();
    if (!functions.length) return { score: 0, label: 'N/A', color: '#6b7280', method };

    const scores = functions.map(fn => {
      const l = likelihoodImpactTextToScore(fn.likelihood || 'Medium');
      const i = likelihoodImpactTextToScore(fn.impact || 'Medium');
      return calculateScore(l, i);
    });

    let deptScore = 0;
    switch (method) {
      case 'maximum':
        deptScore = Math.max(...scores);
        break;
      case 'average':
        deptScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        break;
      case 'weighted': {
        deptScore = functions.reduce((sum, fn, idx) => {
          const weight = Number(fn.weight_percentage) || 0;
          return sum + scores[idx] * (weight / 100);
        }, 0);
        deptScore = Math.round(deptScore * 100) / 100;
        break;
      }
      default:
        deptScore = Math.max(...scores);
    }

    const rating = getRiskRating(deptScore);
    return { score: deptScore, ...rating, method };
  };

  /**
   * Calculates a single function's risk score from text-based likelihood/impact.
   */
  const calculateFunctionRiskScore = (likelihood: string, impact: string): number => {
    const l = likelihoodImpactTextToScore(likelihood || 'Medium');
    const i = likelihoodImpactTextToScore(impact || 'Medium');
    return calculateScore(l, i);
  };

  return {
    getRiskRating, calculateScore, getDeptRiskMethod, bands, configMaster,
    likelihoodImpactTextToScore, calculateDeptRisk, calculateFunctionRiskScore,
  };
}
