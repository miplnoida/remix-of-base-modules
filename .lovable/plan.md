
# Legal Department IA Refactor — Audit & Proposed Architecture

This is a **read-only proposal**. No routes, tables, permissions, or APIs will be removed. Implementation begins only after you approve the navigation tree and the screen-to-IA mapping below.

---

## 1. Current Menu Inventory (what exists today)

Five overlapping menu sources currently feed the Legal sidebar:

| Source file | Items | Status |
|---|---|---|
| `ssbLegalMenuItems.ts` | Dashboard, Cases, Hearing Calendar, Orders, Documents, Reports, Admin | Active (SSB build) |
| `legalManagementMenuItems.ts` | Full alternate tree (Cases, Hearings, Orders, Enforcement, Payment Plans, 6 Reports, 6 Settings) | Active, duplicates above |
| DB `app_modules` (Legal Admin) | ~14 admin entries incl. Matter Workspace Integrity (added last turn) | Active |
| `LASettings.tsx` / `LAWorkbaskets.tsx` | Legal Advanced sub-tree | Active under `/legal-advanced` |
| Contract Review / Advice routes | `/legal/contract-review/*`, `/legal/advice/*` | Active, not in any sidebar |

**Routes counted: ~75 under `/legal/*` + 7 under `/legal-advanced/*`.**

### Duplicate/overlapping screens identified

| Concern | Duplicates |
|---|---|
| Case list | `LgCaseList`, `LegalCaseList`, `CaseList`, `CaseTracking`, `SSBCaseList` |
| Case detail | `LgCaseDetail`, `CaseDetailView`, `LegalCaseView`, `SSBCaseView`, `CaseView` |
| Dashboard | `LegalDashboard`, `LgDashboard`, `SSBLegalDashboard`, `LegalOpsDashboard`, `LADashboard` |
| Intake | `CaseIntake`, `CaseIntakeWizard`, `IntakeWizard`, `LegalIntakeWizard`, `SSBCaseIntake`, `LgCaseCreateWizard` |
| Hearings | `LegalHearingCalendar`, `LgHearingCalendar` |
| Reports | `LegalReports`, `ReportsAnalytics`, `SSBLegalReports` + 6 individual reports |
| Admin entry | `AdminConfig`, `SSBLegalAdmin`, plus `legal/admin/*` tree |
| Workbench | `LegalWorkbench`, `LegalReferralsWorkbench`, `LAWorkbaskets`, `AdviceWorkbench` |
| Contract Review vs Advice Request | `/legal/contract-review/*` and `/legal/advice/*` resolve to the **same components** |

---

## 2. Screen Dependency Matrix (deliverable per your request)

The full matrix is too large to render inline. I will generate it as a markdown file at `docs/legal/ia-refactor-screen-matrix.md` during Phase 0 with these columns per `lg_*` / `la_*` / `legal_*` screen:

```text
route | component | permission | primary tables | inbound links | outbound links | classification
```

Classifications: `STANDALONE` · `MATTER_TAB` · `ADMIN` · `REFERENCE` · `REPORT` · `DUPLICATE_OF(<x>)` · `LEGACY_KEEP_AS_REDIRECT`

Initial classification draft (subject to verification when matrix is written):

| Today | Classification | Goes to |
|---|---|---|
| LgCaseList, LegalCaseList, SSBCaseList, CaseList | DUPLICATE_OF LgCaseList | Litigation → Matters |
| LgCaseDetail (+ all variants) | STANDALONE (matter workspace) | Litigation → Matter Workspace |
| LgHearingCalendar, LegalHearingCalendar | MATTER_TAB + standalone calendar | Workbench → Calendar; tab on Matter |
| LegalOrderRegistry, CourtOrdersManagement | MATTER_TAB + cross-matter registry | Litigation → Orders; tab on Matter |
| EnforcementActions, EnforcementPenalty, LegalPaymentPlans | STANDALONE | Recovery & Enforcement |
| NoticeGeneration, DocumentCenter, LegalTemplateManagement | STANDALONE | Knowledge & Documents |
| AppealSubmission | MATTER_TAB | tab on Matter |
| EvidenceManagement, LegalEvidenceManagement | MATTER_TAB | tab on Matter |
| Contract Review + Advice (shared components) | STANDALONE (unified) | Legal Services |
| LegalReferralsWorkbench, LegalWorkbench, AdviceWorkbench, LAWorkbaskets | STANDALONE (unified) | Workbench |
| All `legal/admin/*` + `legal/settings/*` + `legal-advanced/settings` | ADMIN | Administration (regrouped) |
| Reports (6) | REPORT | Dashboard → Reports drawer |
| `legal-advanced/*` | LEGACY_KEEP_AS_REDIRECT | redirect to new equivalents |

---

## 3. Proposed Top-Level Navigation

```text
Legal
├── 1. Dashboard
│   ├── Executive · My · Team
│   ├── KPIs · SLA Summary · Upcoming Deadlines · Recent Activity
│   └── Reports (drawer: Cases by Stage, Recovery, Aging, Costs & Fees, Performance, Pending Hearings)
│
├── 2. Workbench                         ← primary daily landing
│   ├── My Work · Team Queue · Unassigned
│   ├── Awaiting Information · Response Received
│   ├── Awaiting Approval · Overdue · Recently Updated
│   └── Calendar (hearings & deadlines, cross-matter)
│
├── 3. Legal Services                    ← inbound from other depts
│   ├── Legal Advice Requests
│   ├── Contract Reviews
│   ├── Department Referrals
│   ├── Policy Reviews
│   ├── Board Matters
│   └── Internal Opinions
│       (one workflow, request_type discriminator)
│
├── 4. Recovery & Enforcement
│   ├── Recovery Dashboard
│   ├── Employer Recovery · Benefit Recovery
│   ├── Payment Arrangements   (consumes core_payment_arrangement)
│   ├── Settlement Agreements
│   └── Recovery Actions
│
├── 5. Litigation
│   ├── Legal Matters          ← list/grid of lg_case
│   ├── Court Cases · Hearings · Proceedings
│   ├── Orders · Judgments · Appeals
│   └── (each opens Matter Workspace)
│
├── 6. Knowledge & Documents
│   ├── Document Centre        (central DMS view)
│   ├── Generated Documents
│   ├── Templates · Legal References · Clause Library
│   ├── AI Analysis · Precedents
│
└── 7. Administration
    ├── Work Management        (Teams · Workbaskets · Assignment Rules)
    ├── Case Processing        (Workflow · Routing · Stage · SLA rules)
    ├── Reference Data         (Matter/Case/Court/Proceeding/Action types · Codesets · Complainant)
    ├── Communications         (Templates · Notifications · Numbering)
    └── System                 (Permissions · DMS Integration · AI · Audit · Integrity Checks)
```

---

## 4. Legal Matter Workspace (consolidation)

Inside `/legal/lg/cases/:id` (existing route, unchanged) — add tab spine:

```text
Summary | Parties | Referrals | Intake | Assignments |
Documents | Letters | AI Analysis |
Hearings | Proceedings | Orders | Appeals |
Payment Arrangements | Tasks | Timeline | Activity | History
```

Screens removed *from the sidebar* but kept as routes + surfaced as tabs:
Hearings (per-matter), Proceedings, Orders (per-matter), Letters, Documents (per-matter), Payment Arrangements, Tasks, Timeline, Activity, History, Appeals, Evidence.

---

## 5. Current → Proposed Mapping (excerpt)

| Today's menu | New location |
|---|---|
| Legal → Cases | Litigation → Legal Matters |
| Legal → Hearing Calendar | Workbench → Calendar **and** Matter → Hearings tab |
| Legal → Orders Registry | Litigation → Orders **and** Matter → Orders tab |
| Legal → Documents Center | Knowledge & Documents → Document Centre |
| Legal → Reports | Dashboard → Reports drawer |
| Legal → Admin (flat) | Administration (5 groups) |
| Legal Management → Enforcement / Payment Plans | Recovery & Enforcement |
| Contract Review (hidden routes) | Legal Services → Contract Reviews |
| Advice (hidden routes) | Legal Services → Legal Advice Requests |
| Legal Referrals Workbench | Workbench (merged into queues) |
| `/legal-advanced/*` | Redirects to new equivalents |

Full mapping for every one of ~75 routes will be in `docs/legal/ia-refactor-route-mapping.md`.

---

## 6. Compatibility Guarantees

- **Zero route deletions.** Every existing `/legal/*` and `/legal-advanced/*` URL keeps working.
- New menu IDs are added to `app_modules`; old menu IDs deactivated (`is_active=false`) **not** deleted — reversible.
- Where two routes resolve to the same screen (e.g. `/legal/contract-review/*` vs `/legal/advice/*`), both continue to resolve.
- Permissions in `role_permissions` untouched; new menu rows reuse existing `permission_code`s where possible. New codes only where a new grouping needs one.
- Breadcrumbs updated to reflect new tree.
- No `lg_*` / `la_*` / `legal_*` table changes.

---

## 7. Implementation Phases (only after you approve sections 3–5)

**Phase 0 — Inventory artifact (no UI change)**
- Generate `docs/legal/ia-refactor-screen-matrix.md` (full dependency matrix)
- Generate `docs/legal/ia-refactor-route-mapping.md` (every route → new location)
- Output: two docs, reviewable before touching UI.

**Phase 1 — New menu structure (DB-driven)**
- New `app_modules` rows for the 7 top-level sections + children
- Deactivate (not delete) the legacy `ssbLegalMenuItems` / `legalManagementMenuItems` entries
- Grant new menu permissions to your current role (as we did last turn)
- Visible result: new sidebar; every link still goes to existing pages.

**Phase 2 — Matter Workspace tab spine**
- Add tab shell to `LgCaseDetail` exposing existing per-matter screens as tabs
- Existing routes still navigable directly; tab is the canonical entry

**Phase 3 — Unified Workbench**
- Consolidate `LegalWorkbench` + `LegalReferralsWorkbench` + `AdviceWorkbench` + `LAWorkbaskets` behind one shell with named queues
- Old routes redirect to new queue URLs (params preserve filters)

**Phase 4 — Legal Services unification**
- One intake + detail workflow for Advice / Contract Review / Referral / Policy / Board / Opinion, discriminated by `request_type`
- Old routes redirect to unified intake with prefilled type

**Phase 5 — Administration regrouping**
- Group existing admin pages under the 5 sub-groups (no page rewrites, only menu placement + landing index)

**Phase 6 — Legacy `/legal-advanced/*` redirects**
- React Router redirect components from old URLs → new equivalents

Each phase ships independently with `tsgo` green and no functionality removed.

---

## 8. What I need from you to proceed

1. **Approve the 7-section tree** in §3 (or edit it).
2. **Approve the Matter Workspace tab order** in §4.
3. Tell me whether to start with **Phase 0** (write the two inventory docs first — recommended, ~no UI risk) **or** jump straight to **Phase 1** (new sidebar).

Nothing is changed in the codebase until you reply.
