

# Redesign Head Cashier: Default-Per-Branch + Override Model

## Summary

Replace the daily head cashier assignment model with a **persistent default per branch** plus **temporary date-range overrides**. The default assignment stays active indefinitely until changed. Overrides take precedence for their date range and auto-revert when expired.

## Database Changes

### New Table: `cn_head_cashier_default`
Stores the standing head cashier per branch.

```sql
CREATE TABLE cn_head_cashier_default (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_code VARCHAR NOT NULL REFERENCES tb_office(code),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  user_code VARCHAR NOT NULL,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  assigned_by VARCHAR NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(office_code)  -- one active default per branch
);
```

### New Table: `cn_head_cashier_override`
Stores temporary overrides for a date or date range.

```sql
CREATE TABLE cn_head_cashier_override (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_code VARCHAR NOT NULL REFERENCES tb_office(code),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  user_code VARCHAR NOT NULL,
  override_start DATE NOT NULL,
  override_end DATE NOT NULL,
  reason TEXT,
  assigned_by VARCHAR NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  CHECK (override_end >= override_start)
);
CREATE INDEX idx_hc_override_lookup ON cn_head_cashier_override(office_code, is_active, override_start, override_end);
```

### New RPC: `resolve_head_cashier(p_date, p_office_code)`
Replaces `get_active_head_cashier`. Logic:
1. Check `cn_head_cashier_override` for an active override where `p_date BETWEEN override_start AND override_end` for the office
2. If found → return override user + `source = 'override'`
3. If not → check `cn_head_cashier_default` for the office
4. Return default user + `source = 'default'` or `found = false`

### New RPC: `set_default_head_cashier(p_office_code, p_user_id, p_assigned_by)`
Upserts into `cn_head_cashier_default`. Logs to `system_audit_trail`.

### New RPC: `create_head_cashier_override(p_office_code, p_user_id, p_start, p_end, p_reason, p_assigned_by)`
Validates no overlapping active overrides for the same office. Inserts into `cn_head_cashier_override`. Logs to audit trail.

### New RPC: `delete_head_cashier_override(p_override_id, p_deleted_by)`
Soft-deletes by setting `is_active = false`. Logs to audit trail.

### Data Migration
Insert into `cn_head_cashier_default` from existing `cn_head_cashier_assignment` — pick the most recent active assignment per office as the default.

## UI Changes — `HeadCashierAssignment.tsx`

Redesign the page into two sections:

### Section 1: Default Head Cashier Per Branch
- Table showing all offices with their current default head cashier
- Each row has an "Edit" action to change the default
- Inline select + save pattern to assign/change default

### Section 2: Temporary Overrides
- Table of active/upcoming overrides with columns: Office, Override Cashier, Start Date, End Date, Reason, Assigned By, Actions (Delete)
- "Add Override" form: select office, select cashier, pick start/end dates, optional reason
- Visual indicator if an override is currently active vs upcoming vs expired
- Overlap validation on submit

### Status Display Per Branch
Each office row in the defaults table shows whether today's effective cashier is the default or an override (badge: "Default" vs "Override until {date}").

## Hook Changes — `useHeadCashier.ts`

Update to call `resolve_head_cashier` instead of `get_active_head_cashier`. The return shape stays the same (`headCashier`, `isCurrentUserHeadCashier`, `isLoading`) plus a new `source: 'default' | 'override'` field.

## Dependent Modules (No Breaking Changes)

All consumers (`BatchCreationModal`, `HeadCashierOfficeAssignment`, `BatchManagement`) use `useHeadCashier` which will transparently resolve via the new RPC. No changes needed in those files beyond the hook update.

## Files

| File | Change |
|------|--------|
| **Migration SQL** | Create `cn_head_cashier_default`, `cn_head_cashier_override` tables; create `resolve_head_cashier`, `set_default_head_cashier`, `create_head_cashier_override`, `delete_head_cashier_override` RPCs; migrate existing data |
| `src/hooks/useHeadCashier.ts` | Call `resolve_head_cashier` RPC; add `source` to return |
| `src/pages/cashier/HeadCashierAssignment.tsx` | Full redesign: defaults table + overrides table + forms |
| `src/components/payments/HeadCashierAssignmentSection.tsx` | Update RPC calls to use new endpoints |

## What Stays Unchanged
- `BatchCreationModal.tsx` — uses `useHeadCashier` (transparent)
- `HeadCashierOfficeAssignment.tsx` — uses `useHeadCashier` (transparent)
- `BatchManagement.tsx` — uses `useHeadCashier` (transparent)
- Existing `cn_head_cashier_assignment` table — kept for historical reference, no longer written to

