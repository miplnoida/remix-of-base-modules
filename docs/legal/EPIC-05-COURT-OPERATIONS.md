# EPIC-05 — Court Operations (Hearings)

Enterprise Hearings & Court Operations platform for the Social Security Board, St. Kitts & Nevis. Hearings are treated as full operational objects — preparation, court, outcome, and recovery follow-up — not calendar appointments.

Builds on EPIC-02 (Recovery), EPIC-03 (Intake) and EPIC-04 (Matter 360). **No AI.** Rule-based automation only.

---

## 1. Modules & Routes

| Screen | Route | Component |
|---|---|---|
| Hearing Workbench | `/legal/lg/hearing-workbench` | `LgHearingWorkbench.tsx` |
| Hearing Workspace | `/legal/lg/hearings/:id` | `LgHearingWorkspace.tsx` |
| Hearing Calendar (legacy view) | `/legal/lg/hearings` | `LgHearingCalendar.tsx` |

Sidebar entry `lg_hearing_workbench` is registered under `lg_sec_hearings`.

---

## 2. Data Model

Base table `lg_hearing` was extended with enterprise columns:
- Identifiers: `hearing_number`, `court_file_number`, `session_number`
- Court context: `court_code`, `division_code`, `venue_code`, `jurisdiction`
- Personnel: `judge_name`, `magistrate_name`, `court_clerk_name`, `officer_code`, `lead_counsel_code`
- Progression: `hearing_stage`, `priority`, `prep_completed`, `documents_ready`, `evidence_status`
- Outcome: `outcome_code`, `outcome_notes`, `judgment_reserved_at`, `judgment_delivered_at`, `minutes`, `next_hearing_date`
- Adjournments: `adjournment_count`, `adjournment_reason`
- Recovery impact: `recovery_impact_amount`, `order_status`

Supporting tables:
| Table | Purpose |
|---|---|
| `lg_hearing_attendee` | Participants and attendance |
| `lg_hearing_evidence` | Evidence, exhibits, statements, submission status |
| `lg_hearing_prep_checklist` | Preparation checklist (mandatory + configurable) |
| `lg_hearing_adjournment` | Full adjournment history with recovery delay |
| `lg_hearing_communication` | Notices, reminders, dispatch tracking |

---

## 3. Workbench

### Summary Cards
Today · This Week · Adjourned · Awaiting Outcome · Judgment Reserved · Orders Pending · Cancelled · Upcoming 30 days

### Grid (27+ columns)
Hearing #, Matter #, Employer/IP, Court, Court File #, Judge/Magistrate, Venue, Type, Stage, Date, Time, Status, Officer, Lead Counsel, Witness Count, Evidence Status, Documents Ready, Next Hearing, Adjournment Count, Outcome, Order Status, Recovery Impact, Priority.

### Smart Filters
All · Today · Tomorrow · This Week · This Month · Adjourned · Awaiting Judgment · Awaiting Order · Documents Missing · High Value Matters · My Hearings · Supervisor View.

Data source: `lgHearingWorkbenchService.listHearingWorkbench()` — live joins over `lg_case`, `lg_court`, `lg_court_venue`, `lg_hearing_evidence` and `lg_case_task`. No mock data.

---

## 4. Hearing Workspace Tabs

1. **Overview** – key attributes read-only.
2. **Court Details** – court, division, judge/magistrate, clerk, venue, jurisdiction, session #, court file #.
3. **Participants** – roles (Legal Officer, Lead/Co-Counsel, Employer Rep, IP, Witnesses, Experts, Court Officer) with attendance flag.
4. **Evidence** – evidence type, exhibit #, witness, submitted/accepted/rejected toggles.
5. **Preparation** – checklist with mandatory items:
   - Matter reviewed
   - Documents uploaded
   - Evidence complete
   - Witness confirmed
   - Notice served
   - Counsel assigned
   - Recovery figures updated
   - Orders reviewed
6. **Outcome** – outcome code, notes, minutes, next hearing date. State-transitions:
   - `COMPLETED` → status `COMPLETED`
   - `ADJOURNED` → status `ADJOURNED` (also captured in adjournments tab)
   - `CANCELLED` → status `CANCELLED`
   - `JUDGMENT_RESERVED` → stamps `judgment_reserved_at`
   - `JUDGMENT_DELIVERED` → stamps `judgment_delivered_at`
7. **Orders** – cross-links to Matter Orders tab and Court Orders management.
8. **Adjournments** – full log with number, reason code/notes, next date, recovery delay days. Auto-updates `lg_hearing.status`, `next_hearing_date`, and the trigger creates a follow-up task via `lg_case_task` (source_type = `HEARING_ADJOURNMENT`).
9. **Communications** – notice/reminder tracking with dispatch state.
10. **Tasks** – rule-generated tasks linked to the hearing.
11. **Audit** – reads `lg_case_activity` scoped to `entity_type = HEARING`.

---

## 5. Court Lifecycle

```
SCHEDULED → (prep complete) → SCHEDULED (ready)
          → ADJOURNED (n times) → SCHEDULED (next date)
          → COMPLETED → outcome
                       ├── ORDER_ISSUED     → notifies Recovery
                       ├── JUDGMENT_RESERVED → reminder task
                       ├── JUDGMENT_DELIVERED
                       ├── SETTLEMENT
                       ├── WITHDRAWN | DISMISSED | TRANSFERRED
          → CANCELLED
          → NO_SHOW
```

---

## 6. Preparation Checklist Rules

- Default set is seeded on first workspace open via `ensureDefaultChecklist(hearingId)`.
- Mandatory items must all be `completed = true` before the hearing can be marked `documents_ready`.
- Marking the last mandatory item flips `lg_hearing.prep_completed = true` and `documents_ready = true`.
- Items are configurable per organisation by inserting extra rows with `mandatory = false`.

---

## 7. Outcome Rules

| Outcome | Side effects |
|---|---|
| COMPLETED | status → COMPLETED |
| ADJOURNED | status → ADJOURNED, follow-up task (via adjournment record) |
| ORDER_ISSUED | Recovery notification (task via `source_type=HEARING_ORDER`) |
| JUDGMENT_RESERVED | `judgment_reserved_at` stamped, reminder task |
| JUDGMENT_DELIVERED | `judgment_delivered_at` stamped |
| WITHDRAWN / DISMISSED / SETTLEMENT / TRANSFERRED | terminal outcome |
| CANCELLED | status → CANCELLED |

---

## 8. Adjournment Rules

- Adjournment # auto-increments per hearing.
- Reason code + reason notes required for audit.
- If `recovery_delay_days` > 0, it is applied to recovery reporting via `lgRecoveryWorkbenchService`.
- Rolling adjournment count (`adjournment_count`) is maintained on `lg_hearing`.
- ≥3 adjournments raises a **conflict/warning** in the workbench summary.

---

## 9. Task Automation (Rule-Based)

| Trigger | Task |
|---|---|
| Outcome = ADJOURNED | Follow-up task with next hearing date |
| Outcome = ORDER_ISSUED | Recovery notification |
| Outcome = JUDGMENT_RESERVED | Reminder task |
| Documents missing on `hearing_date - 3 days` | Preparation task |

All tasks are stored in `lg_case_task` with `source_type ∈ { HEARING_ADJOURNMENT, HEARING_ORDER, HEARING_REMINDER, HEARING_DOCS }` and `source_id = lg_hearing.id`.

---

## 10. Calendar

Day / Week / Month / Agenda views by Officer, Court, Judge, or Matter — via existing `LgHearingCalendar`.
Drag-drop optional (uses current calendar framework capabilities).

---

## 11. Conflict Checking

`detectConflicts()` warns (never blocks) on:
- Officer double-booking on same date/time.
- Court double-booking.
- Duplicate hearing for the same matter on same date.
- Same-witness conflict (via `lg_hearing_attendee` intersection).

---

## 12. Management KPIs

Exposed by `summarize()` and Recovery Workbench aggregates:
- Average adjournments per matter
- Hearings completed / cancelled
- Average hearing duration
- Orders issued
- Judgments reserved
- Average time to judgment
- Average time to recovery
- Hearings by Court / Judge / Officer

---

## 13. Communications

Types: `COURT_NOTICE`, `HEARING_NOTICE`, `REMINDER`, `ATTENDANCE_CONFIRMATION`, `INTERNAL`.
Channels: `EMAIL`, `SMS`, `LETTER`, `PORTAL`.
Dispatch status: `PENDING → DISPATCHED` with `dispatched_at`.

---

## 14. Cross-Module Navigation

Workspace header offers direct links to:
- Matter Workspace (EPIC-04)
- Recovery Workbench (EPIC-02)
- Matter Documents tab
- Court Orders Management
- Employer / Insured Person context (through matter workspace)

---

## 15. Known Gaps

- Drag-drop calendar rescheduling is deferred until a UX pass.
- Court order linkage is currently navigational; two-way binding (order.hearing_id) is planned in EPIC-06.
- Witness scheduling conflicts across matters run in-memory; extract to a materialised view once volume grows.
- Attachments on `lg_hearing_evidence` reuse `lg_case_document` — dedicated evidence-file storage is future work.

---

## 16. UAT Scenarios

1. **Prep Gate** – Open a scheduled hearing, complete every mandatory checklist item, verify `documents_ready` badge turns green in the workbench.
2. **Adjournment Flow** – Record an adjournment with next date; workbench `Adjournment Count` increments and a follow-up task appears in the Tasks tab.
3. **Judgment Reserved** – Set outcome; `judgment_reserved_at` stamped and hearing surfaces in the "Awaiting Judgment" segment.
4. **Order Issued** – Set outcome; matter's Orders tab reflects the linked order (manual entry acceptable pending EPIC-06).
5. **Conflict Warning** – Schedule two hearings for the same officer at the same time; workspace shows the conflict banner.
6. **Communications** – Add a hearing notice, dispatch it, verify status transition and audit entry.
7. **Cross-Module** – From workspace navigate to Matter → Recovery → back; state preserved.
8. **Filters** – Verify each smart filter returns the expected subset with no mock data.

---

## EPIC-05A – Stabilization & Enterprise UX Addendum

### Root cause: "Failed to load hearings"
`lgHearingWorkbenchService.listHearingWorkbench` selected two columns on the joined `lg_case`
relation — `primary_entity_ref` and `financial_amount_outstanding` — that do not exist in the
current `lg_case` schema. PostgREST rejected the entire query with a 400, which the UI
surfaced as a generic "Failed to load hearings" banner. Fix: removed both columns from the
select list; recovery amount now comes from `lg_hearing.recovery_impact_amount` (already
maintained by the outcome workflow) and the primary party is displayed from
`lg_case.primary_entity_id`. `getHearing()` was patched identically.

### Readiness rules (rule-based)
Each hearing is evaluated against 8 checks; each check contributes 12.5% to the score.

| Code | Rule |
|---|---|
| MATTER_REVIEWED | `lg_case_no` present (matter linked) |
| DOCS_COMPLETE | `documents_ready = true` |
| EVIDENCE_READY | evidence rows exist and all `submitted = true`, or `evidence_status = READY` |
| WITNESSES_CONFIRMED | `witness_count > 0` |
| COUNSEL_ASSIGNED | `lead_counsel_code` set |
| RECOVERY_UPDATED | `recovery_impact_amount is not null` |
| ORDERS_REVIEWED | `order_status ≠ PENDING` |
| TASKS_COMPLETE | zero open prep tasks |

Levels: **Ready** ≥ 90%, **Nearly Ready** ≥ 60%, otherwise **Not Ready**.

### Recovery-Impact rules (rule-based)
| Signal | Impact | Reason |
|---|---|---|
| Cancelled / No-show | Critical | Recovery halted |
| Judgment delivered / Order issued | Positive | Enables enforcement |
| Adjourned AND amount ≥ 50,000 XCD | Critical | High-value delay |
| Adjourned | Delayed | Adjournment delayed recovery |
| Judgment reserved | Delayed | Recovery pending judgment |
| Otherwise | Neutral | No recovery change |

### Court Session grouping
`groupIntoSessions()` clusters hearings by **Court · Judge · Date · Session**, where session
is derived from `hearing_time` (`< 12:00` → Morning, otherwise Afternoon; missing time →
Full Day). Consumers render the sessions in the Calendar view.

### Hearing Pack
`lgHearingPackService.buildHearingPack()` aggregates matter, party, financial, evidence,
attendees, previous hearings, orders, adjournments, checklist and tasks from existing
tables (no new persistence). `renderHearingPackHtml()` produces a single printable
HTML document; helpers `printHearingPack` (opens print dialog → PDF via browser) and
`downloadHearingPackWord` (`.doc` Blob) provide the export options.

### Conflict-detection rules
- **OFFICER_DOUBLE_BOOKING** – another hearing on the same date/time for the same `officer_code`.
- **COURT_DOUBLE_BOOKING** – another hearing on the same date/time for the same `court_code`.
- **MATTER_DUPLICATE** – same matter (`lg_case_id`) already scheduled that day.
Warnings are surfaced non-blocking in the Workspace.

### Enterprise UX changes
- New `LgLoadingState`, `LgEmptyState`, `LgErrorState` (with technical-details collapse,
  network / permission / backend classification) — no raw errors are shown to end users.
- Sticky KPI row (12 management KPIs) and sticky smart-filter chips.
- Persisted user filters via `localStorage["lg.hearing.workbench.filters.v2"]`.
- Refresh button + last-refreshed timestamp powered by React Query `dataUpdatedAt`.
- Grid extended with **Readiness** and **Recovery Impact** columns and popover breakdowns.
- Row action menu now includes permission-aware **Generate Hearing Pack**, **Download Pack (Word)**,
  **Open Matter**, **View Recovery**, and **Record Outcome**.

### Known limitations
- Judge and witness double-booking detection currently uses officer/court fields only.
  Judge-level conflict requires a canonical judge dimension; witness conflict requires an
  organisation-wide witness registry — both are out of scope for this Epic.
- "Average Time to Judgment" / "Average Time to Enforcement" KPIs will surface as `—`
  until enough hearings carry `judgment_delivered_at` and downstream enforcement dates.
- Calendar view improvements (multi-view, jump-to-date, print agenda) reuse the existing
  `LgHearingCalendar.tsx`; deeper redesign deferred to a follow-up UX epic.


---

## EPIC-06A.2 Retrofit — Applied

Recoverable-liability rollups from `lg_recoverable_liability` are now consumed by this workspace. See [EPIC-06A.2 — Liability Retrofit](./EPIC-06A.2-LIABILITY-RETROFIT.md) for scope, fallbacks and acceptance results.

---

## EPIC-06B.1 addendum — Judicial integration

See `docs/legal/EPIC-06B-JUDICIAL-ORDERS-APPEALS-ENFORCEMENT.md` for the full
lifecycle. Key touchpoints from this EPIC:

- Matter Workspace Appeals and Enforcement tabs now render
  `CaseAppealsTab` / `CaseEnforcementTab` (EPIC-06B components).
- Court Operations `HearingOutcomeDialog` offers a **Draft Order** shortcut
  when the outcome implies an order or judgment, carrying case, hearing, and
  court context to `/legal/lg/orders`.
- Recovery Workbench liability drawers expose order / appeal / enforcement
  status via the EPIC-06A junctions.
- Rule-based tasks (compliance, breach review, appeal deadline, enforcement
  prep, payment monitoring) are created by
  `src/services/legal/lgJudicialTaskAutomation.ts` and audit-logged as
  `AUTO_TASK_CREATED`.
- Document/notice actions are gated by `core_template` presence — missing
  templates render disabled with "Template not configured".
