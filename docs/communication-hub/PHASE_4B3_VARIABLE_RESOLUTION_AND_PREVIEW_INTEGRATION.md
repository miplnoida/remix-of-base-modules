# Phase 4B3 Slice 2 — Variable Resolution & Preview Integration

Status: **PHASE_4B3_VARIABLE_RESOLUTION_AND_PREVIEW_PARTIAL**

Additive slice on top of Phase 4B3 Slice 1. Fixes a platform-wide token
resolution defect that surfaced in the current Go Live Preview (APPEALS /
`APPEAL_RECEIVED_NOTICE`) but was **not** APPEALS-specific.

## 1. Root cause of the current unresolved variables

The APPEALS fixture is one of many templates whose variable names differ
from their canonical source paths. Its variable contract is correct:

| variable_name      | source_type       | canonical_path         |
|--------------------|-------------------|------------------------|
| `appeal_reference` | `event_payload`   | `appeal.reference`     |
| `case_reference`   | `event_payload`   | `appeal.case_reference`|
| `submitted_at`     | `event_payload`   | `appeal.submitted_at`  |
| `recipient_name`   | `recipient_context` | `display_name`       |
| `request_no`       | `request_context` | `request_no`           |
| `generated_at`     | `system_context`  | `generated_at`         |

The active scenario carries the correct nested shape
`{ "appeal": { "reference": …, "case_reference": …, "submitted_at": … } }`.

**Defect**: `prepare_comm_hub_preview` was building the renderer token bundle
as a raw namespace merge —
`v_tokens := v_scenario_tokens || v_ctx_in || v_recipient_tokens || v_system_tokens || v_request_tokens;` —
so the renderer received `appeal.reference` (nested) but never
`appeal_reference` (the actual template token). Any event whose template
tokens differ from the canonical source paths — i.e. every alias in the
platform — hit the same failure. The renderer then re-scanned the rendered
HTML **and** text, emitting the same variable twice, which produced the
duplicated `recipient_name, recipient_name` messages the operator saw.

## 2. Canonical resolver contract

New read-only function:

```
public.resolve_comm_hub_template_variables(
  p_template_version_id uuid,
  p_module_code text,
  p_event_code text,
  p_channel text default 'email',
  p_resolution_mode text default 'PREVIEW_TEST',
  p_test_scenario_id uuid default null,
  p_event_payload jsonb default null,
  p_recipient_context jsonb default null,
  p_request_context jsonb default null,
  p_system_context jsonb default null
) returns jsonb
```

Behaviour:

- Loads the version-bound variable contract; falls back to the event-level
  unversioned contract only when no version-bound rows exist.
- For each contract row, reads the declared `source_type` from the
  authoritative namespace and looks up the value at the exact
  `canonical_path` using nested `jsonb #>` traversal.
- Materialises the value under the **template variable name**, not the
  canonical path (alias support).
- Applies declared defaults only for optional variables.
- Returns:
  - `tokens`: alias-keyed map ready for the renderer,
  - `evidence`: per-variable resolution record,
  - `unresolved_variables`: **one entry per unique variable** with
    `reason_code`, `required`, and `locations` array,
  - `contract_count`, `contract_missing`, `resolver_version`, `resolved_at`.

Does not render, does not create snapshots, does not call providers, does
not mutate lifecycle state. `STABLE`, `SECURITY DEFINER`, `EXECUTE` to
`authenticated`.

## 3. Source ownership

| Namespace           | Populated by                                         |
|---------------------|------------------------------------------------------|
| `system_context`    | Server (`prepare_comm_hub_preview`)                  |
| `recipient_context` | Recipient policy + configured test recipient         |
| `event_payload`     | Active test scenario (test modes) / caller payload (production) |
| `request_context`   | Server-frozen `request_no`, `request_id`, `requested_at` |
| `template_default`  | Contract `default_value` (optional variables only)   |
| `derived`           | Registered server resolver (reserved, not yet wired) |
| `late_bound`        | Explicitly declared binding stage only               |

The resolver never lets a test scenario override recipient, request or
system context, and production mode ignores test scenarios entirely.

## 4. Alias materialisation

The template `{{appeal_reference}}` now receives the value at
`event_payload.appeal.reference`. The token map contains `appeal_reference`
directly. The renderer no longer relies on nested lookup at render time.

## 5. Preview integration (`prepare_comm_hub_preview`)

Same signature. Same outward JSON shape. Internally it now:

1. Resolves module → event → template → active version.
2. Builds server-owned system/request/recipient contexts.
3. Loads the active test scenario for the event/channel.
4. Calls `resolve_comm_hub_template_variables(...)`.
5. Passes the resolver's alias-keyed tokens (plus scrubbed caller context
   for any non-contract placeholder) into `render_comm_hub_template_version`.
6. Persists the resolver's unresolved list in the new normalised column and
   keeps the renderer scan in the legacy column for backwards compatibility.

Additive columns on `communication_preview_snapshot`:

- `resolver_version`, `variable_contract_version`,
- `resolved_token_bundle`, `variable_evidence`,
- `unresolved_variables_normalised`,
- `test_scenario_id`, `test_scenario_hash`,
- `recipient_context_ref`, `request_context_values`.

## 6. Parser & deduplication

Slice 2 delivers a resolver-first deduplicated list: the server emits one
entry per variable name with `locations: []` (populated when the frontend
combines with a final raw-token scan via `mergeUnresolvedVariables()`).
This removes the `recipient_name, recipient_name` duplication path shown in
the pre-fix screenshot.

## 7. Regression fixture (current screenshot)

```
Module:   APPEALS
Event:    APPEAL_RECEIVED_NOTICE
Channel:  email
```

After Slice 2 (no configuration changes required — the contract and
scenario were already correct):

- Snapshot id: `b076d6b4-3e79-4198-8b2c-a9ae54ee5dda`
- `unresolved_variables_normalised`: `[]`
- `resolver_version`: `4b3.slice2`
- `rendered_body_html` contains **zero** raw `{{...}}` tokens
- `rendered_body_text` contains **zero** raw `{{...}}` tokens
- Subject rendered: `Appeal Received`

## 8. Frontend

`src/platform/communication-hub/variableResolverService.ts` —
`resolveCommHubTemplateVariables()`, `mergeUnresolvedVariables()`,
`describeUnresolvedVariable()`.

## 9. B1 / B2 / Phase 4A regression

- Certification records untouched (no writes to `comm_hub_certification`).
- Freshness triggers unchanged.
- Mode transition core, Automated Production STANDBY, Emergency Stop and
  Controlled Stub restoration paths untouched.
- Canonical renderer signature and behaviour unchanged.
- Only additive DDL: nullable columns on `communication_preview_snapshot`
  and one new function.

## 10. Remaining B3 scope — NOT delivered in this slice

The following items are required to reach
`PHASE_4B3_VARIABLE_RESOLUTION_AND_PREVIEW_COMPLETE` /
`PHASE_4B3_RUNTIME_GOVERNANCE_INTEGRATION_COMPLETE`. Doing them safely
requires a separate patch of comparable size.

- `check_all_comm_hub_template_renderability()` platform-wide read-only
  assessment for all 165 versions (EVENT_COMMUNICATION,
  MANUAL_CORRESPONDENCE, DOCUMENT_GENERATION, FORM_OUTPUT).
- Pre-Preview variable-readiness panel and structured operator message
  wiring in the Go Live UI (this slice ships the RPC + client only).
- Approval, Dry Run and Controlled Stub explicit snapshot-bound consumers
  that never re-resolve variables (the resolver is snapshot-bound in the
  new columns; downstream stages must be updated to read from them and
  reject re-resolution).
- Fold governance blockers from `check_comm_hub_runtime_governance` into
  `evaluate_comm_hub_send_decision` for every send context.
- Server operations to issue `CONTROLLED_STUB_CERTIFIED`,
  `MANUAL_PRODUCTION_CERTIFIED`, `AUTOMATED_PRODUCTION_CERTIFIED`
  release certifications with evidence-chain checks.
- Refined `arm_comm_hub_automation` gate blockers
  (`NO_AUTOMATION_CERTIFIED_EVENT`, `AUTOMATION_CERTIFICATION_STALE`).
- Administrative template validation surface.
- Full deterministic test suites (resolver, parser, all-template,
  regression fixture, B1/B2/Phase 4A regression).

## 11. Non-goals for this turn

- No One Real Email execution.
- No Manual Production send.
- No live automation arming.
- No cron / batch / bulk.
- No changes to the canonical renderer.
- No removal of business placeholders from any template.
- No hardcoded APPEALS branches anywhere in the resolver.
