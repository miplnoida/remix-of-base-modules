/**
 * ============================================
 * CENTRALIZED RISK ENGINE
 * Single source of truth for all risk scoring,
 * rating, color mapping, and aggregation logic
 * across the entire Internal Audit module.
 * ============================================
 *
 * ALL modules must use this engine. No hardcoded
 * risk levels, colors, or scoring formulas elsewhere.
 */

// ============= Types =============

export interface RiskBandConfig {
  label: string;
  min_score: number;
  max_score: number;
  color: string;
  sort_order: number;
}

export interface RiskEngineConfig {
  formulaType: 'likelihood_x_impact' | 'likelihood_plus_impact' | 'weighted_average' | string;
  deptRiskMethod: 'maximum' | 'average' | 'weighted' | string;
  scaleMin: number;
  scaleMax: number;
  bands: RiskBandConfig[];
}

export interface RiskRating {
  label: string;
  color: string;
}

export interface DeptRiskResult {
  score: number;
  label: string;
  color: string;
  method: string;
}

// ============= Defaults =============
// Fallback when DB config hasn't loaded yet.

export const DEFAULT_BANDS: RiskBandConfig[] = [
  { label: 'Low', min_score: 1, max_score: 5, color: '#22c55e', sort_order: 1 },
  { label: 'Medium', min_score: 6, max_score: 10, color: '#f59e0b', sort_order: 2 },
  { label: 'High', min_score: 11, max_score: 15, color: '#ef4444', sort_order: 3 },
  { label: 'Critical', min_score: 16, max_score: 25, color: '#7f1d1d', sort_order: 4 },
];

export const DEFAULT_CONFIG: RiskEngineConfig = {
  formulaType: 'likelihood_x_impact',
  deptRiskMethod: 'maximum',
  scaleMin: 1,
  scaleMax: 5,
  bands: DEFAULT_BANDS,
};

// ============= Text-to-Score mapping =============

const TEXT_SCORE_MAP: Record<string, number> = {
  'Very Low': 1,
  'Low': 2,
  'Medium': 3,
  'High': 4,
  'Very High': 5,
};

/**
 * Convert text-based likelihood/impact labels to numeric scores.
 */
export function textToScore(label: string): number {
  return TEXT_SCORE_MAP[label] ?? 3;
}

// ============= Score Calculation =============

/**
 * Calculate risk score from numeric likelihood and impact
 * using the configured formula.
 */
export function calculateScore(
  likelihood: number,
  impact: number,
  formulaType: string = 'likelihood_x_impact'
): number {
  switch (formulaType) {
    case 'likelihood_x_impact':
      return likelihood * impact;
    case 'likelihood_plus_impact':
      return likelihood + impact;
    case 'weighted_average':
      return Math.round((likelihood + impact) / 2);
    default:
      return likelihood * impact;
  }
}

// ============= Rating Lookup =============

/**
 * Determine the risk rating (label + color) for a given score
 * using the configured classification bands.
 */
export function getRiskRating(
  score: number,
  bands: RiskBandConfig[] = DEFAULT_BANDS
): RiskRating {
  for (const band of bands) {
    if (score >= band.min_score && score <= band.max_score) {
      return { label: band.label, color: band.color };
    }
  }
  return { label: 'Unknown', color: '#6b7280' };
}

/**
 * Calculate risk level label from a numeric score.
 * Convenience wrapper over getRiskRating.
 */
export function calculateRiskLevel(
  score: number,
  bands: RiskBandConfig[] = DEFAULT_BANDS
): string {
  return getRiskRating(score, bands).label;
}

/**
 * Get the color for a given risk level label.
 */
export function getRiskColor(
  level: string,
  bands: RiskBandConfig[] = DEFAULT_BANDS
): string {
  const band = bands.find(b => b.label === level);
  return band?.color || '#6b7280';
}

/**
 * Build a color map from bands: { Critical: '#7f1d1d', High: '#ef4444', ... }
 */
export function buildColorMap(bands: RiskBandConfig[] = DEFAULT_BANDS): Record<string, string> {
  return Object.fromEntries(bands.map(b => [b.label, b.color]));
}

// ============= Badge Variant =============

export function getRiskLevelVariant(level: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (level) {
    case 'Critical':
    case 'High':
      return 'destructive';
    case 'Medium':
      return 'secondary';
    default:
      return 'outline';
  }
}

// ============= Function-level Risk =============

/**
 * Calculate a function's risk score from text-based likelihood/impact.
 */
export function calculateFunctionRiskScore(
  likelihood: string,
  impact: string,
  formulaType: string = 'likelihood_x_impact'
): number {
  return calculateScore(textToScore(likelihood), textToScore(impact), formulaType);
}

// ============= Department-level Aggregation =============

/**
 * Calculate department-level risk from an array of functions,
 * using the configured aggregation method.
 */
export function calculateDeptRisk(
  functions: Array<{ likelihood?: string; impact?: string; weight_percentage?: number }>,
  config: Pick<RiskEngineConfig, 'formulaType' | 'deptRiskMethod' | 'bands'> = DEFAULT_CONFIG
): DeptRiskResult {
  const { formulaType, deptRiskMethod, bands } = config;
  if (!functions.length) return { score: 0, label: 'N/A', color: '#6b7280', method: deptRiskMethod };

  const scores = functions.map(fn => {
    const l = textToScore(fn.likelihood || 'Medium');
    const i = textToScore(fn.impact || 'Medium');
    return calculateScore(l, i, formulaType);
  });

  let deptScore = 0;
  switch (deptRiskMethod) {
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

  const rating = getRiskRating(deptScore, bands);
  return { score: deptScore, ...rating, method: deptRiskMethod };
}

// ============= Composite Score Classification =============
// Used by AutoPlanSuggestions and similar 0-100 composite scores.

/**
 * Classify a composite score (0-100 scale) into risk bands.
 * Maps percentile-style scores to band labels using the configured bands
 * by normalizing to the configured scale.
 */
export function classifyCompositeScore(
  compositeScore: number,
  bands: RiskBandConfig[] = DEFAULT_BANDS
): string {
  // Composite scores are 0-100; normalize to the band scale
  const maxBandScore = Math.max(...bands.map(b => b.max_score));
  const normalized = Math.round((compositeScore / 100) * maxBandScore);
  return getRiskRating(normalized, bands).label;
}
