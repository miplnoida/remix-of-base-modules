import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface BonusPolicy {
  id: string;
  include_in_levy: boolean;
  include_in_severance: boolean;
  calculation_method: "merge" | "separate";
  calc_flat_enabled: boolean;
  calc_flat_percentage: number | null;
  calc_slab_enabled: boolean;
  distribution: any;
  min_bonus_amount: number | null;
  max_bonus_amount: number | null;
  contrib_employee: boolean;
  contrib_employer: boolean;
  contrib_eir: boolean;
  is_active: boolean;
  date_from: string;
  date_to: string | null;
}

interface RequestBody {
  periodYear: number;
  periodMonth: number;
  bonusAmount: number;
  weeklyWages: number[]; // [w1,w2,w3,w4,w5,bonus,holiday]
  payPeriod: string; // Weekly, Bi-Weekly, Monthly, 2 Monthly
  dateOfBirth: string;
  termStartDate: string;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function mapPayPeriodToCode(uiPayPeriod: string): string {
  switch (uiPayPeriod) {
    case "Weekly": return "W";
    case "Bi-Weekly": case "BiWeekly": return "E2W";
    case "2 Monthly": case "SemiMonthly": return "2M";
    case "Monthly": default: return "M";
  }
}

function calculateAge(dob: string): number {
  if (!dob) return 30;
  try {
    const d = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - d.getFullYear();
    const m = today.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
    return age;
  } catch { return 30; }
}

function calculateSlabLevy(amount: number, slabs: any[]): number {
  if (amount <= 0 || slabs.length === 0) return 0;
  for (const slab of slabs) {
    if (amount > slab.over_amt) {
      return round2(slab.base_amt + ((amount - slab.over_amt + 0.01) * slab.tax_rate));
    }
  }
  return 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body: RequestBody = await req.json();
    const { periodYear, periodMonth, bonusAmount, weeklyWages, payPeriod, dateOfBirth, termStartDate } = body;

    const periodDate = `${periodYear}-${String(periodMonth + 1).padStart(2, "0")}-01`;

    // 1. Fetch C3 config for period
    const { data: configData, error: configError } = await supabase.rpc(
      "get_c3_config_for_period",
      { p_period_date: periodDate }
    );
    if (configError || !configData?.length) {
      return new Response(JSON.stringify({ error: "No C3 config for period", details: configError?.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const cfg = configData[0];

    // 2. Check for bonus exception first, then fall back to default policy
    let policy: BonusPolicy | null = null;

    // Check exceptions — active, matching the period month/year
    const { data: exceptions } = await supabase
      .from("c3_bonus_policy_exceptions")
      .select("*")
      .eq("is_active", true)
      .eq("override_default", true)
      .lte("date_from", periodDate)
      .or(`date_to.gte.${periodDate},date_to.is.null`)
      .order("date_from", { ascending: false })
      .limit(1);

    if (exceptions?.length) {
      const exc = exceptions[0];
      // Check if the exception applies to this specific month
      const matchesMonth = exc.exception_month === (periodMonth + 1);
      const matchesYear = exc.year_from <= periodYear && (exc.year_to === null || exc.year_to >= periodYear);
      
      if (matchesMonth && matchesYear) {
        policy = {
          id: exc.id,
          include_in_levy: exc.include_in_levy ?? false,
          include_in_severance: exc.include_in_severance ?? false,
          calculation_method: exc.calculation_method ?? "merge",
          calc_flat_enabled: exc.calc_flat_enabled ?? false,
          calc_flat_percentage: exc.calc_flat_percentage,
          calc_slab_enabled: exc.calc_slab_enabled ?? false,
          distribution: exc.distribution,
          min_bonus_amount: exc.min_bonus_amount,
          max_bonus_amount: exc.max_bonus_amount,
          contrib_employee: exc.contrib_employee ?? false,
          contrib_employer: exc.contrib_employer ?? false,
          contrib_eir: exc.contrib_eir ?? false,
          is_active: exc.is_active,
          date_from: exc.date_from,
          date_to: exc.date_to,
        };
      }
    }

    // Fall back to default policy
    if (!policy) {
      const { data: defaults } = await supabase
        .from("c3_bonus_policy_default")
        .select("*")
        .eq("is_active", true)
        .lte("date_from", periodDate)
        .or(`date_to.gte.${periodDate},date_to.is.null`)
        .order("date_from", { ascending: false })
        .limit(1);

      if (defaults?.length) {
        const def = defaults[0];
        policy = {
          id: def.id,
          include_in_levy: def.include_in_levy,
          include_in_severance: def.include_in_severance,
          calculation_method: def.calculation_method,
          calc_flat_enabled: def.calc_flat_enabled,
          calc_flat_percentage: def.calc_flat_percentage,
          calc_slab_enabled: def.calc_slab_enabled,
          distribution: def.distribution,
          min_bonus_amount: def.min_bonus_amount,
          max_bonus_amount: def.max_bonus_amount,
          contrib_employee: def.contrib_employee,
          contrib_employer: def.contrib_employer,
          contrib_eir: def.contrib_eir,
          is_active: def.is_active,
          date_from: def.date_from,
          date_to: def.date_to,
        };
      }
    }

    // 3. Fetch levy slab details
    const { data: slabData } = await supabase
      .from("tb_levy_slabs")
      .select("id")
      .eq("is_active", true)
      .lte("start_date", periodDate)
      .or(`end_date.gte.${periodDate},end_date.is.null`)
      .limit(1);

    let slabDetails: any[] = [];
    if (slabData?.length) {
      const { data: details } = await supabase
        .from("tb_levy_slab_details")
        .select("*")
        .eq("slab_id", slabData[0].id)
        .eq("is_active", true)
        .order("over_amt", { ascending: false });
      slabDetails = details ?? [];
    }

    // 4. Perform calculation
    const w1 = weeklyWages[0] || 0;
    const w2 = weeklyWages[1] || 0;
    const w3 = weeklyWages[2] || 0;
    const w4 = weeklyWages[3] || 0;
    const w5 = weeklyWages[4] || 0;
    const bonus = weeklyWages[5] || 0;
    const holiday = weeklyWages[6] || 0;

    const taxableWages = round2(w1 + w2 + w3 + w4 + w5 + holiday);
    const totalWages = round2(taxableWages + bonus);

    const age = calculateAge(dateOfBirth);
    const isAgeExemptSS = age < cfg.min_age_ss || age > cfg.max_age_ss;
    const isAgeExemptLevy = age < cfg.min_age_levy || age > cfg.max_age_levy;

    // Determine if bonus is eligible based on capping
    let bonusEligible = bonus > 0;
    if (bonusEligible && policy) {
      const minAmt = policy.min_bonus_amount;
      const maxAmt = policy.max_bonus_amount;
      if (minAmt !== null || maxAmt !== null) {
        // Capping is enabled
        if (minAmt !== null && bonus < minAmt) bonusEligible = false;
        if (maxAmt !== null && bonus > maxAmt) bonusEligible = false;
      }
    }

    // Determine bonus inclusion flags based on policy
    const includeBonusInLevy = bonusEligible && (policy?.include_in_levy ?? false);
    const includeBonusInSeverance = bonusEligible && (policy?.include_in_severance ?? false);
    const contribEmployee = bonusEligible && (policy?.contrib_employee ?? false);
    const contribEmployer = bonusEligible && (policy?.contrib_employer ?? false);
    const contribEIB = bonusEligible && (policy?.contrib_eir ?? false);

    // --- Employee SS ---
    const employeeSSRate = Number(cfg.employee_ss_rate) || 0.05;
    const employeeSSMaxWage = Number(cfg.employee_ss_max_wage) || 6500;
    let employeeSSBase = taxableWages;
    if (contribEmployee) employeeSSBase += bonus;
    let employeeSS = 0;
    if (!isAgeExemptSS) {
      employeeSS = round2(employeeSSRate * Math.min(employeeSSBase, employeeSSMaxWage));
    }

    // --- Employee Levy ---
    const payPeriodCode = mapPayPeriodToCode(payPeriod);
    let employeeLevy = 0;
    if (!isAgeExemptLevy) {
      if (policy?.calculation_method === "merge" && includeBonusInLevy) {
        // Merge: Distribute bonus into weeks based on distribution config
        const dist = policy.distribution;
        const mergedWages = [...weeklyWages];
        
        if (payPeriod === "Weekly" && dist?.weekly) {
          const selectedWeeks: number[] = [];
          if (dist.weekly.w1) selectedWeeks.push(0);
          if (dist.weekly.w2) selectedWeeks.push(1);
          if (dist.weekly.w3) selectedWeeks.push(2);
          if (dist.weekly.w4) selectedWeeks.push(3);
          
          if (dist.weekly.divide || selectedWeeks.length === 0) {
            // Divide equally across all generated weeks
            const generatedWeeks = [0, 1, 2, 3, 4].filter(i => (weeklyWages[i] || 0) > 0 || true); // all available
            const count = Math.min(generatedWeeks.length, 5);
            if (count > 0) {
              const perWeek = round2(bonus / count);
              for (const idx of generatedWeeks.slice(0, count)) {
                mergedWages[idx] = (mergedWages[idx] || 0) + perWeek;
              }
            }
          } else if (selectedWeeks.length === 1) {
            mergedWages[selectedWeeks[0]] = (mergedWages[selectedWeeks[0]] || 0) + bonus;
          } else {
            const perWeek = round2(bonus / selectedWeeks.length);
            for (const idx of selectedWeeks) {
              mergedWages[idx] = (mergedWages[idx] || 0) + perWeek;
            }
          }
        } else if (payPeriod === "Bi-Weekly" && dist?.biweekly) {
          if (dist.biweekly.divide) {
            mergedWages[0] = (mergedWages[0] || 0) + round2(bonus / 2);
            mergedWages[2] = (mergedWages[2] || 0) + round2(bonus / 2);
          } else if (dist.biweekly.b1) {
            mergedWages[0] = (mergedWages[0] || 0) + bonus;
          } else if (dist.biweekly.b2) {
            mergedWages[2] = (mergedWages[2] || 0) + bonus;
          }
        } else if (payPeriod === "Monthly") {
          // Monthly: just add to first week
          mergedWages[0] = (mergedWages[0] || 0) + bonus;
        }

        // Remove bonus from index 5 since it's been merged
        mergedWages[5] = 0;

        // Calculate levy on merged wages using slabs
        const matchingSlabs = slabDetails
          .filter((s: any) => s.pay_period === payPeriodCode)
          .sort((a: any, b: any) => b.over_amt - a.over_amt);

        // Check monthly switching
        const levyMonthlyThreshold = Number(cfg.levy_monthly_threshold) || 6500;
        const useMonthly = cfg.levy_use_monthly_when_exceeded || false;
        const totalWeek1To6 = (mergedWages[0] || 0) + (mergedWages[1] || 0) + (mergedWages[2] || 0) + (mergedWages[3] || 0) + (mergedWages[4] || 0) + (mergedWages[6] || 0);

        if (useMonthly && totalWeek1To6 > levyMonthlyThreshold) {
          const monthlySlabs = slabDetails
            .filter((s: any) => s.pay_period === "M")
            .sort((a: any, b: any) => b.over_amt - a.over_amt);
          employeeLevy = calculateSlabLevy(totalWeek1To6, monthlySlabs);
        } else {
          for (const idx of [0, 1, 2, 3, 4, 6]) {
            const amt = mergedWages[idx] || 0;
            if (amt > 0) employeeLevy += calculateSlabLevy(amt, matchingSlabs);
          }
        }
      } else if (policy?.calculation_method === "separate" && includeBonusInLevy) {
        // Separate: Calculate regular levy + bonus levy separately
        
        // Regular levy (no bonus)
        const matchingSlabs = slabDetails
          .filter((s: any) => s.pay_period === payPeriodCode)
          .sort((a: any, b: any) => b.over_amt - a.over_amt);

        const levyMonthlyThreshold = Number(cfg.levy_monthly_threshold) || 6500;
        const useMonthly = cfg.levy_use_monthly_when_exceeded || false;
        const totalWeek1To6 = w1 + w2 + w3 + w4 + w5 + holiday;

        if (useMonthly && totalWeek1To6 > levyMonthlyThreshold) {
          const monthlySlabs = slabDetails
            .filter((s: any) => s.pay_period === "M")
            .sort((a: any, b: any) => b.over_amt - a.over_amt);
          employeeLevy = calculateSlabLevy(totalWeek1To6, monthlySlabs);
        } else {
          for (const idx of [0, 1, 2, 3, 4, 6]) {
            const amt = weeklyWages[idx] || 0;
            if (amt > 0) employeeLevy += calculateSlabLevy(amt, matchingSlabs);
          }
        }

        // Bonus levy
        if (bonus > 0) {
          if (policy.calc_flat_enabled && policy.calc_flat_percentage) {
            // Flat percentage
            employeeLevy += round2(bonus * (policy.calc_flat_percentage / 100));
          } else if (policy.calc_slab_enabled) {
            // Slab-based: treat bonus as one extra payment unit
            employeeLevy += calculateSlabLevy(bonus, matchingSlabs);
          }
        }
      } else {
        // No policy or bonus not eligible — standard calculation (no bonus in levy)
        const matchingSlabs = slabDetails
          .filter((s: any) => s.pay_period === payPeriodCode)
          .sort((a: any, b: any) => b.over_amt - a.over_amt);

        const levyMonthlyThreshold = Number(cfg.levy_monthly_threshold) || 6500;
        const useMonthly = cfg.levy_use_monthly_when_exceeded || false;
        const totalWeek1To6 = w1 + w2 + w3 + w4 + w5 + holiday;

        if (useMonthly && totalWeek1To6 > levyMonthlyThreshold) {
          const monthlySlabs = slabDetails
            .filter((s: any) => s.pay_period === "M")
            .sort((a: any, b: any) => b.over_amt - a.over_amt);
          employeeLevy = calculateSlabLevy(totalWeek1To6, monthlySlabs);
        } else {
          for (const idx of [0, 1, 2, 3, 4, 6]) {
            const amt = weeklyWages[idx] || 0;
            if (amt > 0) employeeLevy += calculateSlabLevy(amt, matchingSlabs);
          }
        }

        // Add bonus levy from C3 config (legacy behavior)
        if (bonus > 0 && !cfg.bonus_exempt_from_levy && cfg.bonus_levy_rate > 0) {
          employeeLevy += round2(bonus * Number(cfg.bonus_levy_rate));
        }
      }
      employeeLevy = round2(employeeLevy);
    }

    // --- Employer contributions ---
    const employerSSRate = Number(cfg.employer_ss_rate) || 0.05;
    const employerEIBRate = Number(cfg.employer_eib_rate) || 0.01;
    const employerSSMaxWage = Number(cfg.employer_ss_max_wage) || 6500;
    const employerLevyRate = Number(cfg.employer_levy_rate) || 0.03;
    const employerSeveranceRate = Number(cfg.employer_severance_rate) || 0.01;

    let employerSSBase = taxableWages;
    if (contribEmployer) employerSSBase += bonus;

    let employerEIBBase = taxableWages;
    if (contribEIB) employerEIBBase += bonus;

    let employerSS = 0;
    let employerEIB = 0;
    if (!isAgeExemptSS) {
      employerSS = round2(employerSSRate * Math.min(employerSSBase, employerSSMaxWage));
      employerEIB = round2(employerEIBRate * Math.min(employerEIBBase, employerSSMaxWage));
    }
    const employerSSTotal = round2(employerSS + employerEIB);

    // Employer Levy: based on taxable wages (+ bonus if included)
    let employerLevyBase = taxableWages;
    if (includeBonusInLevy) employerLevyBase += bonus;
    const employerLevy = round2(employerLevyRate * employerLevyBase);

    // Employer Severance
    let severanceBase = taxableWages;
    if (includeBonusInSeverance) severanceBase += bonus;
    const employerSeverance = round2(employerSeveranceRate * severanceBase);

    const result = {
      totalWages,
      taxableWages,
      employeeSS,
      employeeLevy,
      employerSS,
      employerEIB,
      employerSSTotal,
      employerLevy,
      employerSeverance,
      isAgeExemptSS,
      isAgeExemptLevy,
      bonusEligible,
      policyApplied: policy ? { id: policy.id, method: policy.calculation_method, isException: !!policy } : null,
      periodGross: totalWages,
    };

    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
