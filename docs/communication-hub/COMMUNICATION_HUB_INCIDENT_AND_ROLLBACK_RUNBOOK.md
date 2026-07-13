# Communication Hub — Incident & Rollback Runbook

## Emergency stop (Safety Switchboard preset)
Effect:
- `dispatch_enabled=false`
- `email_live_enabled=false`
- `cron_desired_enabled=false`
- `dry_run_only=true`

Steps:
1. Trigger **Emergency Stop** preset (typed confirmation: `ENGAGE EMERGENCY STOP`).
2. Close affected live windows.
3. Disable affected event live control.
4. Disable affected schedule.
5. Pause pending retries; do not delete.
6. Preserve every request, message, attempt, trace, audit row.
7. Record incident reason (audit).
8. Notify technical, business, security owners.

## Investigation
Use Trace Center + Audit + Delivery Monitor + Retry Queue. Distinguish failure category using the trace matrix in the audit runbook.

## Recovery
1. Fix issue in dev.
2. Re-run full test progression in staging.
3. Obtain new production approval.
4. Reactivate progressively (Stage 0 → 5).

## Rollback matrix
| Layer | Rollback |
|---|---|
| Frontend | Redeploy previous commit |
| Edge function | Redeploy previous function version |
| DB migration | Forward-fix; never destructive rollback on audit tables |
| Provider | Disable provider; keep credentials |
| Sender | Disable sender profile |
| Template version | Reactivate previous approved version |
| Event mapping | Toggle previous mapping active; deactivate new one |
| Recipient policy | Restore previous allowlist rows from audit |
| Send / review policy | Restore previous policy row |
| Schedule | Disable schedule; retain runs |
| Cron | `cron.unschedule('<jobname>')` |
| Module adapter | Revert adapter file; redeploy |

**Never delete:** audit rows, requests, messages, delivery attempts, traces, schedule run history.
