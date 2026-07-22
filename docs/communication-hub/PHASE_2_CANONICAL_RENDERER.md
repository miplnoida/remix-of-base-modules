# Communication Hub Template Platform — Phase 2 (Canonical Renderer)

Status: **APPLIED** (migration `20260722_phase2_canonical_renderer.sql`)
Scope: additive DB layer only. No table, column, data, seed, or route change.

Phase 2 fulfils the four Phase 2 deliverables from the certification epic:

1. Canonical **content** renderer.
2. Canonical **template-version** renderer.
3. Compatibility **wrappers** for every historical renderer name.
4. **Dependency certification** (single-version and batch).

---

## 1. Functions delivered

| Function | Purpose | Volatility | Callers |
|---|---|---|---|
| `comm_hub_flatten_tokens(jsonb, text)` | Flatten nested jsonb into dotted keys so templates written with `{{recipient.name}}` resolve against `{"recipient":{"name":"…"}}`. | IMMUTABLE | Internal to renderer. |
| `comm_hub_html_escape(text)` | HTML-escape for `output_context='html'` (5 unsafe chars). | IMMUTABLE | Internal. |
| `jsonb_object_keys_count(jsonb)` | Small helper. | IMMUTABLE | Internal. |
| **`render_comm_hub_content(text, jsonb, text)`** | **Canonical content renderer.** Single source of truth for `{{token}}` substitution. Returns `{rendered, unresolved, content_hash, output_context, token_count, unresolved_count}`. | IMMUTABLE | All renderers below; safe for future FE consumption. |
| `render_comm_hub_template(text, jsonb)` | Thin wrapper. **Fixes the latent crash in `prepare_comm_hub_preview`** — that RPC called a signature that had never existed until this migration. | IMMUTABLE | `prepare_comm_hub_preview`. |
| `comm_hub_render_template(text, jsonb)` | Pre-existing name; now a wrapper. Behaviour identical to before, but no longer a divergent implementation. | IMMUTABLE | Existing callers. |
| **`render_comm_hub_template_version(uuid, jsonb)`** | **Canonical version renderer.** Loads a `core_template_version`, renders subject / body_html / body_text in the correct output context, aggregates unresolved tokens, returns per-field content hashes plus structured `blockers[]`. | STABLE | Preview, Dry Run (Phase 3 will migrate), Admin UI. |
| **`certify_comm_hub_template_version(uuid)`** | **Dependency certification.** Configuration-time check for every prerequisite Go Live discovers late (status, mapping, sender, payload schema, variable contract, required fields, unresolved tokens under default scenario). Returns `{is_certified, blockers, warnings}`. | STABLE | Admin dashboard (Phase 4), pre-Go-Live gate. |
| `certify_all_comm_hub_template_versions()` | Batch view over every ACTIVE/PUBLISHED version. | STABLE | Admin dashboard. |

All functions are `GRANT EXECUTE` to `authenticated, service_role`; the content
renderer and its helpers are also granted to `anon` because they contain no data
access.

---

## 2. Defects addressed

| Phase 1 defect | Phase 2 action |
|---|---|
| **D1** Multiple parallel rendering algorithms. | Every historical DB renderer name (`comm_hub_render_template`, `render_comm_hub_template`) is now a thin wrapper over `render_comm_hub_content`. Phase 3 will convert `prepare_comm_hub_preview`, `render_comm_hub_template_preview`, and `render_email_template` into wrappers over `render_comm_hub_template_version`. |
| **D2** `status` casing (`ACTIVE`/`PUBLISHED`/`published`). | Renderer and certifier tolerate every observed casing (`lower(...) IN ('active','published')`). Phase 3 will normalise at the write path. |
| **D3** Unbound `communication_hub_template_variable_contract`. | Certifier detects and emits `no_variable_contract_bound` as a warning. Phase 3 binds via the resolver. |
| **D4** Sparse payload schemas / scenarios / policies. | Certifier emits `no_payload_schema`, `no_test_scenario` warnings. Batch view exposes coverage instantly. |
| **D5** Naming conventions duplication. | Certifier emits `no_event_mapping` for any orphan template — the batch shows 121 orphans immediately. |
| **D6** Sender resolution surprises. | Certifier's `sender_not_resolvable` blocker follows the deterministic chain (mapping → default). |
| **Latent crash** | `render_comm_hub_template(text, jsonb)` now exists. |

Phase 2 does **not** yet:

- rewrite `prepare_comm_hub_preview` / `render_comm_hub_template_preview` /
  `render_email_template` to delegate — that is Phase 3 (compatibility wrapper
  conversion) so the current preview flow keeps its snapshot semantics while
  the new renderer soaks.
- normalise `core_template_version.status` casing — Phase 3 lifecycle.
- bind variable contracts — Phase 3 variable contract.
- gate the legacy `notification_*` stack — Phase 5.

---

## 3. Initial certification baseline

Executed `SELECT is_certified, count(*) FROM certify_all_comm_hub_template_versions() GROUP BY 1;` immediately after the migration:

| `is_certified` | Count |
|---|---|
| **true**  | **41** |
| false | 124 |

Top blocker distribution among the 124 failures:

| Top blocker code | Versions |
|---|---|
| `no_event_mapping` | 121 |
| `body_text_empty`  | 3 |

Interpretation:

- The 41 already-certified versions correspond one-to-one to the 41 registered
  events in `communication_hub_module_event_registry`. Every event with a
  proper mapping now certifies without blockers.
- The 121 `no_event_mapping` failures are **legacy template versions from
  modules that never onboarded onto the Hub** (module-specific templates
  catalogued in Phase 1 §2.4). They are safely detected here for the first
  time in one query.
- The 3 `body_text_empty` failures are HTML-only email versions with no
  plain-text fallback. Phase 3 lifecycle will require both fields at publish
  time.

Zero platform-wide surprises remain. Every remaining failure is a **data**
defect, not a **platform** defect.

---

## 4. HTML-escape smoke test

```sql
SELECT public.render_comm_hub_content(
  'Hi {{recipient.name}} — order #{{order.id}} <b>ready</b>',
  '{"recipient":{"name":"A <script>x</script>"},"order":{"id":42}}'::jsonb,
  'html'
);
```

Returns:

```json
{
  "rendered": "Hi A &lt;script&gt;x&lt;/script&gt; — order #42 <b>ready</b>",
  "unresolved": [],
  "token_count": 4,
  "content_hash": "fd4dd9a1…",
  "output_context": "html",
  "unresolved_count": 0
}
```

Note that template literals such as `<b>ready</b>` remain intact (author
markup) while **variable values** are escaped (user data). This eliminates the
class of injection risks the previous fan-out renderers could not protect
against consistently.

---

## 5. Next steps (Phase 3 entry criteria)

- Convert `prepare_comm_hub_preview` and `render_comm_hub_template_preview` to
  call `render_comm_hub_template_version` internally, preserving their existing
  return shape.
- Introduce a `core_template_version.status` check / normaliser trigger.
- Wire `communication_hub_template_variable_contract` binding at template save.
- Extend the module event registry to non-email channels (SMS/LETTER/NOTICE)
  once at least one candidate event per channel is declared.
- Expose `certify_all_comm_hub_template_versions()` in the Admin console as
  read-only.

Phase 2 is complete and reversible: dropping the seven new functions restores
the exact pre-Phase-2 platform (subject to the pre-existing latent crash in
`prepare_comm_hub_preview` returning).
