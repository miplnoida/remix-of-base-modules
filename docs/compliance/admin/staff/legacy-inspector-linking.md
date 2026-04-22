# Link Legacy Inspectors

## 1. Screen Overview
- **Screen name**: Link Legacy Inspectors
- **Route/path**: `/compliance/admin/staff/link-legacy` (legacy redirect from `/compliance/staff/link-legacy`)
- **Page component**: `src/pages/compliance/staff/LegacyInspectorLinking.tsx`
- **Parent menu location**: Compliance → Admin → Staff
- **Screen type**: Mapping / Migration utility

## 2. Business Function
Bridges the legacy SSB inspector master (`tb_inspector.code`) — used in historical SEP, C3, and case data — to modern system identities (`profiles`) by creating or updating the corresponding `ce_inspectors` row. Without this mapping, legacy records cannot be claimed by a current officer in the new Compliance module, breaking ownership, escalation, and reporting continuity.

- Operational problem: post-migration, every active legacy inspector code must resolve to a logged-in user; this screen makes that one-click.
- Users: Compliance Admin (one-time onboarding + ad-hoc remediation), Data Steward.
- Lifecycle: Configuration / Migration support.

## 3. Primary User Roles
- **Access/Edit**: `compliance_admin`, data steward
- **View**: `compliance_manager`, audit

## 4. UI Responsibilities
- **KPI cards**: Real Inspectors / Linked / Unlinked counts.
- **Mapping table**: Code (mono), Legacy Name, Status badge (Linked/Unlinked), Linked Profile (text when linked, profile selector when not), Action (Link / Unlink).
- **Action button per row**:
  - **Link**: creates or updates `ce_inspectors`; auto-generates `inspector_code = 'INS-<legacy_code>'`, default `max_caseload=50`, `is_active=true`.
  - **Unlink**: clears `profile_id` on the existing `ce_inspectors` row (does not delete the row).
- **Per-row spinner** via `saving` state keyed by `legacy_code` (multi-row submit isolation per project standard).

## 5. Main Actions and Business Outcomes
| Action | Effect | DB | Downstream |
|---|---|---|---|
| Link (no existing `ce_inspectors`) | Create officer row with profile + legacy code | INSERT `ce_inspectors` | Profile becomes a working compliance officer; downstream legacy data resolves to them |
| Link (existing row) | Attach profile to pre-existing legacy-only row | UPDATE `ce_inspectors.profile_id` | Same |
| Unlink | Detach profile from `ce_inspectors` | UPDATE `ce_inspectors.profile_id = null` | Officer remains for legacy data resolution but loses live system identity |

## 6. Data Model / Tables Used
| Table | Purpose | RW | Key Fields | Reused In |
|---|---|---|---|---|
| `tb_inspector` (legacy) | Source list of legacy codes | R | `code`, `insp_name` | SEP `useSEPLookups`, Officer Management dropdown |
| `ce_inspectors` | Target — create/update | R/W | `id`, `profile_id`, `legacy_inspector_code`, `inspector_code`, `is_active`, `max_caseload` | All Compliance modules |
| `profiles` | Profile dropdown | R | `id`, `full_name`, `email`, `user_code`, `is_active` | Global |

## 7. Services / Hooks / Queries Used
- Direct Supabase from page (no hook):
  - `tb_inspector` select with order by `code`
  - `ce_inspectors` select / insert / update
  - `profiles` select where `is_active=true`
- Identity hook: **not used** (gap — `created_by`/`updated_by` not stamped despite `user_code` being available in profile rows).

## 8. Validation Rules
| Rule | Where |
|---|---|
| Profile must be selected before Link | UI (`!selections[r.legacy_code]` disables button + toast on click) |
| Excluded legacy codes filtered | UI constant `EXCLUDED_CODES = ['00','OSC','UNK']` |
| One profile per row (cannot select an already-linked profile) | UI filter `linkedProfileIds` (allows current selection though) |
| Auto-generated `inspector_code` `INS-<code>` uniqueness | **Not enforced at DB level** (gap; relies on legacy code uniqueness) |
| Soft default `max_caseload=50` | UI hardcoded |
| `created_by`/`updated_by` | **Not stamped** (gap) |

## 9. Workflow / Approval / Notification Logic
- None. Direct write.
- No notification when a profile is linked/unlinked.

## 10. Linkages to Other Screens
- **Output consumed by**: every consumer of `ce_inspectors` (workbench, queues, routing, supervisor hierarchy, cases) and any legacy report joining on `tb_inspector.code` via `legacy_inspector_code`.
- **Visible cross-link**: `OfficerManagement.tsx` shows the legacy code/name; this screen is the canonical place to (un)link.

## 11. Audit Trail / Logging
- None. No `system_audit_trail` row, no history table.
- Particularly risky given this is the *bridge* between legacy and current identity.

## 12. Technical Risks / Gaps / Assumptions
- **Hardcoded defaults** (`inspector_code='INS-<code>'`, `max_caseload=50`) — should be configurable.
- **Excluded codes** duplicated across `OfficerManagement` and this page — single source needed.
- **No DB uniqueness** on `inspector_code` or `legacy_inspector_code`; concurrent links could collide.
- **Unlink leaves an orphan `ce_inspectors` row** with no profile — may confuse downstream queries that assume `profile_id IS NOT NULL`.
- **No identity stamping**.
- **No bulk operation** despite the migration-style use case.

## 13. Recommended Improvements
1. Add unique partial indexes on `ce_inspectors.legacy_inspector_code` and `ce_inspectors.profile_id`.
2. Move excluded codes and default `max_caseload` to `app_settings` or a config table.
3. Add bulk-link CSV import with preview (typical migration ergonomics).
4. Stamp `created_by`/`updated_by` and write to `system_audit_trail` for every link/unlink.
5. On Unlink, optionally archive the `ce_inspectors` row instead of leaving it profile-less.
6. Add a downstream impact summary per row (open cases, queue memberships) before allowing Unlink — mirrors the OfficerStatusChangeWizard pattern.

## 14. File References
- Route: `src/components/routing/AppRoutes.tsx` (line 1102)
- Page: `src/pages/compliance/staff/LegacyInspectorLinking.tsx`
- Sibling consumers: `src/pages/compliance/staff/OfficerManagement.tsx`, `src/hooks/useSEPLookups.ts`
