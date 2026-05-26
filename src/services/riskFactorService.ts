// ============================================
// RISK FACTOR SERVICE — DB-backed (ce_risk_config)
// ============================================
//
// Replaces the previous in-memory MOCK_RISK_FACTORS array. Factor metadata
// lives in ce_risk_config; domain-only fields (componentScope, employerScope,
// scoring model, threshold/range/formula payloads, checklist links) are
// preserved inside the existing `thresholds` jsonb column — additive only,
// no schema changes required.

import { supabase } from '@/integrations/supabase/client';
import { getCurrentUserCode } from '@/hooks/useUserCode';
import {
  RiskFactor,
  RiskFactorCategory,
  RiskCalculationMethod,
  RiskDataSource,
  RiskScoringModel,
  EmployerScope,
} from '@/types/riskPolicy';

type AnyRow = Record<string, any>;

function rowToFactor(row: AnyRow): RiskFactor {
  const extras = (row.thresholds ?? {}) as AnyRow;
  return {
    id: row.id,
    code: row.factor_code,
    name: row.factor_name,
    description: row.description ?? '',
    category: (row.category ?? RiskFactorCategory.COMPLIANCE) as RiskFactorCategory,
    componentScope: extras.componentScope ?? [],
    employerScope: (extras.employerScope ?? EmployerScope.ALL_EMPLOYERS) as EmployerScope,
    specificIndustries: extras.specificIndustries,
    specificZones: extras.specificZones,
    dataSource: (row.data_source ?? RiskDataSource.LIABILITY_STATEMENT) as RiskDataSource,
    calculationMethod: (row.scoring_method ?? RiskCalculationMethod.THRESHOLD_BASED) as RiskCalculationMethod,
    rangeScores: extras.rangeScores,
    thresholdCondition: extras.thresholdCondition,
    formulaExpression: row.calculation_formula ?? extras.formulaExpression,
    booleanCondition: extras.booleanCondition,
    crossComponentCondition: extras.crossComponentCondition,
    trendPeriodMonths: extras.trendPeriodMonths,
    scoringModel: (extras.scoringModel ?? RiskScoringModel.FIXED_SCORE) as RiskScoringModel,
    fixedScore: extras.fixedScore,
    formulaMultiplier: extras.formulaMultiplier,
    defaultWeight: Number(row.weight ?? 0),
    active: row.is_enabled !== false,
    checklistTemplateIds: extras.checklistTemplateIds,
    createdDate: row.created_at,
    createdBy: row.created_by ?? '',
    lastModified: row.updated_at,
    lastModifiedBy: row.updated_by ?? '',
  };
}

function factorToRow(f: Partial<RiskFactor>): AnyRow {
  const extras: AnyRow = {};
  if (f.componentScope !== undefined) extras.componentScope = f.componentScope;
  if (f.employerScope !== undefined) extras.employerScope = f.employerScope;
  if (f.specificIndustries !== undefined) extras.specificIndustries = f.specificIndustries;
  if (f.specificZones !== undefined) extras.specificZones = f.specificZones;
  if (f.rangeScores !== undefined) extras.rangeScores = f.rangeScores;
  if (f.thresholdCondition !== undefined) extras.thresholdCondition = f.thresholdCondition;
  if (f.booleanCondition !== undefined) extras.booleanCondition = f.booleanCondition;
  if (f.crossComponentCondition !== undefined) extras.crossComponentCondition = f.crossComponentCondition;
  if (f.trendPeriodMonths !== undefined) extras.trendPeriodMonths = f.trendPeriodMonths;
  if (f.scoringModel !== undefined) extras.scoringModel = f.scoringModel;
  if (f.fixedScore !== undefined) extras.fixedScore = f.fixedScore;
  if (f.formulaMultiplier !== undefined) extras.formulaMultiplier = f.formulaMultiplier;
  if (f.formulaExpression !== undefined) extras.formulaExpression = f.formulaExpression;
  if (f.checklistTemplateIds !== undefined) extras.checklistTemplateIds = f.checklistTemplateIds;

  const row: AnyRow = { thresholds: extras };
  if (f.name !== undefined) row.factor_name = f.name;
  if (f.description !== undefined) row.description = f.description;
  if (f.category !== undefined) row.category = f.category;
  if (f.dataSource !== undefined) row.data_source = f.dataSource;
  if (f.calculationMethod !== undefined) row.scoring_method = f.calculationMethod;
  if (f.formulaExpression !== undefined) row.calculation_formula = f.formulaExpression;
  if (f.defaultWeight !== undefined) row.weight = f.defaultWeight;
  if (f.active !== undefined) row.is_enabled = f.active;
  return row;
}

async function requireUserCode(): Promise<string> {
  const code = await getCurrentUserCode();
  if (!code) throw new Error('User identity required: no user_code resolved for the current session.');
  return code;
}

export const riskFactorService = {
  async getAllFactors(): Promise<RiskFactor[]> {
    const { data, error } = await supabase
      .from('ce_risk_config')
      .select('*')
      .order('factor_code');
    if (error) throw error;
    return (data ?? []).map(rowToFactor);
  },

  async getFactorById(id: string): Promise<RiskFactor | null> {
    const { data, error } = await supabase
      .from('ce_risk_config')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? rowToFactor(data) : null;
  },

  async getActiveFactors(): Promise<RiskFactor[]> {
    const { data, error } = await supabase
      .from('ce_risk_config')
      .select('*')
      .eq('is_enabled', true)
      .order('factor_code');
    if (error) throw error;
    return (data ?? []).map(rowToFactor);
  },

  async createFactor(
    factor: Omit<RiskFactor, 'id' | 'code' | 'createdDate' | 'lastModified'>
  ): Promise<RiskFactor> {
    const userCode = await requireUserCode();

    // Generate next factor_code (RFnn)
    const { data: existing } = await supabase
      .from('ce_risk_config')
      .select('factor_code')
      .order('factor_code', { ascending: false })
      .limit(1);
    const next = (existing?.[0]?.factor_code as string | undefined) ?? 'RF00';
    const num = parseInt(next.replace(/\D/g, ''), 10) || 0;
    const factorCode = `RF${String(num + 1).padStart(2, '0')}`;

    const row = factorToRow(factor as RiskFactor);
    const { data, error } = await supabase
      .from('ce_risk_config')
      .insert({
        ...row,
        factor_code: factorCode,
        created_by: userCode,
        updated_by: userCode,
      } as any)
      .select('*')
      .single();
    if (error) throw error;
    return rowToFactor(data);
  },

  async updateFactor(id: string, updates: Partial<RiskFactor>): Promise<RiskFactor> {
    const userCode = await requireUserCode();
    const row = factorToRow(updates);
    const { data, error } = await supabase
      .from('ce_risk_config')
      .update({ ...row, updated_by: userCode, updated_at: new Date().toISOString() } as any)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return rowToFactor(data);
  },

  async toggleFactorStatus(id: string): Promise<RiskFactor> {
    const userCode = await requireUserCode();
    const { data: current, error: fetchErr } = await supabase
      .from('ce_risk_config')
      .select('is_enabled')
      .eq('id', id)
      .single();
    if (fetchErr) throw fetchErr;

    const { data, error } = await supabase
      .from('ce_risk_config')
      .update({
        is_enabled: !(current.is_enabled ?? true),
        updated_by: userCode,
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return rowToFactor(data);
  },
};
