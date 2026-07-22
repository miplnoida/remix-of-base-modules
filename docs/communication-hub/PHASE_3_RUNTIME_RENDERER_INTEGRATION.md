# Communication Hub Template Platform — Phase 3 (Runtime Renderer Integration)

Status: **PHASE_3_CANONICAL_RUNTIME_INTEGRATION_COMPLETE**
Scope: additive DB layer + function replacements only. No table, column, or row
data change. No new UI. No Controlled Real Email / Manual Production / Automated
Production / cron / bulk work.

Phase 3 fulfils the 17 objectives from the certification epic covering:

- canonical-renderer contract validation
- template-version renderer extension (channel + render_mode)
- template-purpose classification
- `prepare_comm_hub_preview` conversion to canonical consumer
- `render_comm_hub_template_preview` conversion to thin wrapper
- `render_email_template` classification as legacy
- source-ownership guard
- purpose-aware certification
- read-only status inventory

---

## 1. Function inventory after Phase 3

| Function | Role | Status |
|---|---|---|
| `render_comm_hub_content(text, jsonb, text)` | Canonical content renderer (Phase 2). | **CANONICAL** — unchanged. |
| `render_comm_hub_template_version(uuid, jsonb, text, text)` | Canonical template-version renderer. Channel + render mode aware. | **CANONICAL — Phase 3 signature.** |
| `render_comm_hub_template_version(uuid, jsonb)` | Backward-compatible wrapper over the 4-arg canonical. | **COMPATIBILITY_WRAPPER** |
| `render_comm_hub_template(text, jsonb)` | Legacy inline template renderer. | **COMPATIBILITY_WRAPPER** over `render_comm_hub_content`. |
| `comm_hub_render_template(text, jsonb)` | Legacy alias. | **COMPATIBILITY_WRAPPER**. |
| `prepare_comm_hub_preview(jsonb)` | Preview orchestrator: mapping → version → variables → snapshot. | **MIGRATED_TO_CANONICAL** — calls `render_comm_hub_template_version` for all rendering. |
| `render_comm_hub_template_preview(jsonb)` | Operator-facing readiness + preview shape. | **COMPATIBILITY_WRAPPER** — delegates all rendering to canonical; preserves historical response shape. |
| `render_email_template(uuid, jsonb)` | Sends against `notification_templates`. Not `core_template_version`. | **LEGACY_RENDERER_PENDING_MIGRATION** — commented, isolated. Not migrated because storage model is different (legacy notification stack — Phase 5 gate). |
| `certify_comm_hub_template_version(uuid)` | Purpose-aware certifier. | **CANONICAL — expanded**. |
| `certify_all_comm_hub_template_versions()` | Batch certifier. | **CANONICAL — expanded**. |
| `comm_hub_classify_template_purpose(uuid)` | Template-purpose classifier. | **NEW**. |
| `comm_hub_scrub_protected_keys(jsonb)` | Source-ownership guard. | **NEW**. |
| `report_comm_hub_status_normalisation()` | Read-only status inventory. | **NEW**. |

---

## 2. Renderer-caller inventory

| Caller | Path | Classification |
|---|---|---|
| `prepare_comm_hub_preview` | DB RPC | MIGRATED_TO_CANONICAL |
| `render_comm_hub_template_preview` | DB RPC | COMPATIBILITY_WRAPPER |
| `render_comm_hub_template` / `comm_hub_render_template` | DB RPC | COMPATIBILITY_WRAPPER |
| `render_email_template` | DB RPC over `notification_templates` | LEGACY_RENDERER_PENDING_MIGRATION |
| Provider stubs, `comm-hub-dispatch`, `comm-hub-controlled-live-test` edge functions | Do not re-render — consume approved snapshot fields (`rendered_subject`, `rendered_body_html`, `rendered_body_text`). | NOT_TEMPLATE_RENDERING |
| Front-end preview panels (`commHubPreviewService.ts`) | Consume RPC results only. | NOT_TEMPLATE_RENDERING |

No unidentified rendering paths remain in the Hub runtime.

---

## 3. Template-purpose classifications

The classifier `comm_hub_classify_template_purpose(uuid)` maps every
`core_template` to exactly one purpose:

- **EVENT_COMMUNICATION** — EMAIL / SMS / IN_APP not marked as layouts.
- **MANUAL_CORRESPONDENCE** — LETTER / NOTICE.
- **DOCUMENT_GENERATION** — DOCUMENT / STATEMENT / RECEIPT / CERTIFICATE.
- **FORM_OUTPUT** — FORM templates.
- **SHARED_LAYOUT** — `is_base_layout = true`.
- **UNCLASSIFIED_REVIEW_REQUIRED** — anything else.

Only EVENT_COMMUNICATION requires a Communication Hub event-template mapping.
`no_event_mapping` is therefore no longer emitted as a blanket blocker; it
becomes `event_mapping_required` and is only raised when applicable.

---

## 4. Source-ownership rules

Every incoming bundle destined for the renderer is passed through
`comm_hub_scrub_protected_keys(jsonb)`, which strips the following keys
regardless of source:

`module_code, event_code, channel, generated_at, current_date, correlation_id,
request_no, request_id, requested_at, recipient_email, recipient_name,
display_name, email, sender_email, sender_display_name, reply_to, template_id,
template_version_id`.

Composition order inside `prepare_comm_hub_preview` is:

```text
scenario_tokens (scrubbed)
  → context_data (scrubbed)
    → recipient_tokens (server-owned)
      → system_tokens (server-owned)
        → request_tokens (server-owned)
```

Server-owned namespaces always win. Untrusted payloads can never override
protected keys.

---

## 5. Status-normalisation report

`report_comm_hub_status_normalisation()` returns the live inventory of status
values across `core_template`, `core_template_version`, and
`communication_hub_event_review_policy`. Casing is intentionally not
force-rewritten in Phase 3: the certifier tolerates every observed casing via
`lower(...) IN (...)`. Phase 4 will introduce write-time normalisation triggers.

---

## 6. Certification results — before / after

| Cohort | Phase 2 baseline | Phase 3 result |
|---|---|---|
| Total active-or-published versions | 165 | 165 |
| **CERTIFIED (all purposes)** | **41** | **155** |
| CERTIFIED — EVENT_COMMUNICATION | 41 | 44 |
| CERTIFIED — MANUAL_CORRESPONDENCE | 0 | 104 |
| CERTIFIED — DOCUMENT_GENERATION | 0 | 6 |
| CERTIFIED — FORM_OUTPUT | 0 | 1 |
| BLOCKED — `no_event_mapping` (legacy blanket) | 121 | 0 |
| BLOCKED_EVENT_MAPPING (genuine gaps) | — | **10** |
| BLOCKED — `body_text_empty` | 3 | 0 (now warning per purpose rules) |
| TEMPLATE_PURPOSE_UNCLASSIFIED | — | 0 |

**Movement explained:**

- 114 versions moved from BLOCKED → CERTIFIED because they were LETTER /
  NOTICE / DOCUMENT / FORM templates that never required a Hub event mapping.
  The blanket `no_event_mapping` blocker in Phase 2 misclassified them.
- 10 versions remain **BLOCKED_EVENT_MAPPING** — these are genuine EMAIL / SMS
  event templates that do not yet have a row in
  `communication_hub_event_template_map`. They are data defects, not platform
  defects.
- 3 versions with empty body fields no longer certify as errors — under
  purpose-aware rules they emit `body_empty` warnings when the purpose is
  MANUAL_CORRESPONDENCE (letters can legitimately be layout-driven).

---

## 7. Representative renderer verification

Tested against `render_comm_hub_content`:

```sql
SELECT public.render_comm_hub_content(
  '<p>Hello {{recipient.name}}</p>',
  '{"recipient":{"name":"<script>alert(1)</script>"}}'::jsonb,
  'html');
```

Returns rendered:
`<p>Hello &lt;script&gt;alert(1)&lt;/script&gt;</p>`

- Template markup (`<p>`) intact.
- Token value escaped.
- No executable script remains.
- Nested `{{recipient.name}}` resolved via `comm_hub_flatten_tokens`.

Subject CR/LF injection is caught by
`render_comm_hub_template_version` and emitted as blocker
`subject_control_chars`.

---

## 8. Snapshot evidence

`prepare_comm_hub_preview` now persists into
`communication_preview_snapshot`:

- `template_id`, `template_version_id`, `sender_profile_id`
- `rendered_subject`, `rendered_body_html`, `rendered_body_text`
- `subject_hash`, `body_hash`, `content_hash`, `context_hash`
- `unresolved_variables`
- `context_data` now also includes:
  - `template_purpose`
  - `canonical_renderer_version` (`phase3_v1`)
  - `scenario_id`, `scenario_key`
  - `request_no`, `recipient_name_confirmed`

Dry Run and Controlled Stub already read the approved snapshot fields
verbatim; they do not re-render.

---

## 9. Known non-migrated paths

- `render_email_template(uuid, jsonb)` — operates over `notification_templates`
  (the legacy notification stack) and returns
  `{subject_rendered, body_rendered}`. Migrating it requires the legacy stack
  to move to `core_template_version` first. Classification recorded via
  `COMMENT ON FUNCTION`. **Phase 5 gate.**

No other renderers were located in DB or repository grep.

---

## 10. Stop condition observed

Phase 3 stops after wrapper conversion, purpose classification, source-ownership
guard, status inventory, and updated certification run. It does **not** touch:

- activation lifecycle enforcement
- stale-certification triggers
- certification dashboard UI
- Controlled Real Email
- Manual Production / Automated Production
- cron / bulk

Those are Phase 4+ work.

---

**Status: PHASE_3_CANONICAL_RUNTIME_INTEGRATION_COMPLETE**
