# Phase 1 — Risk Model Extension for Planning

This phase reuses the existing risk framework end-to-end and adds the
**minimum** required to support better compliance planning. **No existing
table, column, factor, policy, band, screen, service, or hook was removed
or renamed.**

## 1. What was reused unchanged

| Layer | Element | Status |
|-------|---------|--------|
| Schema | `ce_risk_config` (factor catalog) | Reused as-is |
| Schema | `ce_risk_policies` | Reused as-is |
| Schema | `ce_risk_policy_factors` (policy ↔ factor link, weight override) | Reused as-is |
| Schema | `ce_risk_bands` (audit_frequency, mandatory_audit, auto_select_*, escalation_*, follow_up_intensity) | Reused as-is |
| Schema | `ce_risk_profiles` (per-employer scores, override_band, audit_frequency_override) | Extended only with planning helper columns |
| Schema | `ce_risk_score_history` | Reused as-is |
| UI | Risk & Escalation Policy screen | Reused as-is |
| UI | Risk Factors / Policies / Bands tabs | Reused as-is |
| Service | `useRiskSimulatorData` hook | Reused as-is — automatically picks up the new factors via `ce_risk_policy_factors` |

## 2. Minimal additions

### 2.1 New columns on `ce_risk_profiles` (additive, nullable)

| Column | Type | Purpose |
|--------|------|---------|
| `last_audit_date` | date | Last completed compliance audit visit |
| `next_audit_due_date` | date | Next scheduled audit due date |
| `overdue_audit_days` | integer | Days past `next_audit_due_date` |
| `consecutive_cycles_skipped` | integer | Audit cycles missed in a row |
| `months_in_current_band` | integer | Months sustained in current risk band |
| `audit_program` | varchar(50) | e.g. `ANNUAL_AUDIT`, `BIENNIAL`, `RANDOM_3Y` |
| `audit_cycle_type` | varchar(32) | Derived from band — `HIGH_FREQ` / `NORMAL` / `LOW_FREQ` |

Indexes added: `idx_ce_risk_profiles_next_audit_due`,
`idx_ce_risk_profiles_overdue_audit` (partial — only rows where overdue > 0).

### 2.2 No changes to risk bands

All planning behaviours (audit frequency, mandatory audit, auto-select,
escalation, follow-up intensity) already exist on `ce_risk_bands` and continue
to drive planning. No new band columns were required.

### 2.3 New planning factors (data only — no schema change)

Eleven new rows seeded into `ce_risk_config` using the **same factor
architecture** (`factor_code`, `factor_name`, `data_source`, `scoring_method`,
`thresholds`, `calculation_formula`, `category`, `weight`, `is_enabled`):

| factor_code | category | data_source | scoring_method | weight |
|-------------|----------|-------------|----------------|--------|
| `active_case_urgency` | PLANNING | COMPLIANCE_CASES | tiered | 1.0 |
| `legal_stage` | LEGAL | LEGAL_ENFORCEMENT | lookup | 1.5 |
| `arrangement_breach` | COMPLIANCE | C3_ARRANGEMENTS | tiered | 1.2 |
| `notice_response_due` | COMPLIANCE | COMPLIANCE_NOTICES | tiered | 1.0 |
| `last_audit_date` | PLANNING | AUDIT_HISTORY | tiered | 0.8 |
| `next_audit_due` | PLANNING | AUDIT_PROGRAM | tiered | 1.0 |
| `overdue_audit_days` | PLANNING | AUDIT_PROGRAM | tiered | 1.5 |
| `sustained_high_risk_months` | BEHAVIOURAL | RISK_PROFILE_HISTORY | tiered | 1.2 |
| `carry_forward_pressure` | PLANNING | WEEKLY_PLAN_HISTORY | tiered | 0.8 |
| `zone_hotspot_priority` | STRATEGIC | ZONE_CAMPAIGNS | lookup | 1.0 |
| `complaint_intel_trigger` | INTELLIGENCE | COMPLAINTS_INTEL | tiered | 1.3 |

These factors are visible in the existing **Risk Factors** tab immediately and
can be attached to any policy via `ce_risk_policy_factors` with optional
`weight_override` — exactly like the original 5 factors.

## 3. Audit-cycle support

Planning concepts requested (`audit_program`, `audit_cycle_type`,
`last_audit_date`, `next_due_date`, `overdue_days`, `consecutive_cycles_skipped`)
are implemented using **option 2 — derived planning fields feeding the
candidate scoring engine** (added on `ce_risk_profiles`). Candidate scoring
functions (`fn_ce_score_candidates_v3`) can read these directly without any
changes to the factor table, while the corresponding factors above
(`last_audit_date`, `next_audit_due`, `overdue_audit_days`) make them visible
in the policy/factor UI for tuning.

## 4. Backwards compatibility

- Existing 5 factors (arrears, violations, filings, legal, payment) remain
  untouched and continue to drive every active policy.
- Existing risk profile columns (`arrears_score`, `violation_score`, etc.)
  remain untouched.
- All new factors are seeded with `is_enabled = true` but are **not yet
  attached** to any policy. They become live only when a Compliance Head
  links them to a policy through the existing Risk & Escalation Policy
  screen — preserving full governance and rollback.
- All new profile columns are nullable with safe defaults, so existing rows
  and existing `useRiskSimulatorData`/`fn_ce_score_candidates_v3` calls
  continue to work without modification.

## 5. Verification queries

```sql
-- New factors visible in the existing factor catalog
SELECT factor_code, category, data_source, scoring_method, weight, is_enabled
  FROM public.ce_risk_config
 WHERE created_by = 'SYSTEM_PHASE1'
 ORDER BY category, factor_code;

-- Confirm the new profile columns exist and are populated where applicable
SELECT employer_id, last_audit_date, next_audit_due_date, overdue_audit_days,
       consecutive_cycles_skipped, months_in_current_band,
       audit_program, audit_cycle_type
  FROM public.ce_risk_profiles
 LIMIT 10;
```
