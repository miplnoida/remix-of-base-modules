# `comm_asset_mapping` cleanup report

Status: **runtime-clean**. Table retained for one release cycle.

## Row inventory (Test / Development)

Query used:

```sql
SELECT * FROM comm_asset_mapping ORDER BY created_at;
```

| id | asset_id | category | communication_type | scope | priority | is_active |
|---|---|---|---|---|---|---|
| `4fbc8a87-7d2b-4f73-96cc-5f5bedcaf7d7` | `c5d5969a-…7446` | `letterhead_header` | `doc_payment_receipt` | GLOBAL | 100 | **false** |
| `4b71ab93-b43a-4299-9235-82d18757e9c9` | `7fb949d0-…f8df` | `logo`               | `doc_payment_receipt` | GLOBAL | 100 | **false** |

Both rows are `is_active = false` and unscoped. Kept in place per the current
directive; no data migration is required (both were superseded before this
cleanup).

## Runtime status after Phase-8 code refactor

| File | Previous behaviour | Current state |
|---|---|---|
| `src/lib/enterprise/resolvers/assetSlotResolver.ts` | Read `comm_asset_mapping` as the first (DOCUMENT_OVERRIDE) resolution tier | Branch deleted. Resolver now starts at Department Profile. Comment retained pointing to Configuration Center. |
| `src/lib/enterprise/healthChecks.ts` | Warned about inactive assets still mapped | Check removed. Equivalent signal now surfaced by `ValidationImpactPage`'s engine-health view. |
| `src/pages/admin/organization/DocumentAssetsPage.tsx` | Full CRUD writer on `comm_asset_mapping` | Replaced by a deprecated stub that redirects admins to Configuration Center (Branding + Communication domains). No reads, no writes. |

Verification: `rg "\.from\(\"comm_asset_mapping\"\)" src/` → **zero matches**.
Only remaining textual references are comments, the reference-registry
metadata entry (`src/lib/comm/referenceRegistry.ts`), and the auto-generated
Supabase types file. Both regenerate cleanly the moment the table is dropped.

## Deprecation state

The table is now **read-only pending removal**. There are no application code
paths that read or write it. It survives only so that:

- Existing rows remain queryable for audit/forensics during the release cycle.
- Any external tooling that still references the table has one release to migrate.

## Retirement checklist (target: next release + 1)

1. [ ] Release cycle 1 — ship current build with the runtime cleanup above.
       Monitor logs for any residual `comm_asset_mapping` reads (should be zero).
2. [ ] Release cycle 1 — verify Live's `comm_asset_mapping` also contains only
       inactive / empty rows: `SELECT count(*) FILTER (WHERE is_active) FROM comm_asset_mapping;`
3. [ ] Remove the reference-registry entry in `src/lib/comm/referenceRegistry.ts`.
4. [ ] Remove the deprecated `DocumentAssetsPage.tsx` stub and its sidebar link.
5. [ ] Add a lint rule (extend `scripts/lint-no-direct-comm.ts`) that fails the
       build on any reintroduction of `.from("comm_asset_mapping")`.
6. [ ] Publish so Live no longer serves the sidebar entry.
7. [ ] Run the destructive migration:

   ```sql
   DROP TABLE IF EXISTS public.comm_asset_mapping;
   ```

8. [ ] Regenerate Supabase types (automatic after migration).
9. [ ] Delete this cleanup document; retirement is complete.

## Rollback

If the table needs to come back before step 7, no rollback is required — the
table is still present. If step 7 runs and needs to be reversed, restore from
the pre-drop point-in-time backup; row content matters only for audit.
