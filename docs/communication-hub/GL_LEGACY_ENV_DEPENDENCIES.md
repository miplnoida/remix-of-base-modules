# Communication Hub — Legacy Environment Variable Dependencies

Status: **documented, not removed**. This file tracks the environment
variables that pre-date the mode-driven Go Live spine (`CH-GL-01/02`).
The canonical operating mode is now stored in
`communication_hub_control_settings.operating_mode` and applied via
`public.apply_communication_release_mode`. Env vars listed here remain
consulted by edge functions for provider routing and dispatch security
only — they must not be treated as authorisation.

## Still in use

| Variable | Consumer(s) | Purpose | Notes |
|---|---|---|---|
| `COMM_HUB_PROVIDER_MODE` | `comm-hub-controlled-live-test`, `comm-hub-dispatch` | Selects `stub` vs `real` provider adapter | Must remain `stub` until platform admins open the real-provider gate. Not a substitute for the mode profile. |
| `COMMUNICATION_HUB_DISPATCH_SECRET` | `comm-hub-controlled-live-test`, `comm-hub-dispatch`, `comm-hub-dry-run` | Shared HMAC secret for inter-function dispatch calls | Canonical name. |
| `COMM_HUB_REAL_EMAIL_TEST` | `comm-hub-controlled-live-test` (legacy branch) | Historical flag that allowed a single real send | **Deprecated** — retained as read-only. New flow uses `communication_controlled_live_grant`. |
| `COMMUNICATION_HUB_EMAIL_LIVE` | `comm-hub-dispatch` (legacy branch) | Master enable for live email | **Deprecated** — retained as read-only. Real-email is now gated by mode profile + event certification. |

## Not consulted by Go Live UI

The Go Live page (`/admin/communication-hub/go-live`) and the nine-stage
journey do **not** read any of the variables above. All authorisation is
derived from server-side state:

- `communication_hub_control_settings.operating_mode` + `communication_hub_mode_profile`
- `communication_hub_event_live_control.live_manual_only` / `live_cron_allowed`
- `communication_preview_approval` / `communication_dry_run_certification` / `communication_controlled_live_certification`

## Removal plan

Legacy env vars will be removed after two consecutive release cycles
with `communication_hub_operating_mode_audit` showing zero fallback
reads. Removal is tracked by CH-GL-04.
