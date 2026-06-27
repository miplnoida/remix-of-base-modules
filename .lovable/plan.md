# Safe Delete + Where Used + Replace References

Adds reference-aware delete/archive/replace workflows across all communication-asset and template tables, with audit logging.

## Scope (entity types)
- `comm_letterhead` (Official Communication Templates)
- `comm_media_asset` (logos, seals, watermarks, stamps, QR, signatures)
- `comm_email_signature`
- `comm_disclaimer`
- `comm_print_footer`
- `core_text_block`

## Architecture

### 1. Central Reference Registry (code, not DB)
New file: `src/lib/comm/referenceRegistry.ts`

Declares, per entity type, the list of tables + columns that can reference it. Example for `comm_media_asset`:

```text
- comm_letterhead.design_config -> branding.logo_asset_id, header.seal_asset_id, ...
- core_organization.logo_url / .secondary_logo_url (by url match)
- core_department_profile.logo_asset_id, .seal_asset_id, ...
- comm_asset_mapping.asset_id
- core_generated_document.metadata.asset_ids[]
- notification_templates.body_html (URL match)
```

For each reference source we store:
- `table`, `displayLabel` (Module / Department / Template / Notification / Report / DMS / Case)
- `matchColumn` or `jsonPath`
- `recordIdColumn`, `recordLabelColumn`
- `routeBuilder(id)` for "open record" link

### 2. Reference scanner
New file: `src/lib/comm/referenceScanner.ts`
- `scanReferences(entityType, entityId): Promise<ReferenceHit[]>`
- Runs parallel `select` queries against each registered source. JSON paths use Postgres `->>`/`@>` filters.
- Returns `{ source, table, recordId, recordLabel, route, column }[]`.

### 3. Audit
New table `comm_asset_audit_log` (single table for all entity types).

```text
columns: id, entity_type, entity_id, action (delete|archive|replace|restore),
         old_reference_id, new_reference_id, reason, performed_by, performed_at, payload(jsonb)
```

`GRANT` to authenticated/service_role. No RLS (per project rule).

### 4. Safe-delete service
New file: `src/lib/comm/safeDeleteService.ts`
- `canDelete(entityType, entityId)` -> `{ allowed, reasons[], hits[] }`
  - Blocks if hits > 0
  - Blocks if asset is `is_system_default` or `is_default` and active
  - Blocks if template is latest approved default
  - Blocks if used in any `core_generated_document` (historical preservation)
- `softArchive(entityType, entityId, reason)` -> sets `is_active=false`, `approval_status='archived'`, audit row
- `hardDelete(entityType, entityId, reason)` -> only after `canDelete.allowed`, audit row
- `replaceReferences(entityType, oldId, newId, reason)` -> rewrites each hit (JSON path-aware), audit row per hit

### 5. Hooks
New file: `src/hooks/comm/useSafeDelete.ts`
- `useWhereUsed(entityType, id)` (react-query)
- `useSafeDeleteMutation()` / `useArchiveMutation()` / `useReplaceReferencesMutation()`
- All wrap `useAuditedMutation` (existing) for system audit trail.

### 6. UI components
New folder: `src/components/comm/safe-delete/`
- `WhereUsedPanel.tsx` — grouped list (Module / Department / Template / Generated Document / Notification / Report / DMS / Case) with deep links
- `SafeDeleteDialog.tsx` — confirmation, required reason textarea, shows Where-Used summary
- `ReplaceReferencesDialog.tsx` — picks replacement (active items of same type via `SearchableSelect`), preview list of hits, required reason
- `DeleteActionButton.tsx` — single drop-in: renders "Delete", "Cannot Delete – In Use", or disabled per permission. Uses `PermissionGate` (module `Communication Assets`, action `delete`/`archive`/`replace`).

### 7. Wire-up
Modify list/detail pages to use `DeleteActionButton`:
- `src/pages/admin/organization/LetterheadsPage.tsx`
- `src/pages/admin/organization/MediaLibraryPage.tsx`
- `src/components/comm/TemplateDesignerDialog.tsx` (history/general tab)
- `src/pages/admin/organization/EmailSignaturesPage.tsx` (if exists, otherwise wherever signatures/disclaimers/footers are managed)
- Text blocks management page

Existing delete handlers are replaced with the new flow.

### 8. Permissions
Reuses existing `useActionPermissions` / `PermissionGate`:
- `view` — authorized users
- `delete`, `archive`, `replace_references` — admin only

## Out of scope (this pass)
- No new approval workflow (uses existing approval status)
- No bulk delete UI
- DMS / Case scanning only covers tables already present in this project — external satellites are noted but not queried

## Acceptance checks
- Unused asset/template → Delete dialog → confirm + reason → hard delete + audit row
- Referenced asset → button reads "Cannot Delete – In Use"; click opens Where-Used with links
- Replace flow rewrites references atomically (per-hit) and re-checks before enabling Delete
- All actions write to `comm_asset_audit_log` and `system_audit_trail`
- `tsgo` typecheck passes

## Files to create
- `supabase/migrations/<ts>_comm_asset_audit_log.sql`
- `src/lib/comm/referenceRegistry.ts`
- `src/lib/comm/referenceScanner.ts`
- `src/lib/comm/safeDeleteService.ts`
- `src/hooks/comm/useSafeDelete.ts`
- `src/components/comm/safe-delete/WhereUsedPanel.tsx`
- `src/components/comm/safe-delete/SafeDeleteDialog.tsx`
- `src/components/comm/safe-delete/ReplaceReferencesDialog.tsx`
- `src/components/comm/safe-delete/DeleteActionButton.tsx`

## Files to edit
- `src/pages/admin/organization/LetterheadsPage.tsx`
- `src/pages/admin/organization/MediaLibraryPage.tsx`
- `src/components/comm/TemplateDesignerDialog.tsx`
- Any existing pages managing signatures / disclaimers / footers / text blocks
