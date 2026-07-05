# Phase 0.2 — Catalogue Validation & Priority Cleanup Plan

**Status:** Documentation only. No code, route, schema, migration, or file changes are performed as part of this phase.
**Sources validated against:**
- `docs/enterprise/ENTERPRISE_ARCHITECTURE_CATALOGUE.md`
- `docs/platform/PLATFORM_OWNERSHIP_MATRIX.md`
- `docs/platform/EPIC_0_1_PLATFORM_ADMIN_ACCEPTANCE.md`
- `src/components/routing/AppRoutes.tsx` (1,234 route registrations, 222 `<Navigate>` redirects observed)
- `src/components/sidebar/menuItems/*.ts` (19 menu files, ~2,900 combined lines)

> This document converts every **"investigate"** and duplicate-suspect entry from the Enterprise Architecture Catalogue into a ranked cleanup backlog. Items are grouped by owning module. No item is marked "delete" — deletion requires (a) confirmed non-use, (b) confirmed replacement, (c) redirect in place, (d) one-release waiting period.

---

## 1. Validation Summary

| Catalogue Assertion | Evidence in Repo | Verdict |
|---|---|---|
| Platform Admin hub `/admin/platform` is canonical | `PlatformAdmin.tsx` present, grouped into 6 categories | ✅ Confirmed |
| Legacy `admin/organization-management` redirects to `/admin/org/*` | `OrganizationManagementAdmin.tsx` uses `<Navigate replace />` | ✅ Confirmed |
| `systemAdmin/*` duplicates admin pages | `src/pages/systemAdmin/` present, 480-line `systemAdminMenuItems.ts` | ⚠️ Confirmed – redirects not yet added |
| BN has parallel iterations (`nbenefit/`, `newBenefit/`) | Two menu files: `nbenefitMenuItems.ts` (495 LOC) + `newBenefitMenuItems.ts` (141 LOC) | ⚠️ Confirmed – dual-menu drift |
| Legal has parallel iterations (`legal-advanced/`, `legalFinal/`) | `src/pages/legal-advanced/` present | ⚠️ Confirmed |
| Legal legacy pages already retired via redirect | `LegalReports.tsx`, `SSBLegalReports.tsx`, `CaseList.tsx` marked `@deprecated` + `<Navigate>` | ✅ Confirmed |
| Notification Templates unified | `NotificationTemplatesAdmin.tsx` uses tabbed shell (Business / Core / Layouts / Blocks / Defaults / Org / Audit / Legacy / Report) | ✅ Confirmed |
| Employer registration has multiple entry roots | `/employer/register`, `/employers-management/add`, `/ip-registration/external`, `employer-registration/` folder | ⚠️ Confirmed |
| Insured Person registration duplicated | `/person/register`, `insuredPersons/PersonRegistration.tsx`, `ip-registration/`, `RegisterPersonTabs.tsx` | ⚠️ Confirmed |
| BeMA compliance retired | `sidebarMenuItems.ts` comment confirms removal, but `/bema/*` routes + `BEMA_*` constants still in `src/config/routes.ts` | ⚠️ Partial – route constants + pages remain |
| Orphan `/admin/seed-test-users` | Present in `AppRoutes.tsx` | ⚠️ Confirmed |

**Overall:** Catalogue findings are accurate. The backlog below expands each "investigate" flag into an actionable item.

---

## 2. Ranking Scheme

- **Priority P0** – blocks Phase 3+ BN enterprise work, or fixes user-visible duplication in the top-nav.
- **Priority P1** – reduces developer confusion / merge risk; safe to schedule inside Phase 1–2.
- **Priority P2** – cosmetic / bookmark hygiene; do after canonical routes are stable for one release.
- **Risk** – impact of the recommended action if wrong: High = user-facing regression, Medium = internal-only, Low = docs/redirects.
- **Recommended action** ∈ { **Keep**, **Redirect**, **Merge**, **Retire**, **Investigate** }.
- **Retire** = mark deprecated + redirect + schedule deletion after one release cycle. Never a same-turn delete.

---

## 3. Backlog — Grouped by Owning Module

### 3.1 Platform Admin

| # | Item | Current routes / files | Suspected issue | Recommended action | Risk | Priority | Code change later? | Dependency |
|---|---|---|---|---|---|---|---|---|
| PA-01 | `systemAdmin/*` mirror of `admin/*` | `src/pages/systemAdmin/*`, `systemAdminMenuItems.ts` (480 LOC) | Two menu trees pointing to overlapping admin surfaces | **Redirect** each `/system-admin/*` route to canonical `/admin/*`; keep pages as thin `<Navigate>` shells for one release | Medium | P0 | Yes (add redirects) | Confirm route mapping table |
| PA-02 | `UserManagementAdmin.tsx` vs `admin/users` (`UserList`) | Both present under `src/pages/admin/` | Legacy sibling of canonical user list | **Retire** – redirect to `/admin/users` | Low | P1 | Yes | PA-01 |
| PA-03 | `NotificationTemplates.tsx` vs `NotificationTemplatesAdmin.tsx` | `src/pages/admin/` | Legacy single-tab page pre-dates unified 9-tab shell | **Retire** – redirect to `/admin/notification-templates` | Low | P1 | Yes | – |
| PA-04 | `NumberingRulesAdmin.tsx` vs `NumberingAdmin.tsx` | `src/pages/admin/` | Two numbering admin surfaces | **Merge** – confirm canonical (`NumberingAdmin`), redirect other | Medium | P1 | Yes | Confirm which is wired to `nu_*` tables |
| PA-05 | `DepartmentManagement` / `DesignationManagement` / `OfficeManagement` vs `*Admin` variants | `src/pages/admin/` | Non-`*Admin` variants likely predate Epic 0.1 grouping | **Retire** all 3 non-`*Admin` variants after confirming zero inbound links | Low | P1 | Yes | Grep for imports first |
| PA-06 | `/admin/seed-test-users` | `AppRoutes.tsx` | Development-only route reachable in prod | **Investigate** – confirm dev-only, then gate behind env flag or retire | High | P0 | Yes | Verify no ops runbook uses it |
| PA-07 | Audit surfaces fragmented | `/system-logs/audit`, `audit/*` pages, `AuditReports.tsx`, `AuditReportBuilder.tsx` | Catalogue notes audit logs surfaced from 3+ entry points | **Investigate** – produce audit-surface inventory before action | Medium | P1 | Later | – |
| PA-08 | Workflow entry points scattered | `/admin/workflows`, `/admin/workflow-management`, `/admin/workflow-triggers`, `/admin/workflow-logs`, `/admin/workflow-analytics`, `pages/workflow/WorkflowManagement.tsx` | Multiple top-level workflow admin URLs | **Keep** individual pages but confirm Platform Admin hub is the single entry; document canonical order | Low | P2 | Docs only | – |
| PA-09 | Password policy / MFA / IP access split pages | `/admin/security/*` (4 pages) | Catalogue asks whether to tab-consolidate | **Keep as separate pages** (already grouped under Security card in PlatformAdmin). No action. | Low | P2 | No | – |

### 3.2 Social Security Core

| # | Item | Current routes / files | Suspected issue | Action | Risk | Priority | Code later? |
|---|---|---|---|---|---|---|---|
| SS-01 | Duplicate Employer registration roots | `/employer/register`, `/employers-management/add`, `employer-registration/` folder, `MultiTabEmployerRegistration` | Three UX entry points for same wizard | **Merge** – pick `/employers-management/add` as canonical, redirect others | High | P0 | Yes | Confirm workflow bindings |
| SS-02 | Duplicate Insured Person registration | `/person/register`, `RegisterPersonTabs.tsx`, `PersonRegistration.tsx`, `ip-registration/` | Same pattern as SS-01 | **Merge** – canonical `/person/register`, retire siblings via redirect | High | P0 | Yes | Confirm which uses `pblcnt_*` tables |
| SS-03 | Public IP registration `/ip-registration/external` vs portal | `pages/ip-registration/`, portals `EmployerLanding` etc. | Public path may overlap with portal shell | **Investigate** – confirm intended external channel | Medium | P1 | Later | Portal team |

### 3.3 BN / Benefits  *(kept separate from Platform per acceptance criteria)*

| # | Item | Current routes / files | Suspected issue | Action | Risk | Priority | Code later? |
|---|---|---|---|---|---|---|---|
| BN-01 | Parallel BN menus | `nbenefitMenuItems.ts` (495 LOC), `newBenefitMenuItems.ts` (141 LOC) | Two sidebar trees for the same module | **Investigate** first (identify canonical), then **Merge** into one menu file | High | P0 | Yes | Blocks Phase 3–5 BN work |
| BN-02 | Parallel BN page roots | `src/pages/nbenefit/*`, `src/pages/newBenefit/*` | Iterations of same module coexist | **Investigate** — build page-by-page canonical map, then retire non-canonical via redirect | High | P0 | Yes | BN-01 first |
| BN-03 | `NewBenefitAuthContext` vs standard auth | `src/contexts/NewBenefitAuthContext.tsx` | Module-scoped auth context bypasses `AuthContext` | **Investigate** – confirm whether still required post-Phase 0.1 | Medium | P1 | Later | BN-02 |
| BN-04 | BN config surfaces in Platform Admin | Platform Ownership Matrix flags business-specific config bleeding into `/admin/*` | Ownership violation | **Investigate** – enumerate BN settings pages then relocate under `/bn/*` | Medium | P1 | Yes | BN-02 |
| BN-05 | BN simulation isolation | `docs/BN-SIMULATION-ISOLATION-MANIFEST.md` referenced | Confirm isolation still holds post-menu merge | **Keep** – docs check only | Low | P2 | No | – |

### 3.4 Employer

| # | Item | Files | Issue | Action | Risk | Priority | Code later? |
|---|---|---|---|---|---|---|---|
| EM-01 | `employerMenuItems.ts` vs `employersMenuItems.ts` vs `employersManagementMenuItems.ts` | 3 sidebar files (65 / 311 / 32 LOC) | Three menus for employer domain | **Merge** into one canonical `employersMenuItems.ts` | Medium | P1 | Yes | SS-01 |
| EM-02 | `LedgerRecalcWizard` orphan? | `pages/employer/LedgerRecalcWizard.tsx` | Catalogue marks investigate | **Investigate** – confirm route linkage | Low | P2 | Later | – |

### 3.5 Insured Person

| # | Item | Files | Issue | Action | Risk | Priority | Code later? |
|---|---|---|---|---|---|---|---|
| IP-01 | `insuredPersonsMenuItems.ts` scope overlap with `person/*` routes | 215 LOC menu | Menu references mix of `/person/*` and `/insured-persons/*` | **Investigate** then normalize on `/person/*` (matches `routes.ts` constants) | Medium | P1 | Yes | SS-02 |
| IP-02 | `IDCardGeneration` (insuredPersons) vs `crd/CardManagement` | Two card surfaces | Possible duplication | **Investigate** ownership (CRD vs IP module) | Medium | P1 | Later | – |

### 3.6 Contributions / C3

| # | Item | Files | Issue | Action | Risk | Priority | Code later? |
|---|---|---|---|---|---|---|---|
| C3-01 | Numerous `C3_WIZARD_*` docs in repo root | `docs/` root pollution | Docs not filed under `docs/c3/` | **Keep content**, but **Investigate** relocating docs into `docs/c3/` (docs-only reorg, not this phase) | Low | P2 | No | – |
| C3-02 | `c3-management` routes vs `bema/c3-filing` | `AppRoutes.tsx` | Two C3 filing paths after BeMA retirement | **Retire** `/bema/c3-filing` if BeMA menu already removed; keep redirect | Medium | P1 | Yes | CM-01 |

### 3.7 Compliance / BeMA

| # | Item | Files | Issue | Action | Risk | Priority | Code later? |
|---|---|---|---|---|---|---|---|
| CM-01 | BeMA routes retained after menu removal | `BEMA_*` constants in `src/config/routes.ts`, `src/pages/bema/*` (Contributors, Reports, Zones …) | Menu removed but routes and pages still live | **Retire** – redirect `/bema/*` to Compliance & Enforcement canonical routes; keep for one release | Medium | P0 | Yes | Confirm Compliance canonical map |
| CM-02 | Inspector mobile surface | `/bema/inspector-mobile`, `src/pages/inspector/` | Possible dual mobile surfaces | **Investigate** – confirm canonical inspector app entry | Medium | P1 | Later | CM-01 |

### 3.8 Legal

| # | Item | Files | Issue | Action | Risk | Priority | Code later? |
|---|---|---|---|---|---|---|---|
| LG-01 | `legal-advanced/*` iteration | `src/pages/legal-advanced/*` (LADashboard, LAMatterList, …) | Parallel implementation to canonical `legal/*` | **Investigate** – confirm none of these are routed in `AppRoutes.tsx`; if orphan, **Retire** after one release | Low | P1 | Yes | Legal legacy retirement doc |
| LG-02 | Deprecated legal pages already redirected | `LegalReports.tsx`, `SSBLegalReports.tsx`, `CaseList.tsx`, `LegalCaseList.tsx`, `ReportsAnalytics.tsx` | Already `@deprecated` + `<Navigate>` | **Keep** as redirects; schedule delete after 1 release | Low | P2 | Yes | – |
| LG-03 | `/legal/admin` redirect chain | `AdminConfig.tsx` → `/legal/admin/codesets` | Already redirect-only | **Keep**; no action | Low | P2 | No | – |
| LG-04 | Reporting Centre canonical status | 20 legal report pages present per catalogue | **Keep** – covered by EPIC-09A/B/C acceptance | Low | – | No | – |

### 3.9 Finance / Cashier

| # | Item | Files | Issue | Action | Risk | Priority | Code later? |
|---|---|---|---|---|---|---|---|
| FN-01 | `financeMenuItems.ts` (213 LOC) scope vs Cashier pages | Menu + `pages/cashier/*` | Cashier appears under Finance but has own pages | **Investigate** – confirm intended IA (Cashier as sub-section of Finance) | Low | P2 | Docs only | – |
| FN-02 | `Receipt.tsx` (cashier) vs any finance receipt page | Single page found; catalogue flagged investigate | **Investigate** – confirm no duplicate | Low | P2 | Later | – |

### 3.10 Workflow

| # | Item | Files | Issue | Action | Risk | Priority | Code later? |
|---|---|---|---|---|---|---|---|
| WF-01 | `pages/workflow/WorkflowManagement.tsx` vs `/admin/workflow-management` | Two entry points | Same page reused? | **Investigate** – if identical component, redirect the non-admin path | Medium | P1 | Yes | PA-08 |
| WF-02 | Workflow tasks path `/workflow/my-tasks` vs application review | Two operator surfaces | **Keep** – different personas | Low | – | No | – |

### 3.11 Notification / Templates

| # | Item | Files | Issue | Action | Risk | Priority | Code later? |
|---|---|---|---|---|---|---|---|
| NT-01 | Unified template hub | `NotificationTemplatesAdmin.tsx` (9 tabs) | Already canonical | **Keep** | Low | – | No |
| NT-02 | `Template Management` menu deep-links `?tab=core&type=PDF` | `documentMenuItems.ts` | Uses querystring across module boundary | **Keep**, but **Investigate** whether DMS deserves its own PDF-template tab facade | Low | P2 | Later | – |
| NT-03 | `notificationMenuItems.ts` (67 LOC) vs Platform Admin's Notifications group | Sidebar duplication of admin cards | **Investigate** – confirm menu is operator-facing (Inbox) vs admin-facing | Low | P2 | Docs only | – |

### 3.12 DMS / Documents

| # | Item | Files | Issue | Action | Risk | Priority | Code later? |
|---|---|---|---|---|---|---|---|
| DM-01 | `documentMenuItems.ts` "Template Management" points to `/admin/notification-templates` | Cross-module link | **Keep** for now; revisit when DMS gets its own template surface | Low | P2 | Later | NT-02 |
| DM-02 | `/documents/signatures` linked but page maturity unknown | `documentMenuItems.ts` | **Investigate** – confirm page is not stub | Medium | P1 | Later | – |

### 3.13 Reporting

| # | Item | Files | Issue | Action | Risk | Priority | Code later? |
|---|---|---|---|---|---|---|---|
| RP-01 | `reportsMenuItems.ts` scope vs module-owned report hubs (Legal Reports Centre, BN reports, Compliance reports) | 67 LOC menu | Possible cross-module report index | **Keep** as index; **Investigate** duplication with per-module report hubs | Low | P2 | Docs only | – |

### 3.14 Portals

| # | Item | Files | Issue | Action | Risk | Priority | Code later? |
|---|---|---|---|---|---|---|---|
| PT-01 | Portal shell duplication check | `src/portals/_shared/*`, `PortalHub.tsx` | Catalogue asks to confirm no drift with internal shells | **Keep** – already isolated under `src/portals/` | Low | – | No | – |
| PT-02 | External IP registration `/ip-registration/external` vs Employer portal wizard | Cross-cutting | **Investigate** – confirm single canonical external entry | Medium | P1 | Later | SS-03 |

### 3.15 API / Integrations

| # | Item | Files | Issue | Action | Risk | Priority | Code later? |
|---|---|---|---|---|---|---|---|
| AP-01 | `/admin/api-keys` vs `/admin/public-api` vs `/admin/external-portal-settings` | 3 admin surfaces | Related but distinct concerns | **Keep** – confirmed distinct (internal keys / public API / portal SSO); document boundaries | Low | P2 | Docs only | – |
| AP-02 | `MainAPIBaseURL` env references vs Lovable Cloud backend | Per project-knowledge, external ASP.NET APIs are target | **Keep** – no cleanup; ensure adapters isolate calls | Low | – | No | – |

---

## 4. "Do First" Cleanup Items (Unblock BN Enterprise Work)

Ordered execution list to run **before** starting BN Phase 3+ enterprise work. All are P0. Each still requires its own implementation ticket (code change out-of-scope for Phase 0.2).

1. **BN-01 / BN-02** – Reconcile `nbenefit/` vs `newBenefit/` (menu + pages). Without a canonical BN tree, subsequent BN enterprise features risk being built on the wrong iteration.
2. **PA-01** – Add `systemAdmin/*` → `admin/*` redirects. Removes ambiguous admin URLs before BN admin config is relocated (BN-04).
3. **CM-01** – Redirect residual `/bema/*` routes to Compliance & Enforcement canonical routes. Prevents BN/compliance cross-linking confusion.
4. **SS-01 / SS-02** – Consolidate Employer + Insured Person registration roots. BN eligibility flows depend on a single canonical registration path.
5. **PA-06** – Confirm/gate `/admin/seed-test-users`. Non-prod hygiene ahead of BN UAT.
6. **BN-04** – Enumerate BN configuration surfaces currently inside Platform Admin and relocate under `/bn/*` (Ownership-Matrix compliance).

Items **BN-03, PA-02..PA-05, EM-01, IP-01, LG-01, WF-01** can proceed in parallel but are not blockers.

---

## 5. Explicit Non-Actions (This Phase)

- No files created outside this doc.
- No routes added, moved, redirected, or removed.
- No sidebar menu edits.
- No table, migration, RLS/GRANT, or edge-function changes.
- No canonical financial services touched (`v_lg_case_financials`, `lg_recoverable_liability` remain authoritative).
- Legal Reporting Centre (EPIC-09A/B/C) is **not** in scope; no reports duplicated, no financial calculations changed.

---

## 6. Open Investigations (Marked, Not Guessed)

The following items remain **investigate** — Phase 0.2 explicitly declines to assume an answer:

- BN-01 canonical iteration selection (`nbenefit` vs `newBenefit`).
- BN-03 requirement for a separate `NewBenefitAuthContext`.
- BN-04 exhaustive list of BN-specific pages currently reachable from `/admin/*`.
- PA-06 whether `/admin/seed-test-users` has any ops runbook usage.
- PA-07 canonical audit-surface inventory.
- CM-02 canonical Inspector mobile surface (BeMA vs `pages/inspector/`).
- EM-02 `LedgerRecalcWizard` linkage.
- FN-01/FN-02 Cashier IA under Finance.
- IP-02 CRD Card Management vs IP ID-Card Generation ownership.
- LG-01 `legal-advanced/*` linkage / orphan status.
- WF-01 whether `pages/workflow/WorkflowManagement.tsx` and `/admin/workflow-management` render the same component.
- NT-02/NT-03/DM-01/DM-02 template & DMS boundary questions.
- PT-02 canonical external registration entry.

Each will be answered by a follow-up spike ticket, not by this document.

---

## 7. Acceptance Checklist

- [x] No code changes in this phase.
- [x] No schema changes in this phase.
- [x] Ranked backlog present with priorities P0 / P1 / P2.
- [x] BN-specific cleanup separated from Platform cleanup (Sections 3.1 vs 3.3).
- [x] Every recommendation cites an existing file / route / doc from the repo.
- [x] Unknowns retained as **investigate** (Section 6), never guessed.
- [x] No deletion recommended without redirect + one-release wait.
- [x] "Do first" list published (Section 4) to unblock BN work.
