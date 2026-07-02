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

---

## EPIC-04A — Completion Update

Status: **Delivered.**

### Delivered enhancements

1. **Persistent Snapshot Rail** (`src/components/legal/lg/MatterSnapshotRail.tsx`)
   Right-hand sticky rail on `/legal/lg/cases/:id` showing party, financials
   (Total Recoverable / Paid / Outstanding + Recovery %), health, alerts,
   arrangement status, next hearing, next action, open tasks, key documents
   (latest 5 from `lg_document_link`), ownership and last-activity timestamp.

2. **Header financials reuse Workbench service**
   New `getRecoveryWorkbenchRowForCase(caseId)` in
   `src/services/legal/lgRecoveryWorkbenchService.ts` is consumed by both the
   snapshot rail and the new `HeaderFinancialsStrip` in `LgCaseDetail.tsx`.
   The header now shows the same exposure/paid/outstanding/recovery % that
   the Recovery Workbench grid renders, guaranteeing consistency.

3. **IP Context aggregation**
   `src/components/legal/lg/IpContextExtendedPanel.tsx` adds a rendered
   panel under the SSB Context tab with contribution summary
   (`au_ip_wages_ann_sum`), benefit history (`au_cl_head`), overpayments
   (`bn_overpayment`) and prior legal matters (`lg_case` where
   `person_id` matches, excluding the current case). Any missing table is
   surfaced inline as *"Read-model unavailable — table <name> not accessible."*

4. **Unified Communications feed**
   `src/components/legal/lg/UnifiedCommunicationsFeed.tsx` replaces the
   correspondence tab with a filterable grid combining notices, generated
   letters (`core_generated_document` owned by `lg_case`), intake info
   requests, and inbound correspondence, with dispatch status.

5. **Cross-module quick links**
   `src/components/legal/lg/MatterQuickLinks.tsx` provides one-click access
   to Employer, Insured Person, source Compliance / Benefit matter,
   Recovery Workbench (deep-linked by matter number), Documents tab and
   Intake workspace.

6. **Matter Completeness indicator**
   `src/components/legal/lg/MatterCompletenessIndicator.tsx` renders a
   percentage-complete meter and per-item status for party, financials,
   documents, hearing, order, arrangement and audit-trail entries.
   Critical missing items are flagged in red.

7. **Unified Timeline**
   `src/services/legal/lgUnifiedTimelineService.ts` +
   `src/components/legal/lg/UnifiedMatterTimeline.tsx` combine
   `lg_case_referral`, `lg_case_intake`, `lg_case_stage_history`,
   `lg_hearing`, `lg_order`, `lg_payment_arrangement_link`,
   `lg_document_link`, `lg_notice`, `core_generated_document`,
   `lg_settlement`, `lg_case_task` and `lg_case_activity` into one
   chronological, filter-by-kind feed replacing the previous stub Timeline
   tab.

8. **Layout**
   `LgCaseDetail.tsx` now uses a 12-column grid on `lg` breakpoints
   (main 9 cols / rail 3 cols) inside a `max-w-[1600px]` container so
   the workspace and rail coexist without crowding on wide screens.

### Remaining known gaps

- **Contribution weekly detail** — the panel aggregates from
  `au_ip_wages_ann_sum` only. Weekly `au_ip_contribution` drill-down is
  intentionally deferred to keep the panel light; add a "View weekly"
  action only when the ops team requests it.
- **Inbound correspondence store** — the unified comms feed classifies
  inbound based on `lg_notice.delivery_channel LIKE '%INBOUND%'`. A
  dedicated `lg_inbound_correspondence` table is not yet present; when
  introduced, add a fourth source in `UnifiedCommunicationsFeed.tsx`.
- **Waivers** — waivers raised in Compliance are still shown as an empty
  state; awaiting a canonical `ce_waiver` ↔ `lg_case` link.
