# CE Workflow Rollout — Turn E

## Scope
- Entity-aware Workflow Mapping admin UI.
- Repo lint script for CE status workflows.

## Changes

### 1. `src/services/ceEntityStatusCatalog.ts` (new)
Single source of truth describing each CE entity governed by the workflow
engine: status enum, event-key prefix, and the action transitions
(`from[] → to`) seeded by the `ce_status_*` migrations.

Covers all 8 entities: violation, case, notice, inspection, arrangement,
waiver, legal_recommendation, legal_referral (45 status actions total).

Exports:
- `CE_ENTITY_STATUS_CATALOG`
- `parseStatusEventKey(eventKey)` — splits `violation.status.START_WORK`
  into `{ entity, descriptor, action }`.
- `listCatalogStatusEventKeys()` — enumerates every derivable key.

### 2. `src/pages/compliance/admin/WorkflowMappingPage.tsx`
- Event-key dropdown now groups status events by entity (Violation —
  Status, Case — Status, …) and keeps the legacy approval-gate events on
  top.
- When the selected event is a status transition, the dialog renders a
  read-only panel showing the entity, action label, `from[] → to` badges,
  and a one-line note explaining DIRECT_APPLY vs. WORKFLOW_REQUIRED
  routing.

### 3. `scripts/ce-workflow-lint.ts` (new) + `npm run lint:ce-workflows`
Verifies:
1. Every catalog `<entity>.status.<ACTION>` exists in
   `COMPLIANCE_EVENT_KEYS` (and vice-versa).
2. Each action's `from[]` / `to` references a declared status.
3. (Optional) Every status event has at least one row in
   `ce_workflow_mappings` — runs only when `SUPABASE_URL` and
   `SUPABASE_ANON_KEY` are exported.

The script reads `COMPLIANCE_EVENT_KEYS` from source as text to avoid
pulling in the Vite-bound supabase client at lint time.

### 4. `package.json`
Added: `"lint:ce-workflows": "tsx scripts/ce-workflow-lint.ts"`.

## Verification
```
$ bunx tsx scripts/ce-workflow-lint.ts
CE workflow lint OK — 45 status events, 8 entities.
```
