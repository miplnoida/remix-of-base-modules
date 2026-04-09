/**
 * Capacity-Based Audit Planning Engine
 * 
 * Provides functions for:
 * - Team capacity calculation (annual & quarterly)
 * - Quarter-wise load analysis
 * - Balance scoring & distribution warnings
 * - Engagement allocation suggestions
 */

// ─── Types ───

export interface CapacityConfig {
  auditorCount: number;
  monthlyWorkingHours: number; // per auditor per month (default 160)
  utilizationPct: number;      // target utilization % (default 85)
  bufferPct: number;           // contingency buffer % (default 10)
}

export interface QuarterLoad {
  quarter: string;        // Q1, Q2, Q3, Q4
  engagementCount: number;
  totalHours: number;
  totalDays: number;
  highRiskCount: number;
}

export interface CapacitySummary {
  // Annual totals
  annualGrossHours: number;       // auditors × monthlyHours × 12
  annualEffectiveHours: number;   // gross × utilization%
  annualNetHours: number;         // effective - buffer
  bufferHours: number;
  
  // Quarterly breakdown
  quarterlyGrossHours: number;    // annual / 4
  quarterlyEffectiveHours: number;
  quarterlyNetHours: number;
  
  // Per-auditor
  perAuditorAnnualHours: number;
  perAuditorQuarterlyHours: number;
}

export interface QuarterAnalysis {
  quarter: string;
  capacity: number;          // net available hours for this quarter
  used: number;              // hours consumed by engagements
  remaining: number;         // capacity - used
  utilizationPct: number;    // (used / capacity) × 100
  status: 'underloaded' | 'balanced' | 'heavy' | 'overloaded';
  engagementCount: number;
  highRiskCount: number;
}

export interface DistributionAnalysis {
  quarters: QuarterAnalysis[];
  overallUtilization: number;
  balanceScore: number;         // 0-100, 100 = perfectly balanced
  isBalanced: boolean;
  warnings: CapacityWarning[];
  suggestedQuarter: string | null; // least-loaded valid quarter for next engagement
}

export interface CapacityWarning {
  type: 'overloaded' | 'underloaded' | 'imbalanced' | 'no_capacity' | 'buffer_exceeded' | 'empty_quarter';
  quarter?: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
}

// ─── Constants ───

const HOURS_PER_DAY = 8;
const MONTHS_PER_QUARTER = 3;
const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'] as const;

// Balance thresholds
const UNDERLOADED_THRESHOLD = 50;   // < 50% utilization
const BALANCED_LOW = 60;            // 60-90% = balanced
const BALANCED_HIGH = 90;
const HEAVY_THRESHOLD = 100;        // 90-100% = heavy
// > 100% = overloaded

const IMBALANCE_TOLERANCE = 20;     // max allowed % difference between most/least loaded quarters

// ─── Core Calculations ───

export function calculateCapacity(config: CapacityConfig): CapacitySummary {
  const { auditorCount, monthlyWorkingHours, utilizationPct, bufferPct } = config;
  
  const annualGrossHours = auditorCount * monthlyWorkingHours * 12;
  const annualEffectiveHours = annualGrossHours * (utilizationPct / 100);
  const bufferHours = annualEffectiveHours * (bufferPct / 100);
  const annualNetHours = annualEffectiveHours - bufferHours;
  
  const quarterlyGrossHours = annualGrossHours / 4;
  const quarterlyEffectiveHours = annualEffectiveHours / 4;
  const quarterlyNetHours = annualNetHours / 4;
  
  const perAuditorAnnualHours = auditorCount > 0 ? annualNetHours / auditorCount : 0;
  const perAuditorQuarterlyHours = auditorCount > 0 ? quarterlyNetHours / auditorCount : 0;
  
  return {
    annualGrossHours: round(annualGrossHours),
    annualEffectiveHours: round(annualEffectiveHours),
    annualNetHours: round(annualNetHours),
    bufferHours: round(bufferHours),
    quarterlyGrossHours: round(quarterlyGrossHours),
    quarterlyEffectiveHours: round(quarterlyEffectiveHours),
    quarterlyNetHours: round(quarterlyNetHours),
    perAuditorAnnualHours: round(perAuditorAnnualHours),
    perAuditorQuarterlyHours: round(perAuditorQuarterlyHours),
  };
}

// ─── Quarter Load Extraction ───

export function extractQuarterLoads(engagements: any[]): QuarterLoad[] {
  return QUARTERS.map(q => {
    const qEngs = engagements.filter((e: any) => e.quarter === q && e.is_active !== false);
    return {
      quarter: q,
      engagementCount: qEngs.length,
      totalHours: qEngs.reduce((s: number, e: any) => s + getEngagementHours(e), 0),
      totalDays: qEngs.reduce((s: number, e: any) => s + (Number(e.estimated_days) || 0), 0),
      highRiskCount: qEngs.filter((e: any) => ['High', 'Critical'].includes(e.engagement_risk_rating)).length,
    };
  });
}

/** Get engagement hours: prefer estimated_hours, fallback to estimated_days × 8 */
export function getEngagementHours(engagement: any): number {
  if (engagement.estimated_hours && Number(engagement.estimated_hours) > 0) {
    return Number(engagement.estimated_hours);
  }
  if (engagement.estimated_days && Number(engagement.estimated_days) > 0) {
    return Number(engagement.estimated_days) * HOURS_PER_DAY;
  }
  return 0;
}

// ─── Distribution Analysis ───

export function analyzeDistribution(
  config: CapacityConfig,
  engagements: any[]
): DistributionAnalysis {
  const capacity = calculateCapacity(config);
  const loads = extractQuarterLoads(engagements);
  const warnings: CapacityWarning[] = [];
  
  const quarters: QuarterAnalysis[] = loads.map(load => {
    const qCapacity = capacity.quarterlyNetHours;
    const used = load.totalHours;
    const remaining = qCapacity - used;
    const utilPct = qCapacity > 0 ? (used / qCapacity) * 100 : 0;
    
    let status: QuarterAnalysis['status'];
    if (utilPct > HEAVY_THRESHOLD) status = 'overloaded';
    else if (utilPct > BALANCED_HIGH) status = 'heavy';
    else if (utilPct >= BALANCED_LOW) status = 'balanced';
    else status = 'underloaded';
    
    return {
      quarter: load.quarter,
      capacity: round(qCapacity),
      used: round(used),
      remaining: round(remaining),
      utilizationPct: round(utilPct),
      status,
      engagementCount: load.engagementCount,
      highRiskCount: load.highRiskCount,
    };
  });
  
  // Overall utilization
  const totalUsed = quarters.reduce((s, q) => s + q.used, 0);
  const totalCapacity = capacity.annualNetHours;
  const overallUtilization = totalCapacity > 0 ? round((totalUsed / totalCapacity) * 100) : 0;
  
  // Balance score: based on coefficient of variation of quarter utilizations
  const utilValues = quarters.map(q => q.utilizationPct);
  const mean = utilValues.reduce((s, v) => s + v, 0) / 4;
  const variance = utilValues.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / 4;
  const stdDev = Math.sqrt(variance);
  const cv = mean > 0 ? (stdDev / mean) * 100 : 0;
  const balanceScore = Math.max(0, round(100 - cv * 2)); // Lower CV = higher score
  
  const maxUtil = Math.max(...utilValues);
  const minUtil = Math.min(...utilValues);
  const isBalanced = (maxUtil - minUtil) <= IMBALANCE_TOLERANCE && !quarters.some(q => q.status === 'overloaded');
  
  // Generate warnings
  quarters.forEach(q => {
    if (q.status === 'overloaded') {
      warnings.push({
        type: 'overloaded',
        quarter: q.quarter,
        message: `${q.quarter} is overloaded at ${q.utilizationPct}% utilization (${q.used}h / ${q.capacity}h capacity)`,
        severity: 'critical',
      });
    }
    if (q.engagementCount === 0) {
      warnings.push({
        type: 'empty_quarter',
        quarter: q.quarter,
        message: `${q.quarter} has no engagements assigned — consider redistributing`,
        severity: 'warning',
      });
    }
    if (q.status === 'underloaded' && q.engagementCount > 0) {
      warnings.push({
        type: 'underloaded',
        quarter: q.quarter,
        message: `${q.quarter} is underutilized at ${q.utilizationPct}% — ${q.remaining}h remaining capacity`,
        severity: 'info',
      });
    }
  });
  
  if (!isBalanced && quarters.some(q => q.engagementCount > 0)) {
    warnings.push({
      type: 'imbalanced',
      message: `Quarter distribution is uneven (${round(minUtil)}%–${round(maxUtil)}% range). Target: within ${IMBALANCE_TOLERANCE}% of each other.`,
      severity: 'warning',
    });
  }
  
  if (totalUsed > totalCapacity) {
    warnings.push({
      type: 'buffer_exceeded',
      message: `Total planned hours (${round(totalUsed)}h) exceed net capacity (${round(totalCapacity)}h). Consider adding resources or reducing scope.`,
      severity: 'critical',
    });
  }
  
  // Suggest least-loaded valid quarter
  const availableQuarters = quarters
    .filter(q => q.status !== 'overloaded')
    .sort((a, b) => a.utilizationPct - b.utilizationPct);
  const suggestedQuarter = availableQuarters.length > 0 ? availableQuarters[0].quarter : null;
  
  return {
    quarters,
    overallUtilization,
    balanceScore,
    isBalanced,
    warnings,
    suggestedQuarter,
  };
}

// ─── Allocation Helper ───

/**
 * Suggests the best quarter for a new engagement based on:
 * 1. Least-loaded quarter that isn't overloaded
 * 2. High-risk engagements can go to Q1/Q2 if they have the lowest load
 */
export function suggestQuarterForEngagement(
  config: CapacityConfig,
  engagements: any[],
  newEngagementHours: number,
  isHighRisk: boolean = false
): { quarter: string; reason: string } | null {
  const analysis = analyzeDistribution(config, engagements);
  
  // Filter quarters that can absorb the new engagement
  const candidates = analysis.quarters
    .filter(q => (q.remaining >= newEngagementHours) || q.engagementCount === 0)
    .sort((a, b) => a.utilizationPct - b.utilizationPct);
  
  if (candidates.length === 0) {
    return null; // No quarter has capacity
  }
  
  // High-risk: prefer earlier quarters but still pick least-loaded among first half
  if (isHighRisk) {
    const earlyQuarters = candidates.filter(q => ['Q1', 'Q2'].includes(q.quarter));
    if (earlyQuarters.length > 0) {
      return {
        quarter: earlyQuarters[0].quarter,
        reason: `High-risk audit prioritized to early quarter (${earlyQuarters[0].quarter}) — ${earlyQuarters[0].remaining}h remaining`,
      };
    }
  }
  
  return {
    quarter: candidates[0].quarter,
    reason: `Least-loaded quarter with ${candidates[0].remaining}h remaining capacity (${candidates[0].utilizationPct}% utilized)`,
  };
}

// ─── Config Defaults ───

export function getDefaultCapacityConfig(auditorCount?: number): CapacityConfig {
  return {
    auditorCount: auditorCount || 0,
    monthlyWorkingHours: 160,
    utilizationPct: 85,
    bufferPct: 10,
  };
}

export function configFromPlan(plan: any, fallbackAuditorCount?: number): CapacityConfig {
  return {
    auditorCount: plan?.auditor_count || fallbackAuditorCount || 0,
    monthlyWorkingHours: Number(plan?.monthly_working_hours) || 160,
    utilizationPct: Number(plan?.utilization_pct) || 85,
    bufferPct: Number(plan?.buffer_pct) || 10,
  };
}

// ─── Helpers ───

function round(val: number, decimals = 1): number {
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}
