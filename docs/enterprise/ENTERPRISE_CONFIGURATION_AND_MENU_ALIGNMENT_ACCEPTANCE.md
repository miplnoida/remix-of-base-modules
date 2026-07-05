# Enterprise Configuration & Menu Alignment — Acceptance

Related: `docs/enterprise/ENTERPRISE_CONFIGURATION_ARCHITECTURE.md`
Scope: Menu IA alignment only. No schema changes. No new business modules.

## 1. Problem

`PlatformAdmin.tsx` had already been reorganised (Organisation vs Shared
Domains), but the live left sidebar is driven by `app_modules`. In the live
tree the six shared-domain rows were parented directly under **Administration**
alongside the seven `admin_*` groups, so users saw Geography / Identity /
Financial Reference / Legal Reference / Participant / Communication scattered
inside the Administration node instead of a single **Shared Domains** group.

## 2. Change

Introduced a new parent `app_modules` row **Shared Domains** and re-parented the
existing six shared-domain rows underneath it. No new leaf routes. No route,
name or permission changed on any existing row.

### New parent row

| id | name | display_name | route | parent_id | sort_order |
| --- | --- | --- | --- | --- | --- |
| `2c2c0000-0000-4000-8000-000000000200` | `shared_domains` | Shared Domains | *(none)* | `aab5fcb8-51fb-4a5c-8a87-6cef31068b47` (Administration) | 25 |

### Rows re-parented (parent_id only)

| id | name | route | parent_id BEFORE | parent_id AFTER |
| --- | --- | --- | --- | --- |
| `2c2c0000-0000-4000-8000-000000000220` | geography_domain | /admin/geography | Administration | Shared Domains |
| `2c2c0000-0000-4000-8000-000000000230` | identity_domain | /admin/identity | Administration | Shared Domains |
| `2c2c0000-0000-4000-8000-000000000240` | financial_reference_domain | /admin/financial-reference | Administration | Shared Domains |
| `2c2c0000-0000-4000-8000-000000000250` | legal_reference_domain | /admin/legal-reference | Administration | Shared Domains |
| `2c2c0000-0000-4000-8000-000000000260` | participant_domain | /admin/participant | Administration | Shared Domains |
| `2c2c0000-0000-4000-8000-000000000270` | communication_domain | /admin/communication-domain | Administration | Shared Domains |

Documents: no `app_modules` row exists for `/admin/documents` today; not
created here (out of scope — a Document Domain decision is pending per the
Shared Domain Consumption Map).

## 3. What did NOT change

- Zero legacy tables touched (BEMA / IA / BN / legacy `ip_*`, `er_*`, `cl_*`,
  `cn_*`).
- No new leaf routes, no route renames.
- All row `name` values unchanged → `role_permissions` and `has_permission()`
  continue to resolve exactly as before.
- Organisation Management (`e1a00000-0000-4000-8000-000000000001`) children
  unchanged (Profile, Locations, Departments, Designations, Branding assets,
  Calendar & Holidays, etc.).
- Platform Admin cards already matched the intended IA — `PlatformAdmin.tsx`
  requires no further edit in this pass.

## 4. Permissions verification

`role_permissions` join by `module_name`. Because we only changed `parent_id`
on the six domain rows, every existing permission grant remains valid.
Admin / Application Admin roles bypass permission filtering via `is_admin()`.

## 5. Current user access verification

- Admin: sees all groups (bypass).
- Application Admin: sees Shared Domains group because at least one child is
  granted (`useNavigationMenu` keeps a parent whenever any descendant is
  accessible).
- Non-privileged users: unchanged — they see only what they were previously
  granted, now grouped under Shared Domains instead of Administration root.

## 6. No duplicate rows

Verified before insert:

```sql
SELECT id, name FROM app_modules WHERE name = 'shared_domains';
-- 0 rows before, 1 row after.
```

No sibling row shares the new UUID or name.

## 7. Rollback

```sql
-- Restore previous parents
UPDATE app_modules SET parent_id = 'aab5fcb8-51fb-4a5c-8a87-6cef31068b47'
WHERE id IN (
  '2c2c0000-0000-4000-8000-000000000220',
  '2c2c0000-0000-4000-8000-000000000230',
  '2c2c0000-0000-4000-8000-000000000240',
  '2c2c0000-0000-4000-8000-000000000250',
  '2c2c0000-0000-4000-8000-000000000260',
  '2c2c0000-0000-4000-8000-000000000270'
);

-- Remove the Shared Domains parent
DELETE FROM app_modules WHERE id = '2c2c0000-0000-4000-8000-000000000200';
```

## 8. Acceptance checklist

- [x] Live left menu shows Shared Domains as one group.
- [x] Geography / Identity no longer sit under Organisation in the live sidebar
      (they were already directly under Administration, now moved into Shared
      Domains).
- [x] `PlatformAdmin.tsx` cards match live grouping.
- [x] No duplicate `app_modules` rows.
- [x] No route removed or renamed.
- [x] No legacy table changed.
- [x] Admin / Application Admin users can access the same screens.
