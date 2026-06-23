
## Goal
Replace the empty "Financial Snapshot" with an intelligent, source-aware panel that pulls real employer dues, surfaces them even before any child action exists, and links the rest of the legal workflow (actions, arrangements, court, costs) into one cohesive view.

## Scope
Frontend-heavy. Two small DB additions only. No RLS.

## 1. Database (one small migration)

Add to `lg_case_action` (only if missing):
- `cost_amount numeric default 0`
- `court_reference_no text`
- `action_category text` (LIABILITY / BENEFIT / COURT / ADVICE / OTHER) — derive default from `liability_head_code`/`benefit_action_type`

Add to `lg_payment_arrangement_link`:
- `liability_head_code text`
- `arranged_amount numeric`
- `paid_amount numeric`
- `outstanding_amount numeric`

No new tables.

## 2. Services

**`lgActionDuesService.ts`** — extend:
- `fetchEmployerOutstanding(employerId, payerCode?)` already returns SS / HSD_LEVY / SEVERANCE principal + penalty rows. Add: aggregate paid_after_referral from `cn_payment` (filtered by referral date on `lg_case`).
- New: `fetchEmployerDuesSummary(caseData)` → returns `{ byHead: {SS,LV,PE}: {principal, penalty, paid, outstanding}, totals, sourceRows }` for the Source Dues snapshot card.

**`lgCaseActionService.ts`** — extend types with `cost_amount`, `court_reference_no`, `action_category`. Add helpers: `summarizeActions(actions)` returning principal/penalty/cost/paid/outstanding totals (Legal Action Snapshot).

**`lgPaymentArrangementService.ts`** — add `summarizeRecoveryForCase(caseId)` → totals from arrangements + linked payments.

**`lgFeeChargeService.ts`** — add `summarizeCourtCostsForCase(caseId)` → court filing/legal/judgment/enforcement fee totals.

## 3. New UI component: `FinancialSnapshotPanel.tsx`

Replaces the placeholder card on `LgCaseDetail`. Four collapsible sections:

```text
A. Source Dues Snapshot      (read-only, from BEMA / cn_arrears_liab)
   SS | LV/HSD | PE/SEV  → Principal | Penalty | Outstanding
   CTA: "Propose Actions from Dues" (employer only)

B. Legal Action Snapshot     (from confirmed child actions)
   per head: Principal | Penalty | Cost | Paid | Outstanding | Total

C. Recovery Snapshot         (payment arrangements + receipts)
   Arranged | Paid | Outstanding | # active arrangements

D. Court / Legal Cost Snapshot (from lg_fee_charge)
   Filing | Legal | Judgment | Enforcement | Total
```

Empty-state messages:
- Employer, no actions but dues exist → "Pending dues found. Review and create legal actions." + Propose CTA.
- Employer, no dues found → "No dues found in arrears tables. Add manual action if needed."
- Benefit/Insured → hide Section A, show benefit-action guidance.

## 4. Actions tab updates (`CaseActionsPanel.tsx`)

- Rename to "Liability / Benefit Actions".
- Group rows into **Proposed | Active | Closed** sections.
- "Propose from Dues" dialog already exists — extend it to:
  - Pre-tick rows with outstanding > 0
  - Allow edit of period_from/period_to + amounts
  - Allow merge (combine selected same-head rows) and split (period halving) before confirm
- Confirmation dialog shows source amount, period, head, principal, penalty, outstanding, source table — exactly the fields the user listed.
- New "Bulk close" only when all linked balances cleared.

## 5. Arrangement & court linkage

- In arrangement create/edit drawer: required selector "Apply to child actions" (multi-select), writes one `lg_payment_arrangement_link` row per action with `liability_head_code`, `arranged_amount` (split pro-rata or manual).
- In court proceeding form: optional `legal_action_id` selector + free-text court numbers (Suit No, Judgment Summons, Writ, Commitment/Warrant) stored on the proceeding's existing free fields (or `lg_case_action.court_reference_no` when linked).

## 6. Validation hooks

Extend `useLgWorkflow` / stage-transition guard:
- Block move to "Court Filing" if no active child action OR no party OR action totals = 0.
- Block parent close if any child action status ∉ {CLOSED, SETTLED, WITHDRAWN, WRITTEN_OFF, RESOLVED}.

## 7. Files touched

Create:
- `src/components/legal/lg/financial/FinancialSnapshotPanel.tsx`
- `src/components/legal/lg/financial/SourceDuesCard.tsx`
- `src/components/legal/lg/financial/LegalActionSummaryCard.tsx`
- `src/components/legal/lg/financial/RecoverySummaryCard.tsx`
- `src/components/legal/lg/financial/CourtCostSummaryCard.tsx`
- `supabase/migrations/<ts>_lg_action_financial_fields.sql`

Edit:
- `src/services/legal/lgActionDuesService.ts` (+summary)
- `src/services/legal/lgCaseActionService.ts` (+fields, +summarizeActions)
- `src/services/legal/lgPaymentArrangementService.ts` (+summarizeRecoveryForCase)
- `src/services/legal/lgFeeChargeService.ts` (+summarizeCourtCostsForCase)
- `src/components/legal/lg/actions/CaseActionsPanel.tsx` (group + confirm dialog)
- `src/pages/legal/LgCaseDetail.tsx` (mount FinancialSnapshotPanel; remove placeholder)
- `src/integrations/supabase/types.ts` (regenerated after migration)

## 8. Acceptance

- Opening any employer case with dues immediately shows Section A populated (no "No actions yet" deadlock).
- "Propose Actions from Dues" creates one draft per head with outstanding > 0; confirm dialog shows the full field list; on confirm Section B totals appear.
- SS, LV/HSD, PE/SEV remain separate columns/rows throughout.
- Benefit cases hide Section A and show benefit-action workflow.
- Arrangement linked to a child action contributes to Section C.
- Court fees contribute to Section D.
- Parent case cannot move to Court Filing without an active child action; cannot close while any child is open.
- TypeScript build passes.
