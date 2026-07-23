# Phase 4B3 — Runtime Transition Certification & Controlled Stub Execution

This iteration is large enough that a single response cannot land it safely without risking half-migrated state on Live. I want your acknowledgement of the staged sequence below before I begin, because each stage produces durable schema and RPC changes that must all land coherently.

## Scope reality check

The 21 sections (A–U) collectively require:
- 6–8 new SQL migrations (enum extensions, new tables/columns, ~10 new RPCs, revoke/grant sweeps, backfills)
- Refactor of 5 existing RPCs (`prepare_comm_hub_preview`, `approve_comm_hub_preview`, `begin_comm_hub_dry_run`, `begin_comm_hub_controlled_live`, `create_comm_hub_controlled_stub_message`, `claim_comm_hub_targeted_message`, `revalidate_comm_hub_send_decision`)
- 2 Edge Function refactors (`comm-hub-dry-run`, `comm-hub-controlled-live-test`) to call the new transition gate before each mutation
- New service module + tests on the frontend
- ~30+ deterministic SQL/vitest cases
- One live Controlled Stub run against APPEALS with full evidence capture

I will execute it as five sub-iterations, each verifiable in isolation. I will not stop between them — but I need you to acknowledge the sequence so that if credits or a failure force a pause, we pause on a coherent boundary.

## Sub-iteration 1 — Capability vs Transition split + normaliser fix (Sections A, C, D, L)

- Rename `evaluate_comm_hub_stage_readiness` conceptually to "event capability evaluator" (compatibility wrapper retained).
- Introduce `normalize_comm_hub_go_live_stage_for_action(p_stage, p_action)`; make bare `CONTROLLED_LIVE` raise `GO_LIVE_STAGE_ACTION_REQUIRED`.
- Fix template-certification lookup false positive (exact template_version_id + kind + lifecycle + dependency hash + not stale/revoked).
- Regression test: certified APPEALS version emits zero `template_version_certification_missing`.

## Sub-iteration 2 — Sender readiness correctness (Sections E, F, G, H)

- Revoke `compute_comm_hub_sender_readiness` from PUBLIC/anon/authenticated; add admin wrapper with server-side permission check.
- Split `(sender_profile_id, sender_version, readiness_kind)` uniqueness; backfill existing rows without deletion.
- SHA-256 canonicalised evidence hashing helper `comm_hub_canonical_sha256(jsonb)`.
- REAL_EMAIL_READY returns `BLOCKED_CONFIGURATION` until provider-capability evidence table exists (new table `comm_hub_provider_capability_evidence`, empty for now).
- TEST_READY re-derivation with new hash contract.

## Sub-iteration 3 — Exact fixture + schema validation (Sections I, J, K)

- Extend `check_comm_hub_event_fixture_compatibility(p_module, p_event, p_channel, p_template_version_id, p_scenario_id)`.
- Real JSON Schema validation of governed fixture against enforced payload schema (using pg's `jsonb_path_query` + a validator helper or `plpgsql` walker; if no pg extension, implement in an Edge Function called from SQL via `pg_net` — decision at implementation time; likely inline plpgsql walker).
- Return distinct `schema_valid / schema_errors / contract_paths_valid / required_variables_resolvable / rendered_without_raw_tokens`.
- Replace silent `Test Recipient` / `test@example.com` / `now()` fallbacks with a governed platform test context table `comm_hub_platform_test_context` (versioned, deterministic, non-production). Variable source ownership classifier.

## Sub-iteration 4 — Runtime transition gate + boundary wiring (Sections B, N, O)

- New RPC `assert_comm_hub_runtime_transition(...)` with the full signature and 11 supported transitions; `START_ONE_REAL_EMAIL` / `DISPATCH_ONE_REAL_EMAIL` always deny in this iteration.
- Runtime transition requirement matrix (separate from capability matrix).
- Wire into: `prepare_comm_hub_preview`, `approve_comm_hub_preview`, `begin_comm_hub_dry_run`, `comm-hub-dry-run` edge fn, Dry Run certification issue path, `begin_comm_hub_controlled_live`, `create_comm_hub_controlled_stub_message`, `claim_comm_hub_targeted_message`, `processTargetedControlledLive` (pre-simulator), Controlled Stub certification issue, `revalidate_comm_hub_send_decision`.
- Immutable chain: propagate mapping/version/template/schema/contract/scenario/sender/recipient-policy/manifest/recipient-set/subject/body/content hashes end-to-end; server refuses mid-chain re-render.

## Sub-iteration 5 — Recompute, deterministic tests, one live Controlled Stub (Sections M, P, Q, R, S, T, U)

- Recompute APPEALS across all six stages; expect `CONTROLLED_STUB_READY` clean, `ONE_REAL_EMAIL_READY` blocked.
- Deterministic SQL + vitest suite for every check in Section P.
- Execute exactly one fresh APPEALS Controlled Stub end-to-end (new preview → approve → dry run → certify → controlled stub → grant → targeted message → claim → revalidate → simulator × 1 → attempt → consume grant → controlled-stub certification).
- Capture the full evidence bundle listed in Section R.
- Update the three docs; report all test totals; set status `PHASE_4B3_CONTROLLED_STUB_CERTIFIED` or the appropriate PARTIAL/BLOCKED state.

## Reasons I am pausing for your acknowledgement (not a design question — a safety confirmation)

1. Sub-iteration 3's real JSON Schema validation in Postgres is non-trivial. If your enforced payload schemas rely on features beyond `type / required / properties / enum / items / additionalProperties / format`, I need to know before implementing so I don't ship a partial validator that later silently accepts invalid fixtures.
2. Sub-iteration 4 changes the calling convention of 7 existing RPCs and 2 Edge Functions. Any in-flight Preview/Dry-Run rows created under the old contract will need a one-time compatibility path. I plan to make the transition gate advisory-only for pre-existing rows created before the migration timestamp; confirm that is acceptable, or say "hard cut" and I will terminalise any in-flight rows instead.
3. Sub-iteration 5 will consume one grant and produce one durable Controlled Stub certification against the real Live database. That is the intended outcome, but I want to name it explicitly.

## Estimate after this iteration completes successfully

- Successful Controlled Stub: complete
- One controlled real test email: ~2 more iterations (provider-capability evidence collection + one-real-email path certification + execution)
- First Manual Production business event: ~4–6 more iterations
- Broader multi-event production: ~7–11 more iterations

Reply "proceed" (with any adjustment to items 1–3 above) and I will run Sub-iterations 1 → 5 back-to-back without stopping, executing the Controlled Stub at the end.
