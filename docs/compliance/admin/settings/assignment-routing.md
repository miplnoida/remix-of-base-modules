# Assignment Routing Rules

## 1. Screen Overview
- **Screen name**: Assignment Routing Rules
- **Route/path**: `/compliance/admin/settings/assignment-routing`
- **Page component**: `src/pages/compliance/settings/AssignmentRoutingRules.tsx`
- **Parent menu location**: Compliance → Admin → Settings (`app_modules.name = 'ce_assignment_routing'`, sort_order 3)
- **Screen type**: Settings / List + Dialog CRUD

## 2. Business Function
Defines **how a newly raised violation is routed to a work queue**, based on a priority-ordered match of (violation type, office, zone) → target queue. Replaces hardcoded inspector/queue assignment logic with a configurable rule book. Supports the optional "requires review" flag so a supervisor signs off before the queue picks the case up.

Used by **Compliance Admin / Operations Manager** at initial set-up and whenever the office/zone footprint or queue topology changes.

## 3. Primary User Roles
- **Access / Edit / Delete**: Compliance Admin, Operations Manager.
- **View only**: Supervisors with read-only role.
- **No approval role** — changes are live on save.

## 4. UI Responsibilities
- Title bar with `New Rule` button.
- Single table sorted by `priority` (lower number = higher priority): Priority, Rule Name, Violation Type, Office, Zone, Target Queue (with type badge), Review flag, Status, Actions (Edit / Toggle Power / **Delete**).
- **Add/Edit dialog**: rule_name (required, ≤100), priority (1–999), office_code (via `OfficeSelect`, "Any" allowed), violation_type_id (Any allowed), zone_id (Any allowed), target_queue_id (required), `requires_review`, `is_active`.
- Inline conflict-detection: prevents two active rules with the same (violation_type, office, zone, target_queue) combination.

## 5. Main Actions and Business Outcomes
| Action | Effect | DB Impact | Downstream |
|---|---|---|---|
| **New / Edit Rule** | INSERT/UPDATE rule. Conflict check enforced. | `ce_assignment_routing_rules` | Routing engine evaluates rules in priority order; first match wins. New rule active immediately. |
| **Toggle Power** | Flip `is_active`. | UPDATE | Rule excluded/included from routing engine. |
| **Delete** | **Hard delete** (`.delete()`). User confirms via `confirm()`. | DELETE | Rule gone permanently. Existing assignments unaffected (already routed). |

## 6. Data Model / Tables Used
| Table | R/W | Why | Key fields | Reused in |
|---|---|---|---|---|
| `ce_assignment_routing_rules` | RW | Routing rule book | `rule_name`, `priority`, `violation_type_id` (nullable=Any), `office_code` (nullable=Any), `zone_id` (nullable=Any), `target_queue_id`, `requires_review`, `is_active` | Compliance routing engine (when violations are raised), Workbench (case routing) |
| `ce_assignment_queues` | R | Target queue lookup | `id`, `queue_code`, `queue_name`, `queue_type` (`is_active=true`) | Queue Members screen, Workbench queues |
| `ce_violation_types` | R | Type lookup | `id`, `code`, `name` (`is_active=true`) | Violation Types screen, Rule Engine |
| `ce_zones` | R | Zone lookup | `id`, `zone_code`, `zone_name` (`is_active=true`) | Zone Management, Office/Village mapping screens |
| `er_master` (indirectly via `OfficeSelect`) | R | Office code lookup | `office_code` | Most employer/compliance screens |

## 7. Services / Hooks / Queries Used
- `OfficeSelect` (`@/components/compliance/OfficeSelect`) — office picker with "Any" option.
- Direct `supabase.from(...).select/insert/update/delete` — no service layer used.
- `Promise.all` parallel fetch of rules + queues + violation types + zones in `fetchData`.
- No React Query — local `useState` + `useEffect`.

## 8. Validation Rules
| Rule | Where |
|---|---|
| `rule_name` required, max 100 | UI |
| `priority` integer 1–999 | UI |
| `target_queue_id` required | UI |
| Combination uniqueness `(violation_type_id, office_code, zone_id, target_queue_id)` for active rules | UI `validate()` (in-memory check against loaded rules) |
| Audit fields (`created_by`/`updated_by`) | **Not populated** by this screen (gap — see §12) |

No DB constraints / triggers identified beyond FK references.

## 9. Workflow / Approval / Notification Logic
- None. Direct save.
- No notifications fired on rule changes.
- No approval before delete; only `confirm()` browser dialog.

## 10. Linkages to Other Screens
- **Violation Types** — supplies routing dimension.
- **Zones** — supplies routing dimension.
- **Queue Members** — defines who works inside the target queue.
- **Officers / Inspectors** — feeds queues with assignable people.
- **Workbench / Cases** — receive routed work after engine match.
- Note: a `target_inspector_id` field exists on the row interface but the dialog does not expose it (likely deprecated direct-to-inspector routing in favour of queue-based routing).

## 11. Audit Trail / Logging
- **No audit fields populated** by this screen (does not call `withAuditFields` / `useUserCode`). If `created_by`/`updated_by` columns exist on the table they will be NULL after writes from this UI.
- No history table.
- No access log.

## 12. Technical Risks / Gaps / Assumptions
- **Hard delete** — destroys rules without preserving history. Inconsistent with the soft-delete convention of every other settings screen in this batch.
- **Browser `confirm()`** for destructive actions — not consistent with the AlertDialog pattern used elsewhere.
- **Audit fields not stamped** — violates project Knowledge Repository entry "User Identity Tracking in Database Actions".
- **Conflict check is client-side only** — two admins editing concurrently can both create the same combination; no DB unique index identified.
- **`target_inspector_id`** present on row type but unsupported by UI — likely partial migration to queue-only routing.
- **No "test routing" tool** — cannot dry-run a hypothetical violation against the rule set.
- **No category enum on `queue_type`** displayed; relies on whatever the queue table stores.

## 13. Recommended Improvements
1. Convert delete to soft-delete + add Inactive filter; surface deactivation in an AlertDialog.
2. Inject audit fields via the shared `withAuditFields` helper and `useUserCode`.
3. Add a partial unique index in the DB on `(violation_type_id, office_code, zone_id, target_queue_id) WHERE is_active`.
4. Either re-enable inspector-direct routing or remove the unused `target_inspector_id` column.
5. Add a "Test routing" panel that takes (violation_type, office, zone) and shows which rule wins.
6. Migrate to React Query for cache + optimistic updates, in line with sibling screens.

## 14. File References
- Route: `src/components/routing/AppRoutes.tsx` (line ~1079)
- Page: `src/pages/compliance/settings/AssignmentRoutingRules.tsx`
- Component: `src/components/compliance/OfficeSelect.tsx`
- Migrations: `supabase/migrations/*ce_assignment_routing_rules*`, `*ce_assignment_queues*`
- Types: `src/integrations/supabase/types.ts`
