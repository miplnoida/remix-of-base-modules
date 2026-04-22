# Compliance Zones

## 1. Screen Overview
- **Screen name:** Compliance Zones (Zone Management)
- **Route/path:** `/compliance/admin/geography/zones`
  - Legacy redirects: `/compliance/geography/zones`, `/bema/zones`
- **Page component:** `src/pages/compliance/geography/ZoneManagement.tsx`
- **Parent menu location:** Compliance → Admin → Geography → Zones
- **Screen type:** List + Entry (CRUD with inline dialog)

## 2. Business Function
Defines the **enterprise zonal hierarchy** that drives compliance territory routing. A zone is the atomic unit Compliance uses to:
- Group employers/villages/offices for assignment of inspectors and review queues.
- Provide a fallback territory when finer-grained (village) routing is unavailable.
- Carry a free-text `territory` label (e.g. "St. Kitts South") for human reporting.

It is **configuration / master data**, owned by Compliance Admins, and consumed by execution screens (Assignment Queues, Routing Rules, Officer Management, Violations Management, Risk Operations).

## 3. Primary User Roles
- **Access:** Anyone with `manage_compliance` permission (per `complianceMenuItems.ts`).
- **Edit / Create / Activate-Deactivate:** Same — only `manage_compliance` users.
- **Approve:** No approval gate — changes are immediate.
- **View only:** Not separately modeled; downstream screens only read `is_active = true` zones.

## 4. UI Responsibilities
- **Header:** Title, description, **New Zone** button.
- **Grid card:** `ce_zones` rows with columns: Zone Code, Zone Name, Territory, Office, **Queues** count (from `ce_assignment_queues`), **Villages** count (from `ce_village_zone_mapping`), Status, row actions (Edit, Toggle Active).
- **Create / Edit dialog:** Fields — `zone_code` (max 10), `zone_name` (max 100), `territory` (free text), `office_code` (via `OfficeSelect`), `is_active` checkbox.
- **No filters, no bulk actions, no pagination** (full table fetch).
- **Loader spinner** while fetching.

## 5. Main Actions and Business Outcomes
| Action | What it does | Business outcome | DB impact | Workflow / downstream |
|---|---|---|---|---|
| **New Zone** | Opens empty dialog | Adds a new compliance territory | `INSERT INTO ce_zones` | New zone becomes selectable in routing rules, queues, mappings |
| **Update** (edit dialog Save) | Patches selected row | Renames/recodes zone, switches default office | `UPDATE ce_zones` | Affects every screen reading the zone (queue dashboards, officer maps, etc.) |
| **Toggle Active** (Power icon) | Flips `is_active` | Removes zone from active selectors without deletion | `UPDATE ce_zones SET is_active` | **Guarded** — refuses if active queues OR village mappings still reference it |
| **(implicit) Save uppercase** | Forces `zone_code` to uppercase before insert | Enforces canonical code format | Stored in upper-case | Avoids casing-collision lookups elsewhere |

## 6. Data Model / Tables Used
| Table | Why used | R/W | Key fields | Reused in |
|---|---|---|---|---|
| `ce_zones` | Primary entity | R/W | `id`, `zone_code`, `zone_name`, `territory`, `office_code`, `parishes` (JSON, displayed but not edited here), `is_active` | `useZones`, `MultiZoneFilter`, `ZoneSelector`, `OfficeZoneMapping`, `VillageZoneMapping`, `RiskOperations`, `AssignmentRoutingRules`, `OfficerManagement`, `ViolationDetails`, `ViolationsManagement`, `AssignmentQueues`, `complianceDataService` |
| `ce_assignment_queues` | Read-only count for "Queues" column + deactivation guard | R | `zone_id` | Compliance → Operations (Assignment Queues, Review Queue), Staff (QueueMembers), Violations Mgmt, Routing Rules |
| `ce_village_zone_mapping` | Read-only count for "Villages" column + deactivation guard | R | `zone_id` | Geography → Village-to-Zone Mapping |
| `tb_office` (via `OfficeSelect` → `useOfficeCodes`) | Lookup for `office_code` field | R | `code`, `description` | Used widely across Compliance & Cashier |

The `parishes` JSON column exists on the row interface but the dialog does not currently expose an editor for it. **Assumption / needs confirmation:** parishes is set via migration seed only.

## 7. Services / Hooks / Queries Used
| Item | Path | Purpose |
|---|---|---|
| Direct `supabase.from('ce_zones')` | inline in `ZoneManagement.tsx` | Select / insert / update zones |
| Direct `supabase.from('ce_assignment_queues')` | inline | Aggregate queue counts per zone |
| Direct `supabase.from('ce_village_zone_mapping')` | inline | Aggregate village counts per zone |
| `OfficeSelect` component | `src/components/compliance/OfficeSelect.tsx` | Office picker (uses `useOfficeCodes` → `tb_office`) |
| `useOfficeCodes` | `src/hooks/compliance/useOfficeCodes.ts` | Active office list |
| `useZones` (consumer-side, not used here) | `src/hooks/useZones.ts` | Same table read by other screens (5-min cache) |

No dedicated service file — all DB calls are inline. This screen does not use React Query; consumers do.

## 8. Validation Rules
| Rule | Where enforced |
|---|---|
| `zone_code` required | UI (`validate()` in component) |
| `zone_code` ≤ 10 chars | UI |
| `zone_name` required, ≤ 100 chars | UI |
| `zone_code` unique (case-insensitive) | UI in-memory check against current list |
| Cannot deactivate zone with active queues OR village mappings | UI (`toggleActive`) |
| `zone_code` stored upper-case | UI (forced on save) |

**Gaps:**
- Uniqueness is only checked client-side; **no DB unique index is asserted in this file**. Race-conditions possible.
- No validation that `office_code` exists in `tb_office` (OfficeSelect prevents bad selection but no FK).
- No `created_by` / `updated_by` audit stamping.

## 9. Workflow / Approval / Notification Logic
None. Save / Update / Toggle is immediate, no draft state, no approval matrix, no notification triggers, no timeline event written. Configuration changes are not currently wired into the audit/workflow engine.

## 10. Linkages to Other Screens
**Configures (downstream consumers of `ce_zones`):**
- Office-to-Zone Mapping (`/compliance/admin/geography/office-zone-mapping`)
- Village-to-Zone Mapping (`/compliance/admin/geography/village-zone-mapping`)
- Assignment Routing Rules (`/compliance/admin/settings/assignment-routing`)
- Risk Operations (`/compliance/admin/risk-operations`)
- Operations → Assignment Queues, Review Queue
- Staff → Officer Management, Queue Members
- Violations Management & Violation Details
- Weekly Plan (`MultiZoneFilter`, `ZoneSelector`)
- `complianceDataService` aggregations

**Navigated from:** sidebar only; no deep links from other screens were detected.

## 11. Audit Trail / Logging
- **No audit table writes** observed (no `*_audit_log` insert, no `audit_*` triggers detected on this code path).
- No access logging.
- Configuration history is **not retrievable** — historical zone names/codes are lost on update.

## 12. Technical Risks / Gaps / Assumptions
- **Client-side uniqueness only** — needs a DB unique constraint on `lower(zone_code)`.
- **No audit columns / no audit log** — high-risk for a routing master.
- **`parishes` field unmanaged in UI** — likely stale.
- **Inline Supabase queries** — duplicated logic (`useZones` exists but isn't reused here).
- **Toggle-active guard is client-side** — a stale list lets you deactivate a zone that just got referenced.
- **Hardcoded page-size: full table fetch** — fine today (zone count is low), but no pagination if it grows.
- **No `created_by` / `updated_by` stamping** — violates project rule "User Identity Tracking in Database Actions".

## 13. Recommended Improvements
1. Add a unique index on `(lower(zone_code))` and surface duplicate-key errors.
2. Add `created_by`, `updated_by`, `created_at`, `updated_at` and stamp from current user (UserCode rule).
3. Move queries into a `zonesService` / extend `useZones` so this screen uses the same cached source as readers.
4. Add a `ce_zone_change_log` (or reuse generic audit) to capture before/after on every update + activation toggle.
5. Promote deactivation guard to a DB trigger or RPC so it cannot be bypassed.
6. Expose `parishes` editor or remove the column from the row type until it has UI.
7. Add server-side pagination + search once zone count grows.

## 14. File References
- Route: `src/components/routing/AppRoutes.tsx` (line 1096), `src/pages/compliance/Routes.tsx`
- Sidebar entry: `src/components/sidebar/menuItems/complianceMenuItems.ts:559`
- Page component: `src/pages/compliance/geography/ZoneManagement.tsx`
- Helper component: `src/components/compliance/OfficeSelect.tsx`
- Related hook: `src/hooks/useZones.ts`, `src/hooks/compliance/useOfficeCodes.ts`
- Types: generated in `src/integrations/supabase/types.ts` (read-only)
- Migrations: `supabase/migrations/` — search for `create table*ce_zones` (read-only, not opened here)
