

# Risk Management Data Model — Status & Gap Analysis

## What Already Exists (Built Earlier Today)

All four core tables are **already created and fully operational** with 0 records:

| Table | Status | Triggers | Indexes | FKs |
|---|---|---|---|---|
| `ia_audit_universe` | Exists | `fn_audit_row_change` via `ia_risk_register` ref | PK only | dept FK |
| `ia_risk_register` | Exists | audit + updated_at | universe, status, category | universe FK, self-FK for linked risks |
| `ia_risk_mitigation_actions` | Exists | audit + updated_at | risk_id | risk FK (CASCADE) |
| `ia_risk_reviews` | Exists | audit + updated_at | risk_id | risk FK (CASCADE) |

**Key features already in place:**
- Generated columns for `inherent_risk_score` and `residual_risk_score` (likelihood × impact)
- Self-referencing `linked_risk_id` on risk register for deduplication/merge
- CHECK constraints for 1-5 scoring on likelihood/impact
- Realtime enabled on `ia_risk_register`
- All 3 new tables have `fn_audit_row_change` triggers for audit trail
- Frontend pages at `/audit/universe` and `/audit/risk-register` with full CRUD, filters, exports, duplicate detection, mitigation panel, and review timeline

## Gaps to Address

The existing schema covers ~90% of the requirements. Here are the remaining gaps:

### 1. Audit Universe — Missing audit trigger
`ia_audit_universe` itself does NOT have the `fn_audit_row_change` trigger attached. Only the downstream tables do.

### 2. Audit Universe — Missing indexes
No indexes on `entity_type`, `status`, or `is_active` for filter performance.

### 3. Shared/Common Mitigation Patterns
Currently mitigations are 1:1 with risks. There's no way to define a reusable mitigation template that can be applied across multiple risks/entities.

**Proposed new table: `ia_mitigation_templates`**
- `id` (UUID PK)
- `template_name` (TEXT, NOT NULL)
- `template_description` (TEXT)
- `category` (TEXT) — maps to risk category
- `default_priority` (TEXT, default 'Medium')
- `is_active` (BOOLEAN, default true)
- `created_at`, `created_by`, `updated_at`, `updated_by`

Then add `template_id` (UUID, FK, nullable) to `ia_risk_mitigation_actions` so actions can optionally reference a shared template.

### 4. Duplicate Prevention — Missing unique constraint
The app-level duplicate check exists (title ILIKE match), but there's no DB-level constraint preventing exact duplicates. 

**Proposed:** Add a unique index on `(audit_universe_id, lower(risk_title))` WHERE `is_active = true` to prevent exact-match duplicates at the database level.

### 5. Risk Register — Missing `risk_source` field
No way to record where a risk was identified (e.g., "Previous Audit", "Self-Assessment", "External Review", "Regulatory").

## Migration Plan

One migration to close the gaps:

1. Add `fn_audit_row_change` trigger to `ia_audit_universe`
2. Add indexes on `ia_audit_universe(entity_type)`, `ia_audit_universe(status)`, `ia_audit_universe(is_active)`
3. Create `ia_mitigation_templates` table with audit trigger
4. Add `template_id` FK column to `ia_risk_mitigation_actions`
5. Add `risk_source` column to `ia_risk_register`
6. Add unique partial index on `ia_risk_register(audit_universe_id, lower(risk_title)) WHERE is_active = true`

## Frontend Updates

- Update the mitigation action form to optionally select from templates
- Add a small "Mitigation Templates" management section in Risk settings
- Add `risk_source` field to the Risk Register create/edit form
- Update the `useRiskRegister` hook to include `risk_source`

## Audit Logging Integration

All tables already route through `fn_audit_row_change` → `system_audit_trail`. The only missing trigger is on `ia_audit_universe` itself and the new `ia_mitigation_templates` table. Both will be added in the migration.

## Summary of Work

| Step | Description |
|---|---|
| 1 | Migration: triggers, indexes, new table, new columns, unique constraint |
| 2 | Hook updates: add `risk_source`, template support |
| 3 | UI updates: risk source field, template selector in mitigation form |

