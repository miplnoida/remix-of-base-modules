
# EPIC CH-UX-1 + CH-TRACE-HARDEN-1 — Plan

Scope is large (19 screens + RLS + schema fix + UI polish). To keep this safe and reviewable I will execute in four sequenced waves, each independently verifiable. No live sending, no cron, no bulk, no gate changes at any point.

## Wave 1 — Trace hardening (highest leverage, smallest surface)

**Part C — Delivery attempt schema fix**
1. Inspect actual columns of `communication_delivery_attempt` via `supabase--read_query`.
2. Update `traceService.ts` `DeliveryAttemptLite` and `listDeliveryAttemptsForRequest` to use real columns:
   `attempt_no`, `started_at`, `finished_at`, `provider_id`, `provider_message_id`, `status`, `error_code`, `error_message`, `provider_response`.
   Drop `attempted_at` if not present.
3. Update `TraceDetailPage` display accordingly (column headers, sort key).

**Part B — Trace RLS hardening (migration)**
- Restrict SELECT on `communication_hub_trace`, `communication_hub_trace_step`, and the unified view to:
  `has_role(auth.uid(), 'admin')` OR existing Comm Hub admin permission check.
- Replace any broad `authenticated` SELECT policy. Keep INSERT paths for edge functions via `service_role` (unaffected).
- Verify `communication_hub_trace_unified_view` runs `security_invoker=true` so it inherits base-table RLS.

## Wave 2 — Trace list/detail polish (Part D)

- `TraceCenterPage` list columns: Current Stage, Blocked Stage, Last Passed Stage, Next Expected Stage, R/M/P flags, Status, Plain-language blocker.
  - Derive "Last Passed" / "Next Expected" from `TRACE_STAGES` ordering + trace step history (fetch step counts in a single batched query, or lazy per row on hover to avoid N+1 — I will use a lightweight aggregation in the view or compute client-side from a single steps fetch limited to visible rows).
- `TraceDetailPage`: keep Summary, Timeline, Event Log, Delivery Attempts, collapse raw JSON under a single `<details>` "Technical details".

## Wave 3 — UI cleanup pass (Part A)

Apply the same pattern to each screen instead of rewriting them:
1. Extract long paragraphs → one-line subtitle in `PageHeader`.
2. Move technical/JSON blocks into a collapsible `TechnicalDetails` shared component (new: `src/pages/admin/communicationHub/components/TechnicalDetails.tsx`).
3. Rename "Pilot" → "Controlled Validation" in visible labels (keep `pilot` in code identifiers, routes, edge function names — those are contracts). Exception kept as "Pilot": `Generic Event Pilot` when gated to superadmin only.
4. Standardize: header uses `PageHeader`, primary CTA on the right, empty states use a shared `EmptyState` component (reuse existing if present, otherwise new small component).
5. Keep every safety banner but shorten to 1–2 lines via the existing `CommunicationHubSafetyBanner` (already concise — reuse instead of bespoke alerts).

Screens touched (19): CommunicationHubShell, Control Center, Recipient Control Center, Trace Center, Trace Detail, Live Window Wizard, Send Policies, Review Policies, Automation Settings, Sender Profiles, Sender Verification, Event Mapping, Event Wizard, Module Adapter Tests, Generic Event Pilot, Delivery Monitor, Dispatch Register, Retry Queue, Request Detail.

I will not restructure logic on any screen — this is a text/layout pass only. No control, audit, trace, or blocker info removed.

## Wave 4 — Typecheck + report

- `bunx tsgo --noEmit -p tsconfig.app.json`
- Report: files inspected, screens cleaned, wording changes summary, RLS diff, delivery-attempt mapping diff, trace UI additions, safety confirmation, typecheck result, NEEDS_REVIEW list, next recommended epic (likely: batching/N+1 elimination for trace stage aggregation + operator runbook docs).

## Safety guarantees for the whole epic

- No email send code paths touched.
- No writes to `communication_request` / `communication_message`.
- No changes to `communication_hub_control_settings` (live/cron/bulk/recipient mode).
- No secret exposure — trace payloads already scrubbed by `commHubTrace.ts`.
- No legacy code deleted.

## Confirmation needed before I start

This is ~19 screens + 1 migration + service/UI changes. It will take several turns and consume meaningful credits. Two options:

**A. Full epic in one go** — I execute Waves 1→4 across multiple turns end-to-end.
**B. Wave-by-wave** — I do Wave 1 (trace hardening, the actually urgent bit), you review, then greenlight Wave 2/3.

I recommend **B** because Wave 1 addresses real production risk (broad RLS + wrong column names causing empty delivery attempts) while Wave 3 is largely cosmetic and easier to review in isolation.

Reply "A" or "B" (or adjust) and I'll proceed.
