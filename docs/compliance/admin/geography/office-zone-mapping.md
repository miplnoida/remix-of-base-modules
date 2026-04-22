# Office-to-Zone Mapping

## 1. Screen Overview
- **Screen name:** Office-to-Zone Mapping
- **Route/path:** `/compliance/admin/geography/office-zone-mapping` (legacy: `/compliance/geography/office-zone-mapping`)
- **Page component:** `src/pages/compliance/geography/OfficeZoneMapping.tsx`
- **Parent menu location:** Compliance → Admin → Geography → Office-to-Zone Mapping
- **Screen type:** Mapping (List + Entry dialog)

## 2. Business Function
Maps each **SSB office code** (`tb_office`) to one or more **compliance zones** (`ce_zones`) for **fallback routing**. When a violation/case is generated for an employer where the village→zone path is unavailable or unset, the system falls back to office→zone. Each office can have:
- Exactly **one default zone** (active),
- Plus any number of alternate (non-default) mappings used by routing rules / manual selectors.

This is **configuration / master data**, used by routing automation and any screen that needs to infer a zone from an office.

## 3. Primary User Roles
- **Access / Create / Edit / Toggle Active:** Users with `manage_compliance` permission.
- **Approve:** None — immediate save.
- **View only:** Not separately modeled.

## 4. UI Responsibilities
- **Header:** Title, description, **New Mapping** button.
- **Grid card:** Columns — Office Code, Zone Code badge, Zone Name, **Priority** (Default vs Alternate), Status, row actions (Edit, Toggle Active).
- **Create / Edit dialog:** `office_code` (via `OfficeSelect`), `zone_id` (Select of active zones only), `is_default` checkbox, `is_active` checkbox.
- No filters, no search, no bulk action, no pagination.

## 5. Main Actions and Business Outcomes
| Action | What it does | Business outcome | DB impact | Downstream |
|---|---|---|---|---|
| **New Mapping** | Opens empty dialog | Defines an office→zone routing path | `INSERT INTO ce_zone_office_mapping` | Used by routing/auto-assignment to pick a zone when only an office is known |
| **Update** | Patches selected row | Re-points an office to another zone or flips default | `UPDATE ce_zone_office_mapping` | Immediately changes future assignment outcomes |
| **Toggle Active** | Flips `is_active` | Soft-disables a mapping | `UPDATE ce_zone_office_mapping SET is_active` | Removed from selectors; routing falls through to remaining mappings |

## 6. Data Model / Tables Used
| Table | Why | R/W | Key fields | Reused |
|---|---|---|---|---|
| `ce_zone_office_mapping` | Primary entity | R/W | `office_code`, `zone_id`, `is_default`, `is_active` | **Currently this screen only** (no other consumer file references it directly — likely consumed via routing logic / RPC, **needs confirmation**) |
| `ce_zones` | Lookup of active zones for the dialog and grid enrichment | R (active only) | `id`, `zone_code`, `zone_name` | Wide reuse — see `zones.md` |
| `tb_office` (via `OfficeSelect` / `useOfficeCodes`) | Office picker | R | `code`, `description` | Wide reuse across Compliance & Cashier |

## 7. Services / Hooks / Queries Used
| Item | Path | Purpose |
|---|---|---|
| Direct `supabase.from('ce_zone_office_mapping')` | inline | Select / insert / update / toggle |
| Direct `supabase.from('ce_zones')` | inline | Active-zone dropdown source |
| `OfficeSelect` | `src/components/compliance/OfficeSelect.tsx` | Office picker UI |
| `useOfficeCodes` | `src/hooks/compliance/useOfficeCodes.ts` | Source for `OfficeSelect` |

No service module; queries are inline.

## 8. Validation Rules
| Rule | Where |
|---|---|
| `office_code` required | UI |
| `zone_id` required | UI |
| Only one **active default** mapping per office | UI (in-memory check; **not enforced in DB** in this code path) |
| (office_code + zone_id) must be unique | UI (in-memory check) |

**Gaps:**
- Both uniqueness and "single default" are client-side only — race conditions can yield two active defaults for the same office.
- No FK validation for `zone_id` against active zones at DB-level (UI hides inactive ones from the dropdown but does not block historical inactive ones).
- No `created_by` / `updated_by` stamping.

## 9. Workflow / Approval / Notification Logic
None. No draft, no approval, no notifications, no timeline writes.

## 10. Linkages to Other Screens
- Depends on **Compliance Zones** (`ce_zones`) — upstream config.
- Depends on **Office master** (`tb_office`).
- Consumed by routing logic (Assignment Queues / Routing Rules / Risk Operations) — **assumption / needs confirmation** that they read from `ce_zone_office_mapping` (no direct grep hit; may be via stored procedure / RPC).

## 11. Audit Trail / Logging
- **No audit log observed.**
- No access logging.
- Configuration history not retrievable.

## 12. Technical Risks / Gaps / Assumptions
- **Single-default rule enforced only in UI** — risk of duplicate active defaults per office.
- **Uniqueness enforced only in UI** — duplicates possible under concurrency.
- **No audit columns or log** — non-traceable changes to a routing master.
- **No pagination** — full table fetch.
- **No clear consumer reference** in client code for `ce_zone_office_mapping` aside from this screen — risk that the table is configured but not read anywhere (orphan config). **Needs confirmation** with the routing engine / RPCs.

## 13. Recommended Improvements
1. Add a partial unique index: `UNIQUE (office_code) WHERE is_default AND is_active`.
2. Add unique index `(office_code, zone_id)`.
3. Add `created_by` / `updated_by` / `created_at` / `updated_at` and stamp on save.
4. Add a `mapping_source` column (similar to Village mapping) to differentiate `MANUAL` vs `IMPORT` rows.
5. Confirm and document the consumer (routing function/RPC) that uses these rows; expose it in the screen header so admins know what their changes affect.
6. Add change log via reusable audit framework.
7. Add server-side pagination + search/filter (by office or zone) once data grows.

## 14. File References
- Route: `src/components/routing/AppRoutes.tsx` (line 1097)
- Sidebar entry: `src/components/sidebar/menuItems/complianceMenuItems.ts:560`
- Page component: `src/pages/compliance/geography/OfficeZoneMapping.tsx`
- Helper components: `src/components/compliance/OfficeSelect.tsx`
- Related hook: `src/hooks/compliance/useOfficeCodes.ts`
- Migrations: `supabase/migrations/` — `ce_zone_office_mapping` create script (read-only)
