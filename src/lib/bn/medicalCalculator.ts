// Medical reimbursement calculator with full audit trace.
// Pure function — no I/O. Caller persists the resulting calc row.

import type {
  BnMedicalClaimExpense,
  BnMedicalReimbursementLimit,
  CapType,
  JurisdictionLevelExt,
} from '@/types/bnMedical';

export interface CalcContext {
  countryCode: string;
  /** Cumulative payable already used by this claimant in current year */
  annualUsed?: number;
  /** Cumulative payable already used by this claimant for life */
  lifetimeUsed?: number;
  /** Optional FX: target currency = countryCode currency. Map source → factor. */
  fxRates?: Record<string, number>;
  baseCurrency: string;
}

export interface ExpenseCalcResult {
  expense_id?: string;
  procedure_id?: string | null;
  expense_type_id?: string | null;
  jurisdiction_level?: string | null;
  claimed_amount: number;
  approved_amount: number;
  expense_cap_applied?: number;
  procedure_cap_applied?: number;
  reimbursement_percent: number;
  payable: number;
  notes: string[];
}

export interface CalcResult {
  total_claimed: number;
  total_approved: number;
  total_payable: number;
  cap_applied: string | null;
  per_expense: ExpenseCalcResult[];
  trace: Record<string, unknown>;
}

const matchLimit = (
  limits: BnMedicalReimbursementLimit[],
  capType: CapType,
  opts: {
    countryCode: string;
    jurisdiction?: JurisdictionLevelExt | null;
    procedureId?: string | null;
    expenseTypeId?: string | null;
  }
): BnMedicalReimbursementLimit | undefined => {
  return limits.find(
    (l) =>
      l.is_active !== false &&
      l.cap_type === capType &&
      l.country_code === opts.countryCode &&
      (l.jurisdiction_level === 'ANY' ||
        !opts.jurisdiction ||
        l.jurisdiction_level === opts.jurisdiction) &&
      (l.procedure_id ?? null) === (opts.procedureId ?? null) &&
      (l.expense_type_id ?? null) === (opts.expenseTypeId ?? null)
  );
};

const fx = (amt: number, from: string, to: string, ctx: CalcContext) => {
  if (from === to) return amt;
  const rate = ctx.fxRates?.[`${from}_${to}`] ?? 1;
  return amt * rate;
};

export function calculateReimbursement(
  expenses: BnMedicalClaimExpense[],
  limits: BnMedicalReimbursementLimit[],
  expenseDefaults: Map<string, number | null>, // expense_type_id → default_cap
  ctx: CalcContext
): CalcResult {
  const perExpense: ExpenseCalcResult[] = [];
  const procedureRunningCap = new Map<string, number>(); // procedure_id → remaining cap
  let totalClaimed = 0;
  let totalApproved = 0;
  let totalPayable = 0;
  let capApplied: string | null = null;

  for (const e of expenses) {
    const notes: string[] = [];
    const claimed = Number(e.claimed_amount || 0);
    const approved = e.approved_amount != null ? Number(e.approved_amount) : claimed;
    totalClaimed += claimed;
    totalApproved += approved;

    let working = approved;
    notes.push(`approved=${approved}`);

    // Per-expense cap from limit table (or default_cap fallback)
    const expLimit = matchLimit(limits, 'PER_EXPENSE', {
      countryCode: ctx.countryCode,
      jurisdiction: e.jurisdiction_level,
      expenseTypeId: e.expense_type_id,
    });
    let expCapAmt = expLimit?.cap_amount;
    if (expCapAmt == null && e.expense_type_id) {
      expCapAmt = expenseDefaults.get(e.expense_type_id) ?? undefined;
    }
    if (expCapAmt != null && working > expCapAmt) {
      notes.push(`expense_cap=${expCapAmt} applied`);
      working = expCapAmt;
      capApplied = capApplied ?? 'PER_EXPENSE';
    }

    // Per-procedure cap
    let procCapAmt: number | undefined;
    if (e.procedure_id) {
      const procLimit = matchLimit(limits, 'PER_PROCEDURE', {
        countryCode: ctx.countryCode,
        jurisdiction: e.jurisdiction_level,
        procedureId: e.procedure_id,
      });
      if (procLimit) {
        const remaining = procedureRunningCap.get(e.procedure_id) ?? procLimit.cap_amount;
        procCapAmt = remaining;
        if (working > remaining) {
          notes.push(`procedure_cap_remaining=${remaining} applied`);
          working = Math.max(0, remaining);
          capApplied = capApplied ?? 'PER_PROCEDURE';
        }
        procedureRunningCap.set(e.procedure_id, Math.max(0, remaining - working));
      }
    }

    // Reimbursement percent (use most-specific PER_EXPENSE/PER_PROCEDURE limit pct, else 100)
    const pct = expLimit?.reimbursement_percent ?? 100;
    const beforePct = working;
    working = (working * pct) / 100;
    if (pct !== 100) notes.push(`reimbursement_percent=${pct}% on ${beforePct}`);

    // FX
    if (e.currency_code && e.currency_code !== ctx.baseCurrency) {
      const before = working;
      working = fx(working, e.currency_code, ctx.baseCurrency, ctx);
      notes.push(`fx ${e.currency_code}->${ctx.baseCurrency}: ${before} -> ${working}`);
    }

    perExpense.push({
      expense_id: e.id,
      procedure_id: e.procedure_id ?? null,
      expense_type_id: e.expense_type_id ?? null,
      jurisdiction_level: e.jurisdiction_level ?? null,
      claimed_amount: claimed,
      approved_amount: approved,
      expense_cap_applied: expCapAmt,
      procedure_cap_applied: procCapAmt,
      reimbursement_percent: pct,
      payable: Number(working.toFixed(2)),
      notes,
    });
    totalPayable += working;
  }

  // Annual cap
  const annual = matchLimit(limits, 'ANNUAL', { countryCode: ctx.countryCode });
  if (annual) {
    const remaining = Math.max(0, annual.cap_amount - (ctx.annualUsed ?? 0));
    if (totalPayable > remaining) {
      totalPayable = remaining;
      capApplied = 'ANNUAL';
    }
  }

  // Lifetime cap
  const lifetime = matchLimit(limits, 'LIFETIME', { countryCode: ctx.countryCode });
  if (lifetime) {
    const remaining = Math.max(0, lifetime.cap_amount - (ctx.lifetimeUsed ?? 0));
    if (totalPayable > remaining) {
      totalPayable = remaining;
      capApplied = 'LIFETIME';
    }
  }

  return {
    total_claimed: Number(totalClaimed.toFixed(2)),
    total_approved: Number(totalApproved.toFixed(2)),
    total_payable: Number(totalPayable.toFixed(2)),
    cap_applied: capApplied,
    per_expense: perExpense,
    trace: {
      context: ctx,
      per_expense: perExpense,
      annual_cap: annual ?? null,
      lifetime_cap: lifetime ?? null,
      computed_at: new Date().toISOString(),
    },
  };
}

/** Decide treatment path: LOCAL → REGIONAL → INTERNATIONAL */
export function resolveTreatmentPath(
  procedureId: string,
  claimantCountry: string,
  facilityProcedures: Array<{ facility_id: string; procedure_id: string; availability_status: string }>,
  facilities: Array<{ id?: string; country_code: string; jurisdiction_level: string; is_active?: boolean; is_approved?: boolean }>
): { level: 'LOCAL' | 'REGIONAL' | 'INTERNATIONAL' | 'UNAVAILABLE'; reason: string } {
  const matches = facilityProcedures.filter(
    (fp) => fp.procedure_id === procedureId && fp.availability_status !== 'NOT_AVAILABLE'
  );
  const facById = new Map(facilities.map((f) => [f.id, f]));

  const localOk = matches.some((m) => {
    const f = facById.get(m.facility_id);
    return f?.is_active !== false && f?.is_approved !== false &&
      f?.jurisdiction_level === 'LOCAL' && f?.country_code === claimantCountry;
  });
  if (localOk) return { level: 'LOCAL', reason: 'Procedure available locally' };

  const regionalOk = matches.some((m) => {
    const f = facById.get(m.facility_id);
    return f?.is_active !== false && f?.is_approved !== false && f?.jurisdiction_level === 'REGIONAL';
  });
  if (regionalOk) return { level: 'REGIONAL', reason: 'Available regionally — referral required' };

  const intlOk = matches.some((m) => {
    const f = facById.get(m.facility_id);
    return f?.is_active !== false && f?.is_approved !== false && f?.jurisdiction_level === 'INTERNATIONAL';
  });
  if (intlOk) return { level: 'INTERNATIONAL', reason: 'Available internationally — referral required' };

  return { level: 'UNAVAILABLE', reason: 'No approved facility offers this procedure' };
}
