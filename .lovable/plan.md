

# Enhanced Table Selection for Data Migration

## Current State
- **Environment Sync**: Uses `SearchableSelect` dropdown to add one table at a time to `migration_analysis_tables`. Works but isn't visual/structured.
- **Export/Import**: Auto-selects ALL tables on load. Uses inline checkboxes. No shortlist separation.

## Changes

### 1. Environment Sync — Redesign `ManageAnalysisTables`

Replace the `SearchableSelect` dropdown with a two-panel layout matching the reference screenshot:

**Left Panel — Available Tables**: Scrollable list of all public tables NOT already in `migration_analysis_tables`. Each row has a radio button. Clicking a radio button moves the table into a local "staging" list (right panel). Include search filter at top.

**Right Panel — Shortlisted (Staged)**: Shows tables the user has staged for addition. Each has an "×" to remove from staging. "Add" button at bottom persists ALL staged tables to `migration_analysis_tables` in one batch insert via Supabase. After persisting, the staged list clears and the "Configured Tables" badge list below updates.

**Already Configured**: The existing badge list of tables already in `migration_analysis_tables` stays below, with remove buttons. These tables are excluded from the available list.

Deduplication is handled by filtering: available = `allPublicTables - existingAnalysisTables - stagedTables`.

### 2. Export/Import — Two-Panel Shortlist Pattern

Replace the current single-list checkbox approach:

**Default state**: All tables unchecked on load (remove the `useEffect` that auto-selects all).

**Left Panel — Available Tables**: Scrollable, searchable list with checkboxes. Selecting a table moves it to the right panel and removes/disables it from the left. Quick filters (Select All, Config Only) move matching tables to right panel.

**Right Panel — Selected for Export**: Shows all shortlisted tables with count. Each has an "×" to remove (moves back to available). "Export Data" button at bottom.

### 3. Backend Persistence & Audit

- Environment Sync already persists via `migration_analysis_tables` — batch insert for the "Add" action.
- Export/Import selection is ephemeral (per-session) since it's a one-time export action, but the export action itself is already logged.
- Add audit trail entry when tables are added/removed from analysis config via the existing `system_audit_trail` insert pattern.

### 4. Validation & Edge Cases

- "Add" button disabled when staging list is empty
- "Export" button disabled when no tables selected
- Duplicate prevention: filter already-configured tables from available list
- Rapid clicks: disable buttons during async operations (already done for Add/Remove)
- Page refresh: `migration_analysis_tables` is the source of truth, fetched on mount

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/admin/DataMigration.tsx` | Redesign `ManageAnalysisTables` with two-panel radio+staging pattern; redesign Export tab with two-panel shortlist; remove auto-select-all effect |

## Technical Notes
- No new database tables needed — `migration_analysis_tables` already exists for Environment Sync persistence
- No new edge functions needed — all operations use existing Supabase client queries
- Single file change (~300 lines rewritten in the two components)

