## Goal

Reset Legal module data, then seed a **realistic, fully integrated** dataset so every Legal screen has meaningful content and every button has something to act on. Data must reference real employers (`er_master`), compliance cases (`ce_cases`), legal officers (`profiles` with `CI-*` codes), and `core_reference_value` codes already loaded for `LEGAL` module.

Audit / SEED tagging: every row marked `created_by = 'SEED'` and `lg_case_no` prefixed `SEED-LG-...` so cleanup is easy and rows are identifiable.

---

## Step 1 — Wipe (migration, single transaction)

Delete in FK-safe order from all 17 `lg_*` tables:

```
lg_hearing_attendee, lg_document_link, lg_payment_arrangement_link,
lg_fee_charge, lg_order, lg_settlement, lg_notice, lg_case_task,
lg_hearing, lg_case_calendar_event, lg_case_deadline, lg_case_note,
lg_case_activity, lg_case_stage_history, lg_case_assignment,
lg_case_referral, lg_case_party, lg_case
```

Also clear legacy mirror tables (`legal_cases`, `legal_hearings`, `legal_orders`, `legal_settlements`, `legal_parties`, `legal_tasks`, `legal_documents`, `legal_penalties`, `legal_timeline_events`) — all currently 0 but truncate to keep them clean.

---

## Step 2 — Seed 10 anchor cases (covers every stage + status)

Each case linked to a real `er_master.regno` employer and (when relevant) a `ce_cases.id`. Officer assigned from `profiles` (`CI-01` Vincent Sutton, `CI-02` Dexter Richardson, etc.).

| # | lg_case_no | Type | Stage | Status | Anchor |
|---|---|---|---|---|---|
| 1 | SEED-LG-2026-0001 | NON_COMPLIANCE | REFERRAL_RECEIVED | OPEN | Sigrid Ziemann (regno 000003) |
| 2 | SEED-LG-2026-0002 | RECOVERY | DEMAND_NOTICE | IN_PROGRESS | next employer |
| 3 | SEED-LG-2026-0003 | NON_COMPLIANCE | SETTLEMENT_NEGOTIATION | IN_PROGRESS | + settlement |
| 4 | SEED-LG-2026-0004 | PROSECUTION | COURT_FILING | IN_PROGRESS | court_case_no set |
| 5 | SEED-LG-2026-0005 | RECOVERY | HEARING | IN_PROGRESS | 2 hearings (past + upcoming) |
| 6 | SEED-LG-2026-0006 | PROSECUTION | JUDGMENT | IN_PROGRESS | judgment order + fee |
| 7 | SEED-LG-2026-0007 | RECOVERY | ENFORCEMENT | IN_PROGRESS | garnishee order + arrangement |
| 8 | SEED-LG-2026-0008 | NON_COMPLIANCE | CLOSED | SETTLED | settled + arrangement linked |
| 9 | SEED-LG-2026-0009 | APPEAL | LEGAL_REVIEW | PENDING_REVIEW | appeal flow |
| 10 | SEED-LG-2026-0010 | FRAUD | CLOSED | WITHDRAWN | closed/withdrawn |

For each case insert child rows so every tab on `LgCaseDetail` is non-empty:

- **lg_case_party** — Plaintiff (Social Security Board) + Defendant (employer/individual). 2-4 per case.
- **lg_case_assignment** — current officer row + 1 historical reassignment for cases 5,7.
- **lg_case_stage_history** — full progression from REFERRAL_RECEIVED → current stage.
- **lg_case_activity** — 3-6 timeline entries per case (referral received, officer assigned, notice issued, hearing scheduled, etc.).
- **lg_case_note** — 1-2 internal notes per case.
- **lg_case_deadline** — response/filing/hearing-prep deadlines, mix of pending and met.
- **lg_case_task** — 2-3 tasks per case across OPEN/IN_PROGRESS/COMPLETED with assigned_to and due_date.
- **lg_hearing** — for cases 4-7,9: 1 past hearing (status COMPLETED, outcome ADJOURNED/HEARD) + 1 upcoming (SCHEDULED). Includes `lg_hearing_attendee` rows.
- **lg_case_calendar_event** — synced for upcoming hearings.
- **lg_notice** — 1-3 per case across DRAFT/ISSUED/SERVED/ACKNOWLEDGED, typed appropriately (DEMAND for case 2, COURT_FILING_COVER for 4, HEARING for 5, JUDGMENT for 6, ENFORCEMENT for 7).
- **lg_order** — judgment order on case 6, garnishee on case 7, consent on case 8.
- **lg_settlement** — proposed on case 3 (PROPOSED), accepted on case 8 (ACCEPTED + payment_arrangement_id).
- **lg_payment_arrangement_link** — link cases 7 & 8 to a synthetic arrangement uuid (recorded for display; downstream Payments arrangement may be null but link row exists).
- **lg_fee_charge** — court filing fee, service fee, legal cost per active case; mix of PENDING and POSTED `posting_status`.
- **lg_document_link** — 2-3 per case across categories REFERRAL_PACK, EVIDENCE, COURT_FILING, ORDER, NOTICE; some linked to hearing/order/settlement so cross-tab navigation works.
- **lg_case_referral** — origin row for cases sourced from Compliance (1,2,3,7).

---

## Step 3 — Cross-module integration

- For cases anchored to compliance, set `lg_case.compliance_case_id` to a real `ce_cases.id` (or NULL if none exist; query first and degrade gracefully).
- Set `employer_id` to `NULL` (UUID type — `er_master` uses string `regno`). Store regno + name in `lg_case_party.display_name` + `contact_info` jsonb so the UI shows the right employer everywhere.
- `assigned_legal_officer_id` left NULL (UUID, profiles keyed by `user_code`); officer name surfaced via `lg_case_assignment.assigned_to_user_id` (also NULL) but `assigned_to_name`/notes carries the user_code. Verify schema; if `lg_case_assignment` carries only uuid, store officer `user_code` in a note column / fallback to display through `assigned_team_code`.
- `next_hearing_date` & `next_action_due_date` on `lg_case` set from the earliest upcoming hearing/deadline so dashboards and lists show correct "next action" data. (Triggers may auto-sync — verify and avoid double-setting.)

---

## Step 4 — Code touch-ups (only where required to make seeded data usable)

Most screens already query `lg_*` tables (Phase 1+2 work). Verify each screen renders cleanly against seeded data and patch only if broken:

1. `LgDashboard` — counts by status/stage, upcoming hearings, overdue deadlines.
2. `LgCaseList` — filters by status/stage/type/priority show non-zero buckets.
3. `LgCaseDetail` — every tab has at least one row for at least one seeded case.
4. `LgHearingCalendar` — upcoming hearings visible across next 60 days.
5. Legacy screens (`CourtOrdersManagement`, `EnforcementActions`, `LegalPaymentPlans`, `EvidenceManagement`, `NoticeGeneration`, `CaseTracking`) — pull from `lg_*` via `lgRegistryService`; confirm rendering, fix column-mapping bugs only.
6. Sidebar — ensure `/legal/lg/*` entries exist; remove dead links to legacy paths if any 404.

No new tables, no schema changes (schema is already complete from prior phases). Only `INSERT` / `DELETE` via the migration tool.

---

## Step 5 — Audit + verification

- Every seed insert sets `created_by='SEED'`.
- After seed, run row-count assertions:
  - `lg_case = 10`
  - `lg_hearing >= 8`, `lg_notice >= 15`, `lg_case_task >= 25`, `lg_order >= 3`, `lg_settlement >= 2`, `lg_fee_charge >= 12`, `lg_document_link >= 25`, `lg_case_party >= 20`, `lg_case_stage_history >= 30`.
- Spot-check `LgDashboard`, `LgCaseList`, `LgCaseDetail` (case 5 — has hearings + tasks + notices + fees + documents), `LgHearingCalendar`.
- TypeScript build must pass.

---

## Out of scope

- New tables, RLS, or schema migrations.
- Touching `er_master` / `ce_cases` data.
- Wiring Legal into Payments arrangements end-to-end (link rows exist, but no real `payment_arrangement_id` UUID is enforced).
- Removing SSB* legacy Legal screens.

## Technical notes

- Single migration: `DELETE` → `INSERT` for all 17 tables in one transaction; uses CTEs to capture generated `lg_case.id` UUIDs and reuse them for child rows.
- `core_reference_value` codes are already loaded — seed uses the verified codes shown above (CASE_TYPE, CASE_STAGE, CASE_STATUS, PARTY_ROLE, PARTY_TYPE, HEARING_TYPE, HEARING_OUTCOME, NOTICE_TYPE/STATUS, ORDER_TYPE, TASK_TYPE, PRIORITY, CLOSURE_REASON, DEADLINE_TYPE, DELIVERY_STATUS, DOCUMENT_CATEGORY).
- Triggers `lg_sync_case_next_hearing` and `lg_hearing_workflow` will fire on hearing inserts — confirm they don't fail on seed data (likely just compute `next_hearing_date`).