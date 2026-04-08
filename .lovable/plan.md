

# Audit Universe and Risk Management — Production-Ready Overhaul

## Architecture Summary

The current system has these structures that need reworking:

1. **`ia_audit_universe`** table exists with correct schema (entity_name, entity_type, entity_code, process_owner, risk scores, etc.) but has 0 active records and no UI page.
2. **`ia_risk_assessments`** table has `audit_universe_id` FK already but is currently tied to `function_id` in the UI (`RiskAssessment.tsx`). 0 records exist.
3. **`ia_rcm_processes` / `ia_rcm_risks` / `ia_rcm_controls`** (Risk Control Matrix) tables exist and are empty. The RCM page (`RiskControlMatrix.tsx`) works but is process-scoped, not entity-scoped.
4. **`ia_departments` / `ia_department_functions`** are the primary audit governance tables. These should remain as-is but the Audit Universe should be the entity-level abstraction layer.
5. The sidebar has no Audit Universe or Risk Register entry.
6. No `risk_register`, `risk_mitigation_actions`, `risk_reviews`, or `risk_links` tables exist.

**Design Principle**: The `ia_audit_universe` becomes the central entity registry. Risk assessments and the new risk register attach to universe entities. Departments/functions remain as governance detail but are linked through the universe.

---

## Phase 1 — Data Model Changes (3 new tables, 1 alter)

### New Tables

```text
ia_risk_register
├── id (uuid PK)
├── audit_universe_id (FK → ia_audit_universe)
├── risk_title (text, required)
├── risk_description (text)
├── risk_category (text) — Operational, Financial, Compliance, IT, Strategic, Reputational
├── inherent_likelihood (int 1-5)
├── inherent_impact (int 1-5)
├── inherent_risk_score (numeric, computed)
├── inherent_risk_level (text)
├── residual_likelihood (int 1-5)
├── residual_impact (int 1-5)
├── residual_risk_score (numeric, computed)
├── residual_risk_level (text)
├── control_effectiveness (text)
├── risk_owner (text)
├── review_date (date)
├── due_date (date)
├── status (text) — Open, Mitigating, Under Review, Closed, Accepted
├── fiscal_year (text)
├── linked_risk_id (uuid, self-FK for dedup/merge)
├── is_active (boolean)
├── created_at, created_by, updated_at, updated_by
└── notes (text)

ia_risk_mitigation_actions
├── id (uuid PK)
├── risk_id (FK → ia_risk_register)
├── action_title (text)
├── action_description (text)
├── assigned_to (text)
├── due_date (date)
├── completion_date (date)
├── status (text) — Planned, In Progress, Completed, Overdue, Cancelled
├── priority (text) — High, Medium, Low
├── evidence_notes (text)
├── is_active (boolean)
├── created_at, created_by, updated_at, updated_by

ia_risk_reviews
├── id (uuid PK)
├── risk_id (FK → ia_risk_register)
├── review_date (date)
├── reviewed_by (text)
├── previous_risk_level (text)
├── new_risk_level (text)
├── previous_score (numeric)
├── new_score (numeric)
├── comments (text)
├── created_at, created_by
```

### Alter `ia_audit_universe`

No schema change needed — existing columns are already suitable. We will populate entity_type options in UI: Ministry, Department, Division, Programme, Project, Fund, Process, System, Location, Agency, Committee, User/Role Domain.

---

## Phase 2 — Migration SQL

One migration file containing:
1. `CREATE TABLE ia_risk_register` with all columns and FKs
2. `CREATE TABLE ia_risk_mitigation_actions` with FK to risk_register
3. `CREATE TABLE ia_risk_reviews` with FK to risk_register
4. Add DB audit trigger (`fn_audit_row_change`) to all 3 new tables
5. Enable realtime on `ia_risk_register` for live dashboard updates

---

## Phase 3 — Frontend Changes

### 3A. New Page: Audit Universe (`/audit/universe`)
- Full CRUD for `ia_audit_universe` entities
- Entity type dropdown with all 12+ types (not just Department)
- Filters: entity_type, status, risk_category, process_owner, search
- Metric cards: total entities, by type breakdown, avg risk score
- Export dropdown (PDF, XLSX, CSV)
- Link to view risks for each entity
- Pagination via existing `useTablePagination`

### 3B. New Page: Risk Register (`/audit/risk-register`)
- Full CRUD backed by `ia_risk_register`
- Entity selector (from `ia_audit_universe`)
- Inherent + residual risk scoring with auto-calculation
- Mitigation actions sub-panel (inline expandable or tab)
- Risk reviews timeline (lifecycle traceability)
- Duplicate detection: on save, query for risks on same entity with similar title/category and warn user
- Link/merge: allow setting `linked_risk_id` to reference an existing risk instead of duplicating
- Filters: entity, entity_type, risk_level, category, status, owner, fiscal_year, date range
- Export: full register, filtered view, single risk detail with mitigations

### 3C. Update Sidebar Menu
- Add "Audit Universe" under Governance group
- Add "Risk Register" under Governance group (below Risk Assessment)
- Update descriptions to use entity-neutral language

### 3D. Update `RiskAssessment.tsx`
- Change "Department" label to "Entity" where referring to audit universe entities
- Keep existing function-based assessment flow (it works) but add optional `audit_universe_id` selector
- Update Department Summary tab to "Entity Summary"

### 3E. Hooks & Services
- `useAuditUniverse()` — CRUD hook for `ia_audit_universe`
- `useRiskRegister()` — CRUD hook for `ia_risk_register`
- `useRiskMitigationActions(riskId)` — CRUD for mitigations
- `useRiskReviews(riskId)` — query for review history
- `useDuplicateRiskCheck(entityId, title, category)` — similarity check

---

## Phase 4 — Export/Print Strategy

Using existing `ExportDropdown` component with `ExportColumn` definitions for:
1. **Audit Universe Register** — all entity fields
2. **Risk Register** — all risk fields with entity name resolved
3. **Risk Mitigation Action Plan** — grouped by risk, showing actions and status
4. **Risk Detail** — single risk with full mitigation and review history (PDF only)

All exports use the existing `generateSSBReport` for PDF and `ExcelJS` for XLSX. No new export infrastructure needed.

---

## Phase 5 — Duplicate Prevention Logic

On risk creation:
1. Query `ia_risk_register` for same `audit_universe_id` + similar `risk_title` (case-insensitive LIKE)
2. If matches found, show warning dialog listing existing risks
3. User can: proceed with new entry, link to existing risk, or cancel
4. Linked risks share a `linked_risk_id` reference for cross-entity traceability

---

## Phase 6 — Audit Logging

All 3 new tables get the `fn_audit_row_change` trigger (DB-level). App-level `globalAuditInterceptor.ts` route mappings will be added for `/audit/universe` and `/audit/risk-register`.

---

## Phase 7 — Routing

Add to router:
- `/audit/universe` → `AuditUniverse.tsx`
- `/audit/risk-register` → `RiskRegister.tsx`

---

## Implementation Order

| Step | Work | Files |
|------|------|-------|
| 1 | Migration: create 3 tables + triggers | 1 migration SQL |
| 2 | Hooks: useAuditUniverse, useRiskRegister, useRiskMitigationActions, useRiskReviews | 1 new hook file |
| 3 | Audit Universe page | 1 new page |
| 4 | Risk Register page with mitigations + reviews | 1 new page |
| 5 | Sidebar menu updates | auditMenuItems.ts |
| 6 | Router updates | App.tsx or routes file |
| 7 | RiskAssessment.tsx terminology updates | 1 existing file |
| 8 | Export column schemas | moduleFieldSchemas config |
| 9 | Audit interceptor route mappings | globalAuditInterceptor.ts |

---

## Test Checklist

- [ ] Create audit universe entity of each type
- [ ] Create risk linked to entity, verify scores auto-calculate
- [ ] Add mitigation action to risk, verify status tracking
- [ ] Add risk review, verify lifecycle timeline displays
- [ ] Attempt duplicate risk creation, verify warning appears
- [ ] Link duplicate risk instead of re-entering
- [ ] Export Audit Universe as PDF, XLSX, CSV
- [ ] Export Risk Register as PDF, XLSX, CSV
- [ ] Verify filters work on both pages (entity type, status, risk level, search)
- [ ] Verify pagination on large datasets
- [ ] Verify audit trail entries appear for all CRUD operations
- [ ] Verify sidebar navigation works for new pages
- [ ] Verify RiskAssessment.tsx still functions with updated terminology

