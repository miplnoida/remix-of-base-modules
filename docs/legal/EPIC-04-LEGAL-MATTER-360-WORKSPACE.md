# EPIC-04 — 360° Legal Matter Workspace

Business owner: Social Security Board, St. Kitts & Nevis
Delivered on top of EPIC-02 (Recovery Workbench) and EPIC-03A (Intake &
Qualification). No AI, no mock data.

## Canonical route
`/legal/lg/cases/:id` → `src/pages/legal/LgCaseDetail.tsx`

Legacy routes (`/legal/case-view/:id`, `/legal/case/:id`, `/legal/cases/:id`)
already redirect here (see `docs/legal/route-retirement-plan.md`).

Deep-link support: `?tab=<value>` jumps directly to a sub-tab. Accepted
values include `summary`, `parties`, `ssb`, `financial`, `hearings`, `orders`,
`recovery` (alias for `recovery_summary`), `arrangement`, `settlements`,
`documents`, `letters`, `notices`, `tasks`, `timeline`, `activity`,
`assignhist`. Recovery Workbench's "Open Recovery" action uses
`?tab=recovery`.

## Workspace structure

### 1. Matter header
`LegalMatterWorkspaceBanner` (identity, party, status, SLA, counts) +
compact stat strip (source, team/owner, court case, next hearing, opened,
actions, exposure/paid/outstanding).

### 2. Quick-action bar
All buttons render through `LgActionButton` / `useLgAccess` and are
capability-gated. Available: Assign Officer, Reassign, Edit Case, Add
Party, Add Hearing, Record Hearing Outcome, Add Task, Generate Notice,
Upload / Link Document, Add Order, Add Settlement, Link Payment
Arrangement, Close Matter, Print. Actions without a backing service are
hidden (no placeholder buttons).

### 3. Tabs (grouped)

| Group      | Tabs                                                             |
|------------|------------------------------------------------------------------|
| Overview   | Summary · Parties · Intake · Source/Referral · Financial · **SSB Context** |
| Work       | Actions · Tasks · Assignment History                             |
| Litigation | Court Proceedings · Hearings · Orders/Judgments · Appeals · Enforcement |
| Recovery   | Payments/Recovery · Payment Arrangements · Fees · Settlements · Waivers |
| Docs & Comm| Documents · Letters · Notices · Correspondence                   |
| Governance | Legal References · Timeline · History · Activity/Audit           |

New in EPIC-04: **SSB Business Context** tab (`LgCaseSSBContextTab`).

## SSB Business Context — data sources

| Panel                          | Table                                |
|--------------------------------|--------------------------------------|
| Employer master                | `au_er_master`                       |
| Compliance snapshot            | `ce_employer_compliance_status`      |
| Employer financial ledger      | `ce_employer_financial_ledger`       |
| Active arrangements            | `ce_payment_arrangements`            |
| Prior legal matters            | `lg_case`                            |
| Existing court orders          | `lg_order`                           |
| Insured Person (SSN lookup)    | `ip_master` via `lg_case_party.external_ref_id` |

All queries run through the standard Supabase client; empty results render
"Unknown" — never a fabricated value.

## Integration with Recovery Workbench
`LgRecoveryWorkbench` row actions already route to
`/legal/lg/cases/:id` and `/legal/lg/cases/:id?tab=recovery`. The
workspace's deep-link handler consumes the query parameter and jumps to
the Recovery group.

## Permissions
Every mutating button uses `useLgAccess().can(<capability>)`; System
Administrators bypass all checks (see EPIC-03A finalisation).
Route guarding is handled by `LegalRouteGuard` + `legalRouteCapabilities`.

## Audit
Every state change funnels through `logLgActivity()` → `lg_case_activity`.
The Activity/Audit tab renders the chronological timeline.

## Files
- Added: `src/components/legal/lg/LgCaseSSBContextTab.tsx`
- Added: `docs/legal/EPIC-04-LEGAL-MATTER-360-WORKSPACE.md`
- Modified: `src/pages/legal/LgCaseDetail.tsx` — SSB tab registration and
  `?tab=` deep-link handler.

## Known limitations / gaps
1. **Insured-person contribution & benefit history summary** — no
   aggregated read-model exists yet in the Legal module. The SSB Context
   tab shows demographics only and flags the gap inline.
2. **Compliance status columns** — `ce_employer_compliance_status` schema
   varies by tenant; the panel selects `*` and only renders
   `compliance_status` / `risk_band` when present.
3. **Communications tab** currently groups Notices + Letters +
   Correspondence sub-tabs; a unified "Communications" feed is a future
   enhancement once `bn_communication_log` gains a Legal party filter.
4. **Right-hand snapshot panel** is exposed as
   `RecoverySnapshotPanel` inside the Recovery tab; promoting it to a
   sticky right rail is deferred until layout constraints on 1366-px
   laptops are re-evaluated.

## UAT scenarios
1. Open a case that has an employer with active arrears → Employer
   Context, arrangements and prior matters populate; Outstanding Balance
   matches Recovery Workbench for the same employer.
2. Open a case whose party is an Insured Person (SSN on
   `lg_case_party.external_ref_id`) → IP panel resolves name/DOB from
   `ip_master`; contribution summary shows the documented "not yet
   exposed" note.
3. From Recovery Workbench, click "Open Recovery" on any row → workspace
   lands on the Recovery group with the Payments/Recovery sub-tab
   pre-selected.
4. As a `LEGAL_READ_ONLY` user, verify every action button is disabled
   with a permission tooltip; as a `SYSTEMADMIN` / `LEGAL_ADMIN`, verify
   all buttons are enabled.

## Typecheck
`bunx tsgo --noEmit -p tsconfig.app.json` — clean.
