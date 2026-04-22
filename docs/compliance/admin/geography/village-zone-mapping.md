# Village-to-Zone Mapping

## 1. Screen Overview
- **Screen name:** Village-to-Zone Mapping
- **Route/path:** `/compliance/admin/geography/village-zone-mapping` (legacy: `/compliance/geography/village-zone-mapping`)
- **Page component:** `src/pages/compliance/geography/VillageZoneMapping.tsx`
- **Parent menu location:** Compliance → Admin → Geography → Village-to-Zone Mapping
- **Screen type:** Mapping (List + Entry + Bulk-update)

## 2. Business Function
Provides **granular village-level routing** of compliance work to zones (and optionally to a specific office). This is the **highest-priority routing source** when an employer's village is known; office→zone serves only as fallback.

It is **configuration / master data** and is the lookup source for assignment automation, queue placement, and inspector workload distribution.

## 3. Primary User Roles
- **Access / Create / Edit / Toggle / Bulk update:** Users with `manage_compliance` permission.
- **Approve:** None — saves immediately.
- **View only:** Not separately modeled.

## 4. UI Responsibilities
- **Header:** Title, description, conditional **Bulk Update (n)** button when rows are selected, **New Mapping** button.
- **Search bar:** Free-text filter across village code / village name / zone code.
- **Grid card:** Columns — checkbox (header & row), Village Code, Village Name (joined from `tb_villages`), Office, Zone (badge + name), Status, row actions (Edit, Toggle Active).
- Row cap: **first 100 results** rendered; trailing helper row instructs user to refine via search.
- **Create / Edit dialog:** `village_code` (locked when editing), `zone_id` (Select of active zones), `office_code` (`OfficeSelect`, allows None), `is_active`.
- **Bulk-update dialog:** target zone (required), optional office change. Updates all selected mappings.

## 5. Main Actions and Business Outcomes
| Action | What it does | Business outcome | DB impact | Downstream |
|---|---|---|---|---|
| **New Mapping** | Opens empty dialog | Adds village→zone routing | `INSERT INTO ce_village_zone_mapping` (`mapping_source = 'MANUAL'`) | Routing assigns new cases for this village to the selected zone |
| **Update** | Patches selected row | Re-routes a village | `UPDATE ce_village_zone_mapping` | Same |
| **Toggle Active** | Flips `is_active` | Soft-disable | `UPDATE ce_village_zone_mapping SET is_active` | Removes village from active routing — falls back to office mapping |
| **Bulk Update** | Updates selected rows' `zone_id` (and optionally `office_code`) | Re-territorialise many villages at once | `UPDATE ... WHERE id IN (...)` | Mass routing change — potentially large workload shift |
| Header checkbox | Selects up to first 100 visible rows | Quick mass-select | n/a | Used for Bulk Update |

## 6. Data Model / Tables Used
| Table | Why | R/W | Key fields | Reused |
|---|---|---|---|---|
| `ce_village_zone_mapping` | Primary entity | R/W | `village_code`, `zone_id`, `office_code`, `is_active`, `mapping_source` | Read here & by **ZoneManagement** (count); other consumers presumed to use it via routing logic — **needs confirmation** |
| `ce_zones` | Active-zone dropdown + grid enrichment | R | `id`, `zone_code`, `zone_name` | See `zones.md` for wide reuse |
| `tb_villages` | Village name lookup for the grid | R (`code IN (...)`) | `code`, `description` | Used in SEP, employer registration, geography lookups |
| `tb_office` (via `OfficeSelect`/`useOfficeCodes`) | Office picker | R | `code`, `description` | Wide reuse |

## 7. Services / Hooks / Queries Used
| Item | Path | Purpose |
|---|---|---|
| Direct `supabase.from('ce_village_zone_mapping')` | inline | Select / insert / update / toggle / bulk update |
| Direct `supabase.from('ce_zones')` | inline | Active zones |
| Direct `supabase.from('tb_villages')` | inline | Village name enrichment |
| `OfficeSelect` | `src/components/compliance/OfficeSelect.tsx` | Office picker (with optional None) |
| `useOfficeCodes` | `src/hooks/compliance/useOfficeCodes.ts` | Source for OfficeSelect |

No service module; queries are inline.

## 8. Validation Rules
| Rule | Where |
|---|---|
| `village_code` required | UI |
| `zone_id` required | UI |
| At most one **active** mapping per village | UI in-memory check (`!editing.id` + `is_active`) |
| `village_code` immutable on edit | UI (input `disabled` when editing) |
| Bulk Update requires `bulkForm.zone_id` AND ≥1 selected row | UI |
| `mapping_source` defaulted to `'MANUAL'` on create | UI |

**Gaps:**
- No DB unique index on `(village_code) WHERE is_active`.
- No FK validation that `village_code` exists in `tb_villages` (UI accepts any string).
- No `created_by` / `updated_by` columns/stamping.
- 100-row hard cap is rendering-side only; bulk-select header only selects the rendered slice.

## 9. Workflow / Approval / Notification Logic
None. Saves are immediate. Bulk update has **no preview, no diff, no approval gate**, despite being a high-impact action.

## 10. Linkages to Other Screens
- Counted by **Compliance Zones** (`ZoneManagement.tsx`) for the deactivation guard and "Villages" column.
- Depends on **Compliance Zones** (`ce_zones`) and **Village master** (`tb_villages`).
- Consumed by assignment routing logic — **needs confirmation** of the exact consumer (no direct file references besides Zones screen).

## 11. Audit Trail / Logging
- **No audit log writes** observed.
- No access logging.
- Bulk updates leave no trace beyond the changed row state.

## 12. Technical Risks / Gaps / Assumptions
- **High-impact bulk update with no audit, no preview, no approval** — single misclick can re-route hundreds of villages.
- **In-memory uniqueness only** — concurrent admins can create competing active mappings.
- **No FK on `village_code`** — typos persist as orphan config.
- **100-row render cap** — bulk "select all" header only acts on visible 100 rows; can mislead users if they searched broader.
- **`mapping_source` is hardcoded to `MANUAL`** — no path here for `IMPORT` / `SYSTEM` provenance distinction (other than what migrations seed).
- **No `created_by` / `updated_by` stamping** — violates project rule "User Identity Tracking in Database Actions".
- **No clear visible consumer** for the table beyond ZoneManagement counter — assignment routing engine is presumed, **needs confirmation**.

## 13. Recommended Improvements
1. Add partial unique index: `UNIQUE (village_code) WHERE is_active`.
2. Add FK from `village_code` to `tb_villages.code` (or validate via trigger).
3. Add `created_by`, `updated_by`, `created_at`, `updated_at` and stamp on save (UserCode rule).
4. Add a **bulk-update preview dialog** showing affected villages and current vs new zone, plus an "Are you sure" gate.
5. Replace the 100-row cap with server-side pagination + filter; make the header checkbox select **filtered**, not just rendered.
6. Persist a `ce_village_zone_change_log` (or reuse generic audit) capturing before/after per row, including bulk-update batches.
7. Surface `mapping_source` in the grid so admins can distinguish manual entries from imports.
8. Document and link the routing consumer of this table from the screen header.

## 14. File References
- Route: `src/components/routing/AppRoutes.tsx` (line 1098)
- Sidebar entry: `src/components/sidebar/menuItems/complianceMenuItems.ts:561`
- Page component: `src/pages/compliance/geography/VillageZoneMapping.tsx`
- Helper component: `src/components/compliance/OfficeSelect.tsx`
- Related hook: `src/hooks/compliance/useOfficeCodes.ts`
- Migrations: `supabase/migrations/` — `ce_village_zone_mapping` create script (read-only)
