# Legal Case → Child Actions Redesign

Introduce a child-action layer under `lg_case` so an Employer matter holds one action per outstanding liability head (SS / HSD Levy / Severance / Penalties / Court Cost / Legal Fee), while Insured-Person/Benefit matters hold action-type children (Appeal, Overpayment, Fraud, Estate, Eligibility). Court references and payment arrangements live at the child-action level.

## 1. Data model (migration)

New table `public.lg_case_action`:

```text
id                  uuid PK
case_id             uuid FK → lg_case(id) ON DELETE CASCADE
action_kind         text  CHECK (action_kind IN ('LIABILITY','BENEFIT'))
-- Employer / liability-head fields
liability_head_code text  -- SS_CONTRIBUTION, SS_PENALTY, HSD_LEVY_CONTRIBUTION,
                          -- HSD_LEVY_PENALTY, SEVERANCE_CONTRIBUTION,
                          -- SEVERANCE_PENALTY, COURT_COST, LEGAL_FEE
period_from         date
period_to           date
principal_amount    numeric(14,2) default 0
penalty_amount      numeric(14,2) default 0
cost_amount         numeric(14,2) default 0
total_amount        numeric(14,2) default 0
amount_paid         numeric(14,2) default 0
outstanding_amount  numeric(14,2) default 0
-- Benefit / IP fields
benefit_action_type text  -- BENEFIT_APPEAL, OVERPAYMENT_RECOVERY, FRAUD_REVIEW,
                          -- ESTATE_RECOVERY, ELIGIBILITY_DISPUTE
insured_person_id   uuid
claim_id            uuid
benefit_type        text
overpayment_amount  numeric(14,2)
-- Court refs (manual entry)
suit_no             text
judgment_summons_no text
writ_no             text
warrant_no          text
court_id            uuid FK → lg_court(id)
-- Lifecycle
stage               text default 'OPEN'
status              text default 'OPEN' -- OPEN, IN_PROGRESS, SETTLED, CLOSED, WITHDRAWN
closed_at           timestamptz
closed_by           text
notes               text
created_at / updated_at / created_by / updated_by
```

Grants + no RLS (project standard). Indexes on `(case_id)`, `(case_id, liability_head_code)`, `(case_id, status)`.

Link table `public.lg_case_action_arrangement`:

```text
id, action_id FK lg_case_action, arrangement_id FK core_payment_arrangement,
allocated_amount numeric(14,2), created_at
```

Trigger on `lg_case_action` UPDATE: when all sibling actions of a case become `CLOSED`/`WITHDRAWN`, set parent `lg_case.status='CLOSED'`. Block manual parent close while any child is open (enforced in service layer; trigger guards data).

Add columns to `lg_case` if missing: `employer_account_no text`, `total_outstanding numeric(14,2)`. (Confirm during impl — skip if present.)

## 2. Dues ingestion (employer)

New service `src/services/legal/lgActionDuesService.ts`:

- `fetchEmployerOutstanding(employerId)` reads from existing dues sources: `cn_arrears`, `cn_arrears_liab`, `bema_arrears_ledger`, `ce_employer_financial_ledger`. Groups by liability head + period, returns rows with principal/penalty/cost/paid/outstanding.
- Maps source codes → 8 canonical `liability_head_code`s.
- `proposeActionsForCase(caseId)` returns proposed rows where outstanding > 0 (no insert yet).
- `createActionsForCase(caseId, rows)` bulk-inserts after user accept and updates `lg_case.total_outstanding`.

For benefit cases, a parallel `proposeBenefitActions(caseId, ipId, claimId)` simply offers the 5 action-type templates for manual selection.

## 3. Service / hook layer

- `src/services/legal/lgCaseActionService.ts` — CRUD, recordCourtRef, updatePaid (recomputes outstanding), close, reopen.
- `src/services/legal/lgActionArrangementService.ts` — link/unlink action ↔ `core_payment_arrangement`, recompute action `amount_paid` from arrangement installments.
- `src/hooks/legal/useLgCaseActions.ts` — react-query list/create/update for a case.

## 4. UI

`src/pages/legal/LgCaseDetail.tsx` tabs become:
`Overview · Liability Actions · Payment Arrangements · Court Proceedings · Documents · Letters · History`.

For benefit cases the tab is labeled **Case Actions** and shows the benefit columns.

New components in `src/components/legal/lg/actions/`:

- `CaseActionsPanel.tsx` — list of children with per-row buttons: View, Edit, File Court Case, Record Hearing, Record Judgment, Link Payment Arrangement, Close.
- `ProposeActionsDialog.tsx` — fetches dues, shows checklist grouped by head/period with amounts, “Accept selected → create actions”.
- `EditActionDialog.tsx` — edit amounts, periods, court refs.
- `LinkArrangementDialog.tsx` — pick existing or create new `core_payment_arrangement`, allocate amount.
- `CourtProceedingsPanel.tsx` — aggregates `lg_court_proceeding`/`lg_hearing` filtered by `action_id` (add nullable `action_id` column to those tables).
- `PaymentArrangementsPanel.tsx` — lists arrangements linked to any action of the case.

Parent “Close Case” button disabled until all children closed (with tooltip).

## 5. Intake hookup

In `LgCaseCreateWizard.tsx`, after a case is created from an Employer source, automatically open `ProposeActionsDialog` with prefetched dues. For IP/Benefit sources open a simpler picker of the 5 benefit action types.

## 6. Cleanup

- Remove the half-linked seed cases tagged `SEED-` that have no children once new flow lands (one-off `supabase--insert` delete, gated to seeds only).
- TypeScript: regenerated `types.ts` after migration covers the new tables; update imports.

## Out of scope

- No new court-number generator (numbers stay manual).
- No automatic dues refresh job — refresh is on-demand via dialog.
- No changes to template/letter engine.

## Deliverable order

1. Migration (tables + trigger + grants + nullable `action_id` on proceedings/hearings).
2. Services + hooks.
3. UI panels + wizard hookup.
4. Seed cleanup + typecheck.
