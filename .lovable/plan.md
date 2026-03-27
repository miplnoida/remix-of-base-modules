

# Two Changes on Data Migration Screen

## 1. Environment Sync Tab — Manage Analysis Tables

### Database
Create `migration_analysis_tables` table seeded with the current ~40 hardcoded tables from the edge function's `DEFAULT_TABLES` array:

```sql
CREATE TABLE public.migration_analysis_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL UNIQUE,
  primary_key_field TEXT NOT NULL DEFAULT 'id',
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

Seed with all current `DEFAULT_TABLES` entries.

### Edge Functions
- **`data-migration-analyze`**: Fetch table list from `migration_analysis_tables` (service role). Fall back to `DEFAULT_TABLES` if empty. Use each row's `primary_key_field`.
- **`bulk-data-transfer`**: Read allowed tables from `migration_analysis_tables` instead of hardcoded `allowedTables`.

### UI (EnvironmentSyncTab)
Add a collapsible "Manage Analysis Tables" section at the top:
- Display current tables as removable badge/chips with X button (delete from `migration_analysis_tables`)
- Searchable select (using existing `SearchableSelect` component) populated from `get_all_public_tables` RPC, filtering out already-added tables, with an "Add" button (insert into `migration_analysis_tables`)
- All operations go directly to Supabase (`insert`/`delete`)

---

## 2. Export/Import Tab — Select Individual Tables

### Current Behavior
Users select by **category** (checkboxes for "Configuration", "MasterData", etc.), which selects all tables in that group.

### New Behavior
Replace category-based selection with individual table selection:
- Use `MultiSelectCheckbox` component with the full list of tables from `get_all_public_tables`
- Keep quick-filter buttons: "Select All", "Select None", "Config Only" (selects tables matching config prefixes)
- Show selected count
- Export/import operates on individually selected tables

### Files Changed

| File | Change |
|------|--------|
| Migration SQL | Create + seed `migration_analysis_tables` |
| `data-migration-analyze/index.ts` | Read tables from DB |
| `bulk-data-transfer/index.ts` | Read allowed tables from DB |
| `DataMigration.tsx` | Add table management UI in sync tab; replace category selection with individual table selection in export/import tab |

