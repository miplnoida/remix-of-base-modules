# CH-SIMPLE-P3 · Part A — Runtime Certification (STOP FOR REVIEW)

## Status: complete, three known gaps recorded

Runtime harness `public.run_ch_p3_recipient_policy_runtime_tests()`
executes 24 assertions against the *live* singleton row inside a
self-rolling-back subtransaction (SECURITY DEFINER).

Vitest wrapper: `src/platform/communication-hub/__tests__/CommHubP3RuntimeCertification.test.ts`
— 7 tests, all green. When `PGHOST` is unset the runtime portion is
marked pending (never silent-green).

## Known gaps surfaced by Part A (to fix in P3 Part B/C)

| ID | Where | Symptom | Owner |
|---|---|---|---|
| P3-A-GAP-01 | `evaluate_comm_hub_recipient_policy` RPC | Payload's `max_total_recipients` is ignored when it is stricter than the DB policy. Extra recipients pass unchallenged. | P3 Part B — fold into canonical send-decision evaluator. |
| P3-A-GAP-A2-01 | `supabase/functions/comm-hub-trace-simulate/index.ts` | Diagnostic surface reads raw recipient-policy columns instead of calling the canonical evaluator for parity. Read-only, does not gate delivery. | P3 Part D — migrate diagnostic to evaluator output. |
| P3-A-GAP-A3-01 | `supabase/functions/comm-hub-admin-test-notice/index.ts` | Still treats `COMMUNICATION_HUB_EMAIL_LIVE_ALLOWLIST` env as an authoriser (`reasons.push("env allowlist is empty…")`). | P3 Part E — migrate onto canonical send-decision. |

All three are pre-P3 legacy paths. Dispatch itself (`comm-hub-dispatch`)
already treats the env allowlist as diagnostic-only per CH-SIMPLE-P2 B6.

## Certified this turn

- A1 · Address A → allowed, swap DB to address B → A becomes blocked, B allowed (no deploy).
- A1 · EMERGENCY_STOP suppresses release regardless of policy.
- A1 · DISABLED, SINGLE_CONFIGURED_RECIPIENT, APPROVED_NAMED_RECIPIENTS, APPROVED_DOMAINS all enforced against live row.
- A1 · Per-bucket limits (to/cc/bcc), duplicates de-duplicated, address normalisation (case, whitespace, plus-addressing).
- A2 · Every send-path file that touches the recipient-policy table calls `evaluate_comm_hub_recipient_policy` (diagnostic exemption tracked as GAP-A2-01).
- A3 · No send-path file uses the env allowlist as a recipient authoriser (except tracked GAP-A3-01).

## Do not proceed to Part B until

- Review confirms whether GAP-01 (payload `max_total_recipients`) should
  fold into the canonical send-decision evaluator or be enforced inside
  the recipient-policy RPC itself.
- Review approves the diagnostic exemption in A2 for `comm-hub-trace-simulate`.
