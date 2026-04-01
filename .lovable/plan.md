

# Fix Data Migration Errors (Test → Live Sync)

## Root Cause Analysis

Three categories of errors found:

### Category 1: Missing Columns on Live (schema not yet published)
| Table | Missing Column | Exists in Test |
|-------|---------------|----------------|
| `cn_card_machine` | `office_code` | Yes |
| `tb_office` | `is_active` | Yes |

These columns exist in Test via migrations but haven't been published to Live yet. **Fix: Publish the project** to apply pending schema migrations to Live.

### Category 2: Wrong Primary Key in Upsert — `column "id" does not exist`
The sync edge function hardcodes `onConflict: "id"`, but these tables use `code` (or composite keys) as their PK:

| Table | Actual PK | Configured `primary_key_field` |
|-------|-----------|-------------------------------|
| `cn_payer` | `(payer_id, payer_type)` | `id` ← wrong |
| `tb_invoice_status` | `code` | `id` ← wrong |
| `tb_pay_periods` | `code` | `id` ← wrong |
| `tb_payer_type` | `code` | `id` ← wrong |
| `tb_receipt_status` | `code` | `id` ← wrong |

**Also**: the `data-migration-sync` edge function ignores the `primary_key_field` from config — it always uses `onConflict: "id"`.

### Category 3: Foreign Key Violations — Parent Records Missing on Live
| Table | FK | Issue |
|-------|-----|-------|
| `notification_template_versions` | `template_id → notification_templates(id)` | Parent template not on Live yet |
| `workflow_step_actions` | `step_id → workflow_steps(id)` | Parent step not on Live yet |

These records depend on parent rows being synced first. The sync function doesn't enforce table ordering.

---

## Fix Plan

### 1. Update `migration_analysis_tables` — correct PK fields
Update 5 rows in `migration_analysis_tables` to set the correct `primary_key_field`:
- `tb_invoice_status` → `code`
- `tb_pay_periods` → `code`
- `tb_payer_type` → `code`
- `tb_receipt_status` → `code`
- `cn_payer` → `payer_id` (composite key — needs special handling)

### 2. Update `data-migration-sync` edge function
Modify the sync function to:
- Accept `primaryKeyField` per item (passed from the frontend)
- Use the correct `onConflict` value per table instead of hardcoded `"id"`

### 3. Update `DataMigration.tsx` — pass PK field to sync
Include the `primaryKeyField` from `migration_analysis_tables` config when building sync items, so the edge function knows which column to use for conflict resolution.

### 4. Update `data-migration-analyze` edge function
Ensure the analysis function passes PK info through to the diff results so the frontend can relay it to sync.

### 5. Publish to apply schema migrations
After code changes, the user must **publish** to apply the pending `office_code` and `is_active` column migrations to Live. Then re-run the sync.

---

## Files Changed

| File | Change |
|------|--------|
| `migration_analysis_tables` data | Update `primary_key_field` for 5 tables |
| `supabase/functions/data-migration-sync/index.ts` | Use per-table PK field from request body instead of hardcoded `"id"` |
| `supabase/functions/data-migration-analyze/index.ts` | Include `pkField` in diff results |
| `src/pages/admin/DataMigration.tsx` | Pass `primaryKeyField` per item to sync function |

