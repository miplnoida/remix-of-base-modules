/**
 * Risk Scoring Engine — Pure client-side scoring logic
 * Mirrors the ce-risk-recalculation edge function evaluateScore() logic.
 * Used by the Risk Simulator for dry-run scoring with zero DB writes.
 */

// ============= Types =============

export interface ThresholdTier {
  min: number;
  max: number;
  score: number;
  label?: string;
}

export interface ScoreEvaluation {
  score: number;
  matchedTier: ThresholdTier | null;
  explanation: string;
}

export interface FactorConfig {
  id: string;
  factor_code: string;
  factor_name: string;
  weight: number;
  max_score: number;
  scoring_method: string;
  thresholds: ThresholdTier[];
  data_source: string | null;
  category: string | null;
}

export interface FactorInput {
  factor_code: string;
  rawValue: number;
  dataDetail: string;
  isOverride: boolean;
}

export interface FactorResult {
  factor_code: string;
  factor_name: string;
  raw_input: number;
  data_detail: string;
  is_override: boolean;
  scoring_method: string;
  threshold_used: ThresholdTier | null;
  points_awarded: number;
  weight_pct: number;
  weighted_contribution: number;
  explanation: string;
}

export interface SimulationResult {
  total_score: number;
  risk_band: string;
  band_color: string;
  factor_results: Record<string, FactorResult>;
  factors_evaluated: number;
  total_weight: number;
  scoring_engine: string;
}

export interface BandConfig {
  band_name: string;
  score_range_min: number;
  score_range_max: number;
  color: string;
}

// ============= Core Evaluator =============

/**
 * Evaluate a raw value against thresholds using the specified scoring method.
 * Supports: tiered, threshold, binary, linear, count_based
 */
export function evaluateScore(
  rawValue: number,
  scoringMethod: string,
  thresholds: ThresholdTier[],
  maxScore: number
): ScoreEvaluation {
  if (!thresholds || thresholds.length === 0) {
    return { score: 0, matchedTier: null, explanation: "No thresholds configured" };
  }

  // Handle double-encoded JSON strings
  let parsedThresholds = thresholds;
  if (typeof parsedThresholds === "string") {
    try { parsedThresholds = JSON.parse(parsedThresholds); } catch { parsedThresholds = []; }
  }

  switch (scoringMethod) {
    case "binary": {
      if (rawValue > 0 && parsedThresholds.length >= 2) {
        const tier = parsedThresholds[1];
        return { score: tier.score, matchedTier: tier, explanation: `Binary: value ${rawValue} > 0 → ${tier.label || tier.score}` };
      }
      const tier = parsedThresholds[0];
      return { score: tier?.score || 0, matchedTier: tier || null, explanation: `Binary: value ${rawValue} = 0 → ${tier?.label || 0}` };
    }

    case "threshold": {
      const sorted = [...parsedThresholds].sort((a, b) => a.min - b.min);
      let matched: ThresholdTier | null = null;
      for (const tier of sorted) {
        if (rawValue >= tier.min && rawValue <= tier.max) {
          matched = tier;
          break;
        }
      }
      if (!matched) {
        for (let i = sorted.length - 1; i >= 0; i--) {
          if (rawValue >= sorted[i].min) {
            matched = sorted[i];
            break;
          }
        }
      }
      return {
        score: matched?.score || 0,
        matchedTier: matched,
        explanation: `Threshold: value ${rawValue} → ${matched?.label || "no match"} (score: ${matched?.score || 0})`,
      };
    }

    case "linear": {
      const highestMax = Math.max(...parsedThresholds.map(t => t.max));
      const score = highestMax > 0 ? Math.min((rawValue / highestMax) * maxScore, maxScore) : 0;
      return { score: Math.round(score * 100) / 100, matchedTier: null, explanation: `Linear: value ${rawValue} / ${highestMax} × ${maxScore} = ${score.toFixed(2)}` };
    }

    case "count_based":
    case "tiered":
    default: {
      const sorted = [...parsedThresholds].sort((a, b) => a.min - b.min);
      let matched: ThresholdTier | null = null;
      for (const tier of sorted) {
        if (rawValue >= tier.min && rawValue <= tier.max) {
          matched = tier;
          break;
        }
      }
      if (!matched && rawValue > 0) {
        const last = sorted[sorted.length - 1];
        if (rawValue > last.max) matched = last;
      }
      return {
        score: matched?.score || 0,
        matchedTier: matched,
        explanation: `Tiered: value ${rawValue} → ${matched?.label || "no match"} (score: ${matched?.score || 0})`,
      };
    }
  }
}

// ============= Full Simulation =============

/**
 * Run a complete risk simulation for one employer.
 * Takes factor configs (from DB), factor inputs (live or overridden), and band configs.
 * Returns full scored result with explainability — NO database writes.
 */
export function runSimulation(
  factorConfigs: FactorConfig[],
  factorWeights: Record<string, number>, // factor_id → weight_override
  factorInputs: Record<string, FactorInput>, // factor_code → input
  bands: BandConfig[]
): SimulationResult {
  const factorResults: Record<string, FactorResult> = {};
  let totalScore = 0;
  let totalWeight = 0;

  for (const config of factorConfigs) {
    const input = factorInputs[config.factor_code];
    if (!input) continue;

    const weight = factorWeights[config.id] ?? config.weight ?? 0;
    totalWeight += weight;

    const evaluation = evaluateScore(
      input.rawValue,
      config.scoring_method,
      config.thresholds,
      config.max_score
    );

    const weightedContribution = Math.round((evaluation.score * weight) / 100 * 100) / 100;

    factorResults[config.factor_code] = {
      factor_code: config.factor_code,
      factor_name: config.factor_name,
      raw_input: input.rawValue,
      data_detail: input.dataDetail,
      is_override: input.isOverride,
      scoring_method: config.scoring_method,
      threshold_used: evaluation.matchedTier,
      points_awarded: evaluation.score,
      weight_pct: weight,
      weighted_contribution: weightedContribution,
      explanation: evaluation.explanation,
    };

    totalScore += weightedContribution;
  }

  totalScore = Math.round(totalScore * 100) / 100;

  // Determine band
  let riskBand = "LOW";
  let bandColor = "#10B981";
  const sortedBands = [...bands].sort((a, b) => a.score_range_min - b.score_range_min);

  for (const band of sortedBands) {
    if (totalScore >= band.score_range_min && totalScore <= band.score_range_max) {
      riskBand = band.band_name;
      bandColor = band.color;
      break;
    }
  }
  // If above all bands, use highest
  if (sortedBands.length > 0 && totalScore > sortedBands[sortedBands.length - 1].score_range_max) {
    riskBand = sortedBands[sortedBands.length - 1].band_name;
    bandColor = sortedBands[sortedBands.length - 1].color;
  }

  return {
    total_score: totalScore,
    risk_band: riskBand,
    band_color: bandColor,
    factor_results: factorResults,
    factors_evaluated: Object.keys(factorResults).length,
    total_weight: totalWeight,
    scoring_engine: "v2-simulator-client",
  };
}

/**
 * Get recommended action text based on risk band
 */
export function getRecommendedAction(band: string): string {
  switch (band) {
    case "LOW": return "Standard monitoring — no immediate action required. Schedule routine review per policy frequency.";
    case "MEDIUM": return "Enhanced monitoring recommended. Consider scheduling compliance review within 90 days.";
    case "HIGH": return "Immediate compliance review required. Escalate to supervisor for enforcement action consideration.";
    case "CRITICAL": return "Urgent enforcement action required. Mandatory audit, legal escalation review, and management notification.";
    default: return "Review risk profile and determine appropriate action.";
  }
}

/**
 * Get band badge styling
 */
export function getBandStyle(band: string): { bg: string; text: string; border: string } {
  switch (band) {
    case "LOW": return { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" };
    case "MEDIUM": return { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" };
    case "HIGH": return { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" };
    case "CRITICAL": return { bg: "bg-red-100", text: "text-red-900", border: "border-red-400" };
    default: return { bg: "bg-muted", text: "text-muted-foreground", border: "border-border" };
  }
}
