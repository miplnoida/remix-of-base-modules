# SSB Policy Relational Model — Acceptance

Status: DELIVERED
Focus: Social Security Board — St. Kitts & Nevis

Removes JSON-driven active SSB policy configuration and converts it to a
database-driven relational model. All active policy rules are now
searchable, auditable, reportable, validated and versioned via ordinary
SQL rows.

## 1. JSON fields audited

See `SSB_POLICY_JSON_USAGE_AUDIT.md` for full classification. Four active
policy JSON columns were classified `MUST REPLACE`.

## 2. Fields removed

Dropped from `public.ssb_address_policy`:
- `mandatory_fields  jsonb`
- `optional_fields   jsonb`
- `admin_level_codes jsonb`

Dropped from `public.ssb_contribution_calendar_policy`:
- `weekend_days jsonb`

## 3. Relational tables added

### `ssb_address_policy_field`
Represents the ordered list of address components used by an address
policy. `field_kind = 'mandatory' | 'optional'`.

Columns: `policy_id`, `field_code`, `field_kind`, `display_order`,
`created_at`, `updated_at`. Unique per `(policy_id, field_code)`.

### `ssb_address_policy_admin_level`
Represents which admin-hierarchy levels (from `ssp_admin_level`) apply to
this address policy. Referenced by `admin_level_code` so the master
Geography domain remains authoritative.

Columns: `policy_id`, `admin_level_code`, `display_order`, `is_required`,
`created_at`, `updated_at`. Unique per `(policy_id, admin_level_code)`.

### `ssb_contribution_calendar_weekend_day`
Represents the weekend days for a contribution calendar policy.
Weekday `0..6` where `0 = Sunday`.

Columns: `policy_id`, `weekday`, `created_at`. Unique per
`(policy_id, weekday)`.

Grants on all three: `SELECT/INSERT/UPDATE/DELETE` to `authenticated` and
`anon`, `ALL` to `service_role`. RLS intentionally not enabled per the
project's role-based security rule.

## 4. Migration result

Existing JSON data was copied into the new child tables before the JSON
columns were dropped. Live data preserved:

- `ssb_address_policy` (1 KN row) → 4 mandatory fields, 3 optional fields,
  5 admin-level rows.
- `ssb_contribution_calendar_policy` (2 rows) → 2 weekend-day rows each
  (Sun, Sat).

No active-policy row was deleted; no BN/BEMA/IA/legacy table was touched.

## 5. Resolver updates

- `ssbPolicyLifecycleService.createNewVersion` now also clones the child
  rows of the source policy into the new DRAFT (address fields, address
  admin levels, calendar weekend days) via a table-scoped
  `POLICY_CHILD_TABLES` map. This keeps versioning consistent.
- `ssbContributionCalendarService`:
  - `ContributionCalendarPolicy.weekend_days` removed from the type.
  - New helper `loadWeekendDaysForPolicy(policyId)` reads the child table.
  - `calculateContributionDueDate` and `getContributionSchedulePreview`
    accept `weekendDays` (defaults to `[0, 6]`); preview auto-loads from
    the child table when a `policy.id` is available.
  - `adjustForWorkingDay` takes an explicit `weekendDays` parameter.
- `ssbBusinessProcessConfigService` continues to consume
  `resolvePolicy(...)` and is unaffected by column removal.

## 6. UI updates

`/admin/ssb-setup` — JSON editors removed.

- **Address & Geography** (`AddressPolicyForm.tsx`): three JSON fields
  (`mandatory_fields`, `optional_fields`, `admin_level_codes`) removed.
  New relational child editor with checkboxes for mandatory/optional
  address components and admin-hierarchy levels (populated from
  `ssp_admin_level`). Editing an ACTIVE row automatically clones it as a
  new DRAFT before persisting child rows.
- **Contribution Calendar**
  (`ContributionCalendarPolicyForm.tsx`): `weekend_days` JSON textarea
  removed. New relational child editor: checkboxes for Sun–Sat, saves to
  `ssb_contribution_calendar_weekend_day`. Same clone-on-active-edit
  semantics. Due-date preview loads weekend days from the child table.

## 7. Validation updates

- `ssbPolicyHealthService` `ssb.address` now checks the child tables:
  reports "No mandatory address fields configured" when no `field_kind =
  'mandatory'` row exists and "No admin hierarchy levels enabled" when no
  admin-level rows exist for the active policy.
- Contribution-calendar validation
  (`validateContributionCalendarPolicy`) is unchanged and continues to run
  a 12-month preview; the preview implicitly exercises the new
  `weekendDays` child table.
- Governance
  (`ssbConfigurationGovernanceService.runConfigurationValidation`) picks
  up the new failure reasons through `evaluateAllAssetHealth` — no code
  change required in the governance pipeline itself.

## 8. Allowed JSON that remains

- `ssb_configuration_snapshot.snapshot_json` — immutable snapshot payload.
- `ssb_policy_audit.snapshot` — immutable audit payload.
- `ssb_setup_readiness.detail` — cached readiness detail, derived from
  relational sources.

No active-policy JSON remains.

## 9. Legacy impact

**None.** No BN, BEMA, IA or legacy (`ip_*`, `er_*`, `cl_*`, `cn_*`,
`au_*`) table was altered. No business transaction data was migrated.

## 10. Rollback

```sql
-- Recreate JSON columns (empty)
ALTER TABLE public.ssb_address_policy
  ADD COLUMN mandatory_fields  jsonb,
  ADD COLUMN optional_fields   jsonb,
  ADD COLUMN admin_level_codes jsonb;

ALTER TABLE public.ssb_contribution_calendar_policy
  ADD COLUMN weekend_days jsonb;

-- Rebuild JSON payload from the relational child tables
UPDATE public.ssb_address_policy p
SET mandatory_fields = (
  SELECT COALESCE(jsonb_agg(field_code ORDER BY display_order), '[]'::jsonb)
  FROM public.ssb_address_policy_field
  WHERE policy_id = p.id AND field_kind = 'mandatory'
),
optional_fields = (
  SELECT COALESCE(jsonb_agg(field_code ORDER BY display_order), '[]'::jsonb)
  FROM public.ssb_address_policy_field
  WHERE policy_id = p.id AND field_kind = 'optional'
),
admin_level_codes = (
  SELECT COALESCE(jsonb_agg(admin_level_code ORDER BY display_order), '[]'::jsonb)
  FROM public.ssb_address_policy_admin_level
  WHERE policy_id = p.id
);

UPDATE public.ssb_contribution_calendar_policy p
SET weekend_days = (
  SELECT COALESCE(jsonb_agg(weekday ORDER BY weekday), '[0,6]'::jsonb)
  FROM public.ssb_contribution_calendar_weekend_day
  WHERE policy_id = p.id
);

-- Drop child tables
DROP TABLE IF EXISTS
  public.ssb_contribution_calendar_weekend_day,
  public.ssb_address_policy_admin_level,
  public.ssb_address_policy_field;
```

Then revert the code changes in the three services and two form files
listed above.

## 11. Acceptance checklist

- [x] No active SSB policy configuration depends on JSON.
- [x] Policy forms no longer expose JSON editors.
- [x] Resolvers read relational child rows (address fields/admin levels,
      calendar weekend days).
- [x] Governance & health validation checks relational rows.
- [x] Snapshot JSON remains allowed (audit + snapshot only).
- [x] No BN/BEMA/IA/legacy table changed.
- [x] Existing active policy data preserved via backfill.
