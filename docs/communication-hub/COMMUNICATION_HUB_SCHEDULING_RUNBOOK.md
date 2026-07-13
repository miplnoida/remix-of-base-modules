# Communication Hub — Scheduling & Cron Runbook

## Tables
- `communication_hub_schedule` — schedule definitions (module, event, frequency, tz, start/end, recipient query, max recipients, template, sender, enabled)
- `communication_hub_schedule_run` — per-execution record (started_at, finished_at, eligible_count, requests_created, status, error)

## Flow
```
pg_cron tick
 → scheduler edge function (invoked via net.http_post)
   → for each due enabled schedule:
     acquire lock
     resolve eligible business records (schedule.query)
     idempotency check per record
     comm-hub-event-pilot { action: "live_send" | "dry_run" } per record
     write schedule_run row
     compute next_run_at
```

## Cron configuration
Cron rows live in Supabase `cron.job`. Insert via SQL (never via migration since it embeds user-specific URL + anon key):

```sql
select cron.schedule(
  'comm-hub-scheduler-every-5min',
  '*/5 * * * *',
  $$select net.http_post(
    url:='https://<PROJECT_REF>.supabase.co/functions/v1/comm-hub-scheduler',
    headers:='{"Content-Type":"application/json","apikey":"<ANON_KEY>"}'::jsonb,
    body:=jsonb_build_object('time', now())
  );$$
);
```

**Never enable cron automatically in production.** Governance activation only, with approver + typed confirmation.

## Safety
Every schedule run passes through the same gates as manual sends:
- `dispatch_enabled`
- `dry_run_only`
- `email_live_enabled`
- per-event live control
- live window (may be optional for approved scheduled events)
- recipient allowlist / external-release
- send policy max recipients per run
- idempotency key `(schedule_id, entity_id, run_bucket)`

## Testing
1. Create schedule with `enabled=false`, run simulation via Test & Diagnostics.
2. Enable in staging with dry-run-only. Verify `schedule_run.requests_created > 0`, no provider call.
3. Test duplicate cron tick — second invocation acquires no rows (lock).
4. Disable schedule mid-window — next tick skips.
5. Expire schedule — run count stops.

## Daily operations
- Review next runs, disabled schedules, failed runs.
- Verify recipient counts within `max_recipients`.
- Check event + template + sender still valid.
- Confirm no unexpected changes in audit.
