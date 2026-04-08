

# Frontend Refactor: Audit Universe and Risk Management

## Current State Assessment

The pages `/audit/universe` (AuditUniverse.tsx, 215 lines) and `/audit/risk-register` (RiskRegister.tsx, 513 lines) are already production-connected with:
- Real data via `useAuditUniverse`, `useRiskRegister`, `useRiskMitigationActions`, `useRiskReviews` hooks
- Functional filters (entity type, status, category, search)
- CRUD operations (create, edit, soft-delete)
- Export dropdown (PDF, XLSX, CSV)
- Duplicate risk detection with link/merge
- Detail panel with mitigations and review timeline
- Pagination

No ministry-specific wording exists in the audit pages — terminology is already entity-neutral. The `RiskAssessment.tsx` page (separate, older page) has one "Department Summary" tab label that should be updated.

## What Needs Refactoring

### 1. AuditUniverse.tsx — Enhancements
- Add **owner filter** and **risk category filter** (currently only type and status)
- Add **entity detail view** (click entity name to see a side panel with linked risks count, last audit date, etc.)
- Add **confirmation dialog** before deactivating an entity
- Improve **empty state** with a descriptive message and "Add Entity" CTA button

### 2. RiskRegister.tsx — Enhancements
- Add **owner filter** and **risk level/severity filter** (currently missing)
- Add **review due filter** (risks with review_date approaching or past due)
- Add **risk_source** to export schema and table columns
- Improve the **detail panel**: add edit/delete actions for mitigation items, add description field to mitigation form
- Add **risk close workflow** (status change to "Closed" with required review comment)
- Improve **linked risk** field — use a Select dropdown referencing existing risks instead of raw UUID text input
- Add **confirmation dialog** before deactivating a risk

### 3. RiskAssessment.tsx — Terminology
- Rename "Department Summary" tab to "Entity Summary"

### 4. Export Schema Updates
- Add `risk_source` field to `RISK_REGISTER_SCHEMA` in `moduleFieldSchemas.ts`
- Add `risk_source` to export columns

### 5. Empty States
- Both pages already use DataTable's built-in `emptyMessage`. Enhance with custom empty state component for the initial "no data" experience.

### 6. Hooks Cleanup
- `useMitigationTemplateMutations` has unused `getUpdateFields` import — remove

## File Change Plan

| File | Changes |
|------|---------|
| `src/pages/audit/AuditUniverse.tsx` | Add owner/category filters, entity detail panel, deactivation confirmation, enhanced empty state |
| `src/pages/audit/RiskRegister.tsx` | Add owner/severity/review-due filters, close-risk workflow, linked-risk select, edit/delete mitigation actions, deactivation confirmation |
| `src/pages/audit/RiskAssessment.tsx` | Rename "Department Summary" to "Entity Summary" |
| `src/config/moduleFieldSchemas.ts` | Add `risk_source` to RISK_REGISTER_SCHEMA |
| `src/hooks/useRiskRegister.ts` | Minor cleanup of unused imports |

## No new hooks/services needed
All data operations are already handled by existing hooks. The refactoring is purely frontend UX improvements.

## UX Improvements Summary
1. Richer filter bar (5 filters on Risk Register instead of 3)
2. Confirmation dialogs before destructive actions
3. Close-risk workflow requiring a review comment
4. Linked risk selector using a dropdown instead of raw UUID
5. Editable/deletable mitigation actions in detail panel
6. Entity detail side panel showing linked risks
7. "Entity Summary" terminology replacing "Department Summary"
8. Enhanced empty states with action buttons

