# `comm_asset_mapping` cleanup report

Prepared as part of Phase 8 completion. **No destructive migration has been run** —
this document is the safety review the user requested before we drop the table.

## Row inventory (Test / Development)

Query used:

```sql
SELECT * FROM comm_asset_mapping ORDER BY created_at;
```

| id | asset_id | category | communication_type | scope | priority | is_active | created_at | updated_at |
|---|---|---|---|---|---|---|---|---|
| `4fbc8a87-7d2b-4f73-96cc-5f5bedcaf7d7` | `c5d5969a-a8fb-4b11-bf0c-7a5ff3ec7446` | `letterhead_header` | `doc_payment_receipt` | GLOBAL (no module/dept/location/org) | 100 | **false** | 2026-06-26 | 2026-06-27 |
| `4b71ab93-b43a-4299-9235-82d18757e9c9` | `7fb949d0-97a5-4007-88c7-4055e415f8df` | `logo`               | `doc_payment_receipt` | GLOBAL (no module/dept/location/org) | 100 | **false** | 2026-06-27 | 2026-06-27 |

Both rows are `is_active = false`. Neither maps to a specific organization,
module, department, or location — they were global fallbacks that have already
been superseded by the Configuration Center engine.

## Migration status

- Communication resolution now flows through `core_configuration_assignment`
  (see `src/lib/configuration/resolver.ts`).
- The two rows above have **no active runtime dependency**; they would only be
  read if a caller invoked the legacy `resolve_comm_asset` RPC — which no code
  path does after Phase 7 cutover.

## Runtime references remaining

`rg comm_asset_mapping src/` still shows three call sites:

| File | Purpose | Action |
|---|---|---|
| `src/lib/enterprise/resolvers/assetSlotResolver.ts` | Legacy fallback branch of the asset resolver | Retained as **read-only fallback** so any accidental legacy call still works during the deprecation window. Marked for removal once Phase 9 lint gate is green for 30 days. |
| `src/lib/enterprise/healthChecks.ts` | Health check that counts rows | Harmless read. |
| `src/pages/admin/organization/DocumentAssetsPage.tsx` | Legacy admin writer | Replaced by the Configuration Center Branding domain. Will be deleted when the DocumentAssetsPage is retired. |

## Recommendation

**Safe to drop** in Test now:

```sql
DROP TABLE IF EXISTS public.comm_asset_mapping;
```

Prerequisites before executing the drop:

1. Publish current code so Live no longer reads the table.
2. Update `src/lib/enterprise/resolvers/assetSlotResolver.ts` to remove the
   legacy fallback branch.
3. Update `src/lib/enterprise/healthChecks.ts` to drop the row count.
4. Update `src/pages/admin/organization/DocumentAssetsPage.tsx` to write
   through the Configuration Center instead.
5. Only then run the destructive migration above.

Until steps 2–4 are done, the drop stays deferred — this matches the standing
"never drop with live readers" rule.
