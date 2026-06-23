import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

/**
 * Penalty/fine/interest rates are pulled from existing configuration tables.
 * No SKN rates are hardcoded here.
 *
 * Lookup priority:
 *   1. c3_calculation_config (modern config rows)
 *   2. tb_penalty (legacy penalty schedule)
 *   3. tb_ssc_rates (SS rate schedule)
 *
 * This service exposes a thin facade so monthlyPostingService and
 * recalculationService can compute penalties without knowing the legacy tables.
 */

export interface PenaltyRateContext {
  fund_code: "SS" | "LV" | "PE";
  period: string; // YYYY-MM-01
  is_first_month: boolean;
}

export interface PenaltyRate {
  rate: number; // fraction (e.g. 0.10 = 10%)
  rate_basis: "PRINCIPAL" | "OUTSTANDING";
  source: string;
}

export async function resolvePenaltyRate(ctx: PenaltyRateContext): Promise<PenaltyRate | null> {
  // Try c3_calculation_config first
  const { data: cfg } = await sb
    .from("c3_calculation_config")
    .select("*")
    .ilike("config_key", `%${ctx.fund_code}%PENALTY%`)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  if (cfg) {
    const v = Number(cfg.config_value ?? cfg.value ?? 0);
    if (v > 0) {
      return {
        rate: v > 1 ? v / 100 : v,
        rate_basis: "PRINCIPAL",
        source: `c3_calculation_config:${cfg.config_key ?? cfg.id}`,
      };
    }
  }

  // Legacy tb_penalty (best-effort, schema-agnostic)
  const { data: leg } = await sb
    .from("tb_penalty")
    .select("*")
    .limit(1)
    .maybeSingle();
  if (leg) {
    const candidate =
      Number(
        ctx.is_first_month
          ? leg.first_month_rate ?? leg.initial_rate ?? leg.rate
          : leg.subsequent_month_rate ?? leg.subseq_rate ?? leg.rate,
      ) || 0;
    if (candidate > 0) {
      return {
        rate: candidate > 1 ? candidate / 100 : candidate,
        rate_basis: "PRINCIPAL",
        source: "tb_penalty",
      };
    }
  }

  return null;
}

export function computePenaltyAmount(principal: number, rate: PenaltyRate): number {
  if (!principal || principal <= 0) return 0;
  return Math.round(principal * rate.rate * 100) / 100;
}
