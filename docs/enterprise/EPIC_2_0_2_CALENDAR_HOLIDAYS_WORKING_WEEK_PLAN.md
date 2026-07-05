# Epic 2.0.2 — Calendar, Holidays & Working Week (Foundation Tabs)

**Status:** Planning (no code / schema changes yet)
**Date:** 2026-07-05
**Wave of:** Epic 2.0 — Organisation Foundation
**Governed by:** `SCREEN_AND_LEGACY_TABLE_GOVERNANCE_RULES.md`, `EPIC_1_1_4_ENTERPRISE_FRAMEWORK_BLUEPRINT.md`

---

## 1. Objective

Introduce **Calendar**, **Holidays**, and **Working Week** as **additive leaves inside the existing Organisation Management shell** (`/admin/org/overview`, `OrganizationManagementShell.tsx`). No standalone calendar module, no parallel screens, no route duplication.

Non-goals:
- Not a new "Calendar Module".
- Not a rewrite of `PublicHolidaysSection`.
- Not a migration of `ia_holidays` (BEMA-adjacent — see §7).
- No change to any BEMA table.

---

## 2. Screen & Legacy Table Compliance (Rules 1–5)

| Rule | Compliance |
|---|---|
| 1. No parallel screens | Add tabs into existing `OrganizationManagementShell` (`_sections.tsx`). |
| 2. Screen ownership note | Not required — no new screen; extending canonical shell. |
| 3. BEMA/legacy protection | `ia_holidays`, `system_office_settings`, `tb_*` untouched. |
| 4. Preferred BEMA integration | Read-only adapter/view only (if ever needed). |
| 5. BEMA impact note | Not triggered by this epic; required before any future retirement wave. |

---

## 3. Existing Assets Inventory

| Asset | Kind | Location | Class |
|---|---|---|---|
| `public_holidays` | Table (11 cols) | DB | ✅ Canonical — reuse |
| `PublicHolidaysSection` | React component (CRUD on `public_holidays`) | `src/components/admin/PublicHolidaysSection.tsx` | ✅ Reuse as-is |
| `GlobalSettings` embed | Consumer of `PublicHolidaysSection` | `src/pages/systemAdmin/GlobalSettings.tsx` | ✅ Keep — do not remove |
| `Calendar` primitive | UI (react-day-picker) | `src/components/ui/calendar.tsx` | ✅ Reuse |
| `calendarAdapter` (ICS) | Legal hearing ICS export | `src/adapters/calendarAdapter.ts` | ✅ Reuse (out-of-scope for this epic) |
| `ia_holidays` | BEMA-adjacent table | DB | ⚠️ Duplicate — do **not** touch here |
| `core_calendar` | Business calendar (working days / cycles) | — | ❌ Missing |
| Working-week policy | Per-org / per-office working days & hours | — | ❌ Missing |

**Verdict:** Holidays surface exists and works. Calendar view and Working Week policy are missing. Neither justifies a new module; both must ship as tabs.

---

## 4. Target IA — additive leaves under Foundation

Extend `SECTIONS[0].leaves` in `src/pages/admin/organization/_sections.tsx`:

```
Foundation
├── Organization Profile        (existing)
├── Locations & Branches        (existing)
├── Departments                 (existing)
├── Modules                     (existing)
├── Designation Hierarchy       (existing)
├── Calendar                    (NEW leaf — read-mostly calendar view)
├── Holidays                    (NEW leaf — wraps <PublicHolidaysSection />)
└── Working Week                (NEW leaf — org/office working-days & hours policy)
```

Routes (auto-derived by the shell — no new route registration required):
- `/admin/org/overview/foundation/calendar`
- `/admin/org/overview/foundation/holidays`
- `/admin/org/overview/foundation/working-week`

Deep links from `GlobalSettings` stay working; the existing embed is unchanged.

---

## 5. Leaf specifications (planning)

### 5.1 Holidays leaf
- Render `<PublicHolidaysSection />` inside a `<ReuseBanner>` explaining "This is the canonical holidays surface — the same component embedded in Global Settings."
- No CRUD rewrite, no data migration.

### 5.2 Calendar leaf
- Read-mostly month/year view on top of `public_holidays`.
- Uses `src/components/ui/calendar.tsx` (react-day-picker) with holiday day markers.
- Filters: year, office (from `office_locations`), holiday type.
- Actions: "Manage holidays" → deep-links to the Holidays leaf. No CRUD here.
- No new tables.

### 5.3 Working Week leaf
- Displays and (post-schema) edits per-org / per-office working days and default working hours.
- Until schema exists (§6), the leaf renders a read-only "Not yet configured" state pointing to this plan. No mock CRUD.

---

## 6. Proposed additive schema — `core_calendar` (NOT executed in this epic)

Only proposed. Requires a follow-up migration wave with its own approval.

```
core_calendar
  id                uuid pk
  scope             text  check in ('org','office')
  scope_ref         uuid  -- core_organization.id or office_locations.id
  name              text
  timezone          text  -- FK-style ref to CORE_TIMEZONE reference group
  working_days      int[] -- ISO weekday numbers, 1=Mon..7=Sun
  work_start_time   time
  work_end_time     time
  is_default        bool
  effective_from    date
  effective_to      date  null
  created_at / updated_at / created_by / updated_by
  unique (scope, scope_ref, effective_from)
```

Rationale:
- Enterprise "working week" is a governance policy, not per-user preference — belongs beside `core_organization` / `office_locations`.
- `public_holidays` remains the day-list source; `core_calendar` layers working-day/hour policy on top.
- Purely additive; no legacy column, table, or semantics changes.

GRANT / RLS: to be defined in the implementation epic (SELECT/INSERT/UPDATE/DELETE to `authenticated`, `ALL` to `service_role`, per platform rule; project uses role-based security, not RLS).

---

## 7. BEMA / legacy posture

- `ia_holidays` (BEMA-adjacent): **not touched**. Any future consolidation into `public_holidays` requires an entry in `docs/enterprise/BEMA_LEGACY_TABLE_IMPACT_NOTE.md` and separate approval. Deferred out of this epic.
- `system_office_settings`, `tb_*`: **not touched**.
- No `bn_*` interaction.

---

## 8. Permissions

Reuse the `organization_management` module and its existing `view` / `manage` / `admin` actions activated in Epic 2.0.1. No new permission rows required.

---

## 9. Implementation waves (subsequent epics)

- **2.0.2a (UI-only, additive):** Add Holidays, Calendar (read-mostly), Working Week (read-only placeholder) leaves to `_sections.tsx`. Wire Holidays to `<PublicHolidaysSection />`.
- **2.0.2b (schema):** Introduce `core_calendar` per §6, with GRANTs and update trigger.
- **2.0.2c (Working Week CRUD):** Back the Working Week leaf with `core_calendar`.
- **Future / gated:** `ia_holidays` consolidation — requires BEMA impact note first.

Each wave ships independently with its own acceptance doc.

---

## 10. Rollback

- 2.0.2a: revert `_sections.tsx` — no data, no routes to unregister.
- 2.0.2b: `DROP TABLE public.core_calendar` (safe — table has no legacy consumer).
- 2.0.2c: retain table, revert UI wiring only.

---

## 11. Acceptance for this planning epic

- Existing Holidays surface identified and reused (no duplicate).
- No standalone calendar module proposed.
- All three capabilities scoped as leaves inside `OrganizationManagementShell`.
- `core_calendar` proposed as additive only; not executed here.
- `ia_holidays` and all BEMA tables untouched.
- Screen & Legacy Table Governance rules 1–5 satisfied.
