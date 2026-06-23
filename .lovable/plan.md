
# Legal Case Architecture — Source-Aware & Intelligently Templated

The parent **Legal Case** is a thin container. The real legal work lives in **Child Actions** (one per liability head, benefit issue, advisory question, or court matter). Both the *creation flow* and the *child actions catalog* must adapt to **where the case came from** and **who the respondent is** (Employer vs Insured Person vs Internal).

---

## 1. Six Case Sources — all first-class

| # | Source | Origin | Respondent | Pre-filled data |
|---|--------|--------|------------|-----------------|
| 1 | `COMPLIANCE_REFERRAL` | Compliance module hand-off | Employer | Employer, arrears ledger, violation list, inspector notes |
| 2 | `BENEFIT_REFERRAL` | Benefit Management hand-off | Insured Person | Member, claim no, overpayment ledger, decision letter |
| 3 | `MANUAL_EMPLOYER` | Legal officer starts manually | Employer | Employer picker; dues fetched on demand |
| 4 | `MANUAL_INSURED` | Legal officer starts manually | Insured Person | Member picker; benefit history fetched on demand |
| 5 | `COURT_FILED` | Case already filed in court (external) | Either | Court ref, filing date, court party; dues snapshotted |
| 6 | `INTERNAL_ADVISORY` | Internal opinion / contract / policy | None (internal subject) | Subject, requesting dept, free-form |

`LEGACY` becomes a **flag** (`is_legacy=true`) on any of the six sources — not a separate source.

---

## 2. Child Action Catalog — driven by Source + Party

The "Propose Actions" step picks from a **catalog filtered by source**. No more one-size list.

### A. Employer cases (`COMPLIANCE_REFERRAL`, `MANUAL_EMPLOYER`)
Sub-actions are generated from real financial heads in `bema_arrears_ledger` + `cn_arrears_liab`:
- `SS_CONTRIBUTION` — Social Security contributions arrears
- `SS_PENALTY` — Penalty on SS arrears
- `SS_INTEREST` — Interest on SS arrears
- `HSD_LEVY` — Housing/Severance/Development levy
- `HSD_LEVY_PENALTY` — Penalty on HSD levy
- `SEVERANCE_FUND` — Severance fund contributions
- `EMPLOYMENT_INJURY_LEVY` — EI levy arrears
- `RETURNS_NON_FILING` — Non-submission of monthly returns
- `REGISTRATION_DEFAULT` — Failure to register employees
- `RECORDS_INSPECTION_REFUSAL` — Obstruction of inspector
- `COURT_RECOVERY_ACTION` — Civil suit for combined dues
- `CRIMINAL_PROSECUTION` — Where statute allows

Each row carries: liability head, period from/to, claimed, paid, outstanding, penalty rate, evidence doc, court ref (if any), assigned officer.

### B. Insured Person cases (`BENEFIT_REFERRAL`, `MANUAL_INSURED`)
- `BENEFIT_OVERPAYMENT_RECOVERY` — Sickness/Maternity/Invalidity/Pension/Funeral overpayment
- `BENEFIT_DENIAL_APPEAL` — Member appeals denied claim
- `ELIGIBILITY_DISPUTE` — Contributory eligibility challenge
- `BENEFIT_FRAUD_REVIEW` — Suspected fraudulent claim
- `MEDICAL_BOARD_REFERRAL` — Disability/Invalidity re-assessment
- `ESTATE_RECOVERY` — Recovery from deceased member estate
- `THIRD_PARTY_RECOVERY` — Subrogation against tortfeasor (EI cases)
- `TRIBUNAL_APPEAL` — External tribunal escalation

### C. Court-filed cases (`COURT_FILED`)
Inherits A or B depending on respondent, plus mandatory `COURT_ACTION` child carrying court name, case no, judge, filing date.

### D. Internal Advisory (`INTERNAL_ADVISORY`)
- `LEGAL_OPINION` — Written opinion on a question of law
- `CONTRACT_REVIEW` — Vendor/MoU/lease review
- `POLICY_INTERPRETATION` — Interpretation of Act/Regulation
- `LITIGATION_RISK_REVIEW` — Pre-litigation risk note
- `REGULATORY_DRAFTING` — Draft regulation/circular
No financial heads, no court ref required.

---

## 3. Source-Aware Case Creation Wizard

Step 1 — **Source** (6 cards instead of 5; add Benefit Referral)
Step 2 — **Details** (fields shown depend on source):
- Employer sources → employer picker, account no, exposure auto-loaded
- Insured sources → member picker, NIS no, last benefit period
- Court-filed → court picker, case no, filing date, judge
- Internal → subject, requesting dept, urgency
Step 3 — **Parties** (auto-seeded; respondent locked for referrals)
Step 4 — **Propose Child Actions** (NEW step inserted before Review):
- Employer referral → checklist of liability heads with amounts pre-ticked from ledger
- Benefit referral → checklist of benefit actions pre-ticked from overpayment/appeal record
- Manual → empty catalog, user adds rows
- Internal → single advisory action with subject pre-filled
Step 5 — **References** (statutes/regs, optional)
Step 6 — **Review** — shows parent case + every child action with totals

Parent case `total_outstanding` = `SUM(child_action.outstanding)`.

---

## 4. Database Changes

```sql
-- 1. Extend source enum
ALTER TYPE lg_case_source_mode ADD VALUE IF NOT EXISTS 'BENEFIT_REFERRAL';
ALTER TYPE lg_case_source_mode ADD VALUE IF NOT EXISTS 'MANUAL_INSURED';
ALTER TYPE lg_case_source_mode ADD VALUE IF NOT EXISTS 'COURT_FILED';
ALTER TYPE lg_case_source_mode ADD VALUE IF NOT EXISTS 'INTERNAL_ADVISORY';

-- 2. Child action catalog (config table, not hardcoded)
CREATE TABLE public.lg_case_action_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_mode text NOT NULL,           -- which sources can use this
  party_kind text NOT NULL,            -- EMPLOYER | INSURED | INTERNAL | ANY
  action_code text NOT NULL,           -- SS_CONTRIBUTION, BENEFIT_OVERPAYMENT_RECOVERY...
  action_label text NOT NULL,
  category text NOT NULL,              -- FINANCIAL | ENFORCEMENT | APPEAL | ADVISORY | COURT
  requires_period boolean DEFAULT false,
  requires_amount boolean DEFAULT false,
  requires_court_ref boolean DEFAULT false,
  default_owner_role text,             -- routes the action to the right desk
  display_order int DEFAULT 100,
  is_active boolean DEFAULT true,
  UNIQUE(source_mode, action_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_case_action_catalog TO authenticated;
GRANT ALL ON public.lg_case_action_catalog TO service_role;
ALTER TABLE public.lg_case_action_catalog ENABLE ROW LEVEL SECURITY;
-- (Policies follow existing legal admin pattern)

-- Seed all entries from §2 above

-- 3. Add source-aware columns
ALTER TABLE public.lg_case ADD COLUMN IF NOT EXISTS respondent_kind text;  -- EMPLOYER|INSURED|INTERNAL
ALTER TABLE public.lg_case_action ADD COLUMN IF NOT EXISTS catalog_code text;
ALTER TABLE public.lg_case_action ADD COLUMN IF NOT EXISTS category text;
```

No RLS toggles on existing tables. Existing `lg_case_action` table from prior migration is reused.

---

## 5. Service & UI Files

**New / Edit**
- `src/services/legal/lgActionCatalogService.ts` — fetch catalog filtered by source+party
- `src/services/legal/lgActionDuesService.ts` — extend to also pull benefit overpayments from `bn_*` tables for insured sources
- `src/services/legal/lgBenefitDuesService.ts` (new) — benefit-side proposals
- `src/pages/legal/LgCaseCreateWizard.tsx` — add Benefit Referral card, Manual Insured card; insert "Propose Actions" step; conditional field rendering per source
- `src/components/legal/lg/actions/CaseActionsPanel.tsx` — reads from catalog; "Add Action" dialog shows only valid actions for case source+party
- `src/components/legal/lg/actions/ProposeActionsStep.tsx` (new) — wizard step with source-specific proposal logic
- `src/services/legal/lgCaseCreateService.ts` — accept `child_actions[]` array and create them atomically with parent

**Admin**
- `src/pages/legal/admin/LgActionCatalogAdmin.tsx` (new) — manage catalog rows so Legal admins can add/disable action types without code changes

---

## 6. Acceptance

- Wizard Step 1 shows **6 source cards** matching the user's list
- Choosing source rewrites Step 2 fields and Step 4 proposed actions intelligently
- Employer referral auto-proposes SS/HSD/levy/penalty/severance lines from real ledger
- Benefit referral auto-proposes overpayment / appeal / fraud actions from benefit records
- Manual cases start empty and let officer add catalog actions
- Internal Advisory hides all financial/court fields and proposes advisory actions only
- Catalog is DB-driven (admin can extend without code)
- Parent `total_outstanding` aggregates from child actions; parent cannot close while any child is open
- TypeScript build passes; no RLS added
