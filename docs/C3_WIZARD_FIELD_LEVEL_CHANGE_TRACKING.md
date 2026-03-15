# C3 Wizard — Field-Level Change Tracking Required

## Background

The SSB Admin "Sync History → View" dialog fetches field-level change details from the C3 Wizard via the `get_config_change_summary` API action. This shows users exactly **which fields changed** (old value → new value) after each publish.

Currently, for the **6 new tables** added in Sync Protocol v4.0, the Wizard returns `total_changes: 0` because field-level diff tracking has not been implemented for these tables yet.

## What the SSB Admin Expects

When calling `get_config_change_summary` with a `sync_log_id`, the response must include diffs from **ALL** synced tables, not just the original 6.

### Expected Response Format (unchanged)

```json
{
  "status": "success",
  "data": {
    "total_changes": 5,
    "changes_by_table": {
      "wiz_c3_calculation_config": [
        {
          "field_name": "config_value",
          "old_value": "16",
          "new_value": "17",
          "changed_by": "ADMIN",
          "changed_at": "2026-03-15T12:00:00Z"
        }
      ],
      "wiz_self_emp_contrib_rate": [
        {
          "field_name": "ee_rate",
          "old_value": "5.00",
          "new_value": "5.50",
          "changed_by": "ADMIN",
          "changed_at": "2026-03-15T12:00:00Z"
        }
      ]
    }
  }
}
```

## Tables Requiring Change Tracking

The following **6 new tables** need field-level diff tracking added to the sync endpoint, matching the existing pattern used for `wiz_c3_config_details`, `wiz_c3_config_periods`, etc.:

| # | Wizard Table | Sync Strategy | Key Fields to Track |
|---|---|---|---|
| 1 | `wiz_c3_calculation_config` | Full Replace | `config_key`, `config_value`, `category`, `is_active` |
| 2 | `wiz_income_codes` | Full Replace | `code`, `description`, `is_active` |
| 3 | `wiz_income_cat` | Full Replace | `wage_upper`, `wage_lower`, `ee_rate`, `er_rate`, `category_code` |
| 4 | `wiz_self_emp_contrib_rate` | Full Replace | `contribution_type`, `ee_rate`, `er_rate`, `flat_rate`, `effstart`, `effend` |
| 5 | `wiz_income_code_policy_default` | UPSERT | All policy fields (rates, flags, thresholds) |
| 6 | `wiz_income_code_policy_exceptions` | UPSERT | All policy fields (rates, flags, thresholds) |

## Implementation Steps for C3 Wizard Team

### Step 1: Before applying each sync, snapshot current values

In the sync endpoint handler, **before** deleting/upserting rows for the new tables, read the current rows into memory:

```sql
-- Example for wiz_c3_calculation_config
SELECT id, config_key, config_value, category, is_active
FROM wiz_c3_calculation_config;
```

### Step 2: After applying sync, compare old vs new

After inserting/upserting the new data, compare each field of each record against the snapshot. For any difference, insert a row into `wiz_config_change_history`:

```sql
INSERT INTO wiz_config_change_history (
  sync_log_id, table_name, record_id, field_name,
  old_value, new_value, changed_by, changed_at
) VALUES (
  $sync_log_id, 'wiz_c3_calculation_config', $record_id, 'config_value',
  '16', '17', 'SSB_ADMIN_SYNC', NOW()
);
```

### Step 3: Include new tables in `get_config_change_summary`

Update the `get_config_change_summary` action to query `wiz_config_change_history` for ALL table names (including the 6 new ones), not just the original tables.

### Step 4: Handle "Full Replace" tables

For tables using full replace (delete all + insert):
- **New records** (exist in new data but not in old snapshot): log as `old_value: null`, `new_value: <value>`
- **Removed records** (exist in old snapshot but not in new data): log as `old_value: <value>`, `new_value: null`
- **Modified records** (exist in both but values differ): log each changed field

### Matching Key for Diff Comparison

| Table | Match Key (unique identifier) |
|---|---|
| `wiz_c3_calculation_config` | `config_key` |
| `wiz_income_codes` | `code` |
| `wiz_income_cat` | `category_code` + `wage_lower` |
| `wiz_self_emp_contrib_rate` | `contribution_type` + `effstart` |
| `wiz_income_code_policy_default` | `id` or `date_from` |
| `wiz_income_code_policy_exceptions` | `id` or `employer_id` + `date_from` |

## Summary

Once these changes are applied on the C3 Wizard side, the SSB Admin "Sync History → View" dialog will automatically display field-level before/after diffs for all 12 table groups without any changes needed on the SSB Admin side.
