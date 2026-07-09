## Problem

The "Send test email" panel on the Live Window Wizard fails with `Edge Function returned a non-2xx status code`.

The edge function `comm-hub-admin-test-notice` requires two fields the panel isn't sending:
- `reason` — non-empty string (else HTTP 400 `reason_required`)
- `typedConfirmation` — must match an exact phrase:
  - dry_run → `SEND ADMIN TEST NOTICE`
  - live → `SEND ONE LIVE ADMIN TEST NOTICE TO ROHIT`

The Supabase JS client hides 4xx JSON bodies behind the generic non-2xx message, which is why the real reason wasn't visible.

## Fix (frontend-only, in `LiveWindowWizardPanel.tsx`)

1. **Add two inputs to the test-send panel:**
   - `Reason` — required `Textarea` (min 3 chars), placeholder "Reason for this test send (audited)".
   - `Typed confirmation` — `Input`; helper text shows the exact phrase required for the currently-selected mode. Send button stays disabled until the typed value matches exactly.

2. **State additions:** `testReason`, `testTyped`. Reset `testTyped` when `testMode` toggles.

3. **Update `sendTest` invoke body** to include `reason: testReason.trim()` and `typedConfirmation: testTyped`.

4. **Surface real errors.** When `supabase.functions.invoke` returns an `error`, read the underlying response body via `error.context?.response?.json()` (FunctionsHttpError shape) and merge it into `testResult` so the "Result" box shows `{ error, expected, ... }` instead of just the generic message.

5. **Guardrails preserved:**
   - Live-mode button remains destructive; recipient still restricted to allowlist select.
   - No change to edge function, RPCs, migrations, gates, cron, or legacy tables.
   - No change to the wizard's Open/Close/Emergency-close flows or any other panel.

## Verification

- Dry-run with reason + correct phrase → 200, request/message IDs returned, `sentDryRun: true`, audit row `admin_test_notice_template_dry_run`.
- Dry-run with wrong phrase → panel shows `typed_confirmation_required` + expected phrase inline (no more generic message).
- Live with gates open but env `COMMUNICATION_HUB_EMAIL_LIVE=false` → returns `blocked: true` with reasons rendered in the panel; no provider call.
- Typecheck passes.

## Out of scope

- No auto-fill of the confirmation phrase (defeats the safety of typed confirmation).
- No change to `comm-hub-admin-test-notice` contract.
- No live email will be sent as part of this change.
