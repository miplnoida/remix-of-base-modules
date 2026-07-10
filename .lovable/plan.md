
# EPIC 3D-UX — Communication Hub Unified Listing (phased delivery)

The epic touches ~15 screens. To keep quality high and avoid a single mega-refactor that risks regressions in the safe-state Communication Hub, I'll deliver in three phases. This plan covers **Phase 1 (foundation + highest-traffic operations screens)** now; Phases 2/3 are queued for follow-up epics.

## Phase 1 — this delivery

### 1. Shared primitives (new)
- `src/pages/admin/communicationHub/components/CommunicationHubDataTable.tsx`
  - Generic `<T>` table with: server-friendly pagination (page/pageSize, `10/25/50/100`, default 25, "Showing X–Y of Z"), header sort (asc/desc indicators + controlled `sort` state), sticky first + sticky last (action) column with shadows, density toggle (compact default), loading skeleton, empty state, error state with retry.
  - Columns declared as `{ key, header, sortable?, sticky?: 'left'|'right', className?, cell: (row)=>ReactNode }`.
  - No data fetching inside — callers pass `rows`, `total`, `page`, `pageSize`, `sort`, and `onChange`.
- `src/pages/admin/communicationHub/components/tableFormatters.tsx`
  - Reusable renderers: `MaskedEmail`, `TruncatedId` (with copy-on-click + toast), `RelativeTime`, `AbsoluteTime`, `StatusBadge` (delivery + message + request), `TestLiveBadge`, `RiskBadge`, `YesNoBadge`, `SanitizedPayloadPreview`.
- `src/pages/admin/communicationHub/components/RowActions.tsx`
  - `<IconAction icon={Icon} label="…" onClick tooltip disabled loading confirm?={{title, description, danger}} />` wrapper that:
    - renders `Button size="icon-sm"` with `aria-label`, `title`, tooltip
    - opens shadcn `AlertDialog` for destructive/confirm actions
    - shows spinner while `onClick` promise pending
  - Predefined icon set constants: `ACTION_ICONS = { view: Eye, timeline: Clock, copy: Copy, retry: RotateCcw, cancel: XCircle, unlock: Unlock, expand: Braces, proposal: FileText, preflight: ShieldCheck, send: Send, download: Download, external: ExternalLink }`.

### 2. Screens migrated in Phase 1
Focus on the four operations pages that are hit most and are wide-table-heavy:

1. **Delivery Monitor** (`/admin/communication-hub/delivery-monitor`)
   - Server-side pagination + sort via `communication_message`.
   - Sticky first `request_no`, sticky last actions (View / Timeline / Copy provider id).
   - Filters row: date range, module, event, channel, test/live, message_status, delivery_status, search.
2. **Dispatch Register** (`/admin/communication-hub/dispatch-register`)
   - Server-side pagination + sort; sticky first/last; icon actions View / Copy.
3. **Lifecycle Event Log** (`/admin/communication-hub/lifecycle-log`)
   - Server-side pagination; sticky first `occurred_at`; expand-payload icon action opens a sanitized dialog.
4. **Failed & Retry Queue** (`/admin/communication-hub/retry-queue`)
   - Server-side pagination; sticky first/last; icon actions Retry / Cancel / Clear Lock with confirm dialogs (existing RPC calls preserved).

For each screen I'll:
- Keep the existing route/component skeleton, only replacing the internal table + filters + actions.
- Preserve every existing permission check and RPC/edge call.

### 3. Regression + safety
- Typecheck (`tsgo`) at the end.
- Manual scan for existing safety guards — no changes to `sendCommunication`, `comm-hub-dispatch`, live gates, event status, cron, notification_queue/logs writes, or provider calls.

## Phase 2 — queued (next epic)

- Communication Requests, Request Detail sublists (recipients / messages / attempts / events), Print Queue.

## Phase 3 — queued (next epic)

- Business Module Readiness Matrix, Event Template Mapping Panel, Live Readiness Governance Panel, Operator Rehearsal result tables, Generic Event Pilot history, Business Module Communication Registry.

## Not in this epic
- No new backend endpoints; server-side pagination uses existing `.range()/.order()/count:'exact'` against tables that already back the current screens.
- No changes to backend safety rails, cron, live windows, provider calls, or notification tables.

## Technical detail

- Sticky columns use `position: sticky; left/right: 0; z-index: 1;` inside an overflow-x container plus `shadow-[inset_-8px_0_8px_-8px_rgba(0,0,0,0.15)]` (left) / mirrored (right) so the user perceives scroll.
- Sort state serialized to URL only if it's already URL-driven for that screen; otherwise held in local state to avoid changing router behavior.
- Page size preference and density preference stored in `localStorage` under `comm-hub:table:{screenKey}`.
- Confirm dialogs re-use existing `AlertDialog` shadcn primitive.
- Icon buttons use `size="icon-sm"` from local button variants; if the variant doesn't exist locally I'll add it as a one-line extension of `buttonVariants`, per AI Elements primitive-fix guidance.

## Deliverables (Phase 1)

- 3 new shared files under `src/pages/admin/communicationHub/components/`
- 4 screens migrated
- Typecheck green
- Report following the epic's Part I structure, with Phase 2/3 next-epic recommendations
