/**
 * Centralized Risk Configuration Hook
 * Wraps the pure riskEngine functions with live DB configuration.
 * Single source of truth for risk ratings across the entire Audit module.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuditFields } from '@/hooks/useAuditTrail';
import {
  calculateScore as engineCalculateScore,
  getRiskRating as engineGetRiskRating,
  calculateFunctionRiskScore as engineCalcFuncScore,
  calculateDeptRisk as engineCalcDeptRisk,
  textToScore,
  buildColorMap,
  DEFAULT_BANDS,
  type RiskBandConfig,
  type RiskEngineConfig,
} from '@/lib/audit/riskEngine';

// Re-export engine utilities so consumers can import from one place
export {
  calculateScore as pureCalculateScore,
  getRiskRating as pureGetRiskRating,
  calculateRiskLevel,
  getRiskColor,
  getRiskLevelVariant,
  buildColorMap,
  textToScore,
  classifyCompositeScore,
  DEFAULT_BANDS,
  DEFAULT_CONFIG,
} from '@/lib/audit/riskEngine';
export type { RiskBandConfig, RiskEngineConfig, RiskRating, DeptRiskResult } from '@/lib/audit/riskEngine';

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
 * Returns functions backed by live DB configuration for risk scoring.
 * All modules MUST use this hook (or the pure engine for non-React contexts).
 */
export function useRiskRatingCalculator() {
  const { data: bandsRaw = [] } = useQuery({
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

  // Convert DB bands to engine format
  const bands: RiskBandConfig[] = bandsRaw.length > 0
    ? bandsRaw.map(b => ({ label: b.label, min_score: b.min_score, max_score: b.max_score, color: b.color, sort_order: b.sort_order }))
    : DEFAULT_BANDS;

  const formulaType = configMaster?.formula_type || 'likelihood_x_impact';
  const deptRiskMethod = configMaster?.dept_risk_method || 'maximum';

  const engineConfig: RiskEngineConfig = {
    formulaType,
    deptRiskMethod,
    scaleMin: configMaster?.scale_min || 1,
    scaleMax: configMaster?.scale_max || 5,
    bands,
  };

  // Delegate everything to the pure engine
  const getRiskRating = (score: number) => engineGetRiskRating(score, bands);
  const calculateScore = (likelihood: number, impact: number) => engineCalculateScore(likelihood, impact, formulaType);
  const getDeptRiskMethod = () => deptRiskMethod;
  const colorMap = buildColorMap(bands);

  const calculateDeptRisk = (
    functions: Array<{ likelihood?: string; impact?: string; weight_percentage?: number }>
  ) => engineCalcDeptRisk(functions, engineConfig);

  const calculateFunctionRiskScore = (likelihood: string, impact: string) =>
    engineCalcFuncScore(likelihood, impact, formulaType);

  const likelihoodImpactTextToScore = textToScore;

  return {
    getRiskRating, calculateScore, getDeptRiskMethod, bands, configMaster,
    likelihoodImpactTextToScore, calculateDeptRisk, calculateFunctionRiskScore,
    colorMap, engineConfig,
  };
}

// ============= Manual Batch Recalculation =============
/**
 * Trigger server-side batch recalculation of all risks.
 * Useful when an admin changes risk config via the settings UI.
 */
export function useRiskBatchRecalculation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { userCode } = useAuditFields();

  const recalculate = useMutation({
    mutationKey: ['ia_risk_recalculate_all'],
    mutationFn: async (reason: string = 'manual_recalculation') => {
      const { data, error } = await supabase.rpc('ia_recalculate_all_risks' as any, {
        p_reason: reason,
        p_triggered_by: userCode || 'SYSTEM',
      });
      if (error) throw error;
      return data as number;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['ia_risk_register'] });
      queryClient.invalidateQueries({ queryKey: ['ia_resolve_engagement_risk'] });
      toast({
        title: 'Risk Recalculation Complete',
        description: `${count} risk(s) updated based on current configuration.`,
      });
    },
    onError: (e: any) => toast({ title: 'Recalculation Failed', description: e.message, variant: 'destructive' }),
  });

  return recalculate;
}
