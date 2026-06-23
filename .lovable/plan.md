## Goal

Restructure `LgCaseDetail.tsx` from ~15 flat tabs into a grouped enterprise workspace where the **parent Case is the container** and **child Actions/Liability Items carry the legal work**. Keep every existing feature — only reorganize, enhance the Actions panel, and add a few missing pieces.

## Scope

### 1. Top Case Header (enhanced)
Single header card showing: legal case no · source module + ref · primary party · type · status · stage · team/workbasket · owner · priority · opened date · next hearing · total exposure · total paid · outstanding. Derived from `lg_case` + aggregates over `lg_case_action`.

### 2. Grouped navigation (replace flat tabs)
Two-level: top-level Group tabs, each rendering a sub-tab strip.

```text
Overview      | Summary · Parties · Source/Referral · Financial Snapshot
Work          | Actions (Liability Items) · Tasks · Assignment History
Litigation    | Court Proceedings · Hearings · Orders/Judgments · Enforcement
Recovery      | Payment Arrangements · Fees · Settlements · Waivers
Docs & Comm   | Documents · Letters · Notices · Correspondence
Governance    | Legal References · History · Activity/Audit
```

All existing panels mount inside their group — no logic removed. New thin panels: **Financial Snapshot**, **Assignment History** (reads `lg_case_assignment_history`), **Enforcement** (filtered view of orders/notices marked as enforcement), **Correspondence** (notices + letters merged read-only feed), **Waivers** (placeholder list backed by `ce_waivers` linked to source referral; empty-state when none).

### 3. Actions tab becomes the core
- Row/card list with: Action No · Type · Liability Head · Period · Claimed · Paid · Outstanding · Court Ref · Stage · Status · Next Hearing · Owner · Actions menu.
- Existing "Propose from Dues" for employer cases retained; benefit-case manual builder retained.
- New extended action types accepted: `SS_CONTRIBUTION, SS_PENALTY, HSD_LEVY, HSD_LEVY_PENALTY, SEVERANCE, BENEFIT_OVERPAYMENT, BENEFIT_APPEAL, FRAUD_REVIEW, ESTATE_RECOVERY, ELIGIBILITY_DISPUTE, FINANCE_DEBT, COURT_ACTION, LEGAL_ADVICE, OTHER`.
- Clicking a row opens **Child Action Drawer** (new): summary · liability breakdown · period · court refs · hearings · orders · enforcement · linked documents · linked payment arrangements · linked fees · notes · activity. Drawer queries existing tables filtered by `action_id` (use existing nullable `action_id` columns on `lg_court_proceeding`, `lg_hearing`, `lg_order`, `lg_fee_charge`, `lg_document_link`, `lg_case_action_arrangement`). Add the column where missing via one small migration.

### 4. Court Proceedings, Payment Arrangements, Documents, Letters
- Court proceedings panel: add optional `action_id` filter + link selector. Court numbers remain manual.
- Payment Arrangements panel: keep cross-module behavior; add column showing linked child actions; add "Link to Action" via existing `lg_case_action_arrangement`.
- Documents tab: add "Attach to Action / Hearing / Order / Arrangement" dropdown on upload + link dialogs.
- Letters: seed the 14 named templates into `core_template` if missing (idempotent migration row inserts, skip when slug exists). Generation already routes through dispatcher and DMS.

### 5. Case Completeness panel
New right-rail card on Overview → Summary: checklist (parties · source · child actions · liability captured · documents · court details if filed · arrangement linked if applicable · required letters · next action · open children before close). Pure read computation, no schema change.

### 6. Parent close rule (strengthen existing)
Already blocks on open child actions. Extend guard to also block when: any active payment arrangement is not in terminal state, required orders missing for filed proceedings, no closure reason entered. Closure dialog adds `closure_reason` (write to `lg_case.notes` append + `lg_case_activity`).

## Technical Notes

**Migration (single file):**
- Add nullable `action_id uuid references lg_case_action(id)` to `lg_court_proceeding`, `lg_hearing`, `lg_order`, `lg_fee_charge`, `lg_document_link` where missing.
- Expand `lg_case_action.liability_head_code` accepted values (no enum — it's text; just documented).
- Seed missing `core_template` rows for the 14 letter types (insert ... on conflict do nothing by slug).

**Files to create:**
- `src/components/legal/lg/CaseHeaderBar.tsx`
- `src/components/legal/lg/CaseCompletenessPanel.tsx`
- `src/components/legal/lg/FinancialSnapshotPanel.tsx`
- `src/components/legal/lg/AssignmentHistoryPanel.tsx`
- `src/components/legal/lg/EnforcementPanel.tsx`
- `src/components/legal/lg/CorrespondencePanel.tsx`
- `src/components/legal/lg/WaiversPanel.tsx`
- `src/components/legal/lg/actions/ChildActionDrawer.tsx`
- `src/components/legal/lg/GroupedTabs.tsx` (two-level tab wrapper)

**Files to edit:**
- `src/pages/legal/LgCaseDetail.tsx` — replace tab tree with grouped layout, mount header bar, wire close-guard.
- `src/components/legal/lg/actions/CaseActionsPanel.tsx` — expanded type list, drawer trigger, extra columns.
- `src/components/legal/lg/LegalCasePaymentArrangementsPanel.tsx` — show linked actions, link dialog.
- `src/components/legal/lg/CaseCourtProceedingsTab.tsx` — action filter + link.
- `src/components/legal/lg/LegalCaseDocumentsTab.tsx` + upload/link dialogs — action attach.

**Out of scope:**
- No new auto court-number generator.
- No new payment arrangement engine (reuse `core_payment_arrangement`).
- No template authoring UI changes (seed only).
- No RLS (NO-RLS policy).
- No removal of any existing tab/feature.

## Acceptance
- Two-level grouped tabs render; every previous tab reachable.
- Actions panel shows the new column set and opens the Child Action Drawer.
- Linking proceedings / hearings / orders / docs / arrangements to a child action works and filters in the drawer.
- Header bar shows totals derived from child actions.
- Parent close blocked on open children OR active arrangements OR missing closure reason.
- TypeScript build passes.
