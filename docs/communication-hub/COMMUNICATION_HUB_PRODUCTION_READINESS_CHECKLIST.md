# Communication Hub — Production Readiness Checklist

## Code
- [ ] PR approved, correct commit selected
- [ ] `bun run lint`, `lint:comm-governance`, `test`, `build` all green
- [ ] No provider bypass, no hardcoded recipient, no hardcoded secret
- [ ] Idempotency implemented per event
- [ ] Trace + audit context flows end-to-end

## Database
- [ ] Migrations reviewed
- [ ] Backup confirmed
- [ ] RPC + indexes verified
- [ ] Audit tables populated in staging test

## Configuration
- [ ] Provider configured, key present, health check green
- [ ] Sender profile verified + enabled
- [ ] Template approved, active version correct
- [ ] Events registered, mappings active, assertion SQL clean
- [ ] Recipient controls: allowlist populated with approved pilot recipient only
- [ ] Send + review policies signed off
- [ ] Cron **disabled**

## Security
- [ ] Roles verified via permission matrix
- [ ] All provider secrets server-side only
- [ ] Dispatcher + webhook secrets set
- [ ] Production gates default OFF (dry_run_only=true, email_live_enabled=false)
- [ ] Emergency stop tested in staging

## Operations
- [ ] Delivery Monitor, Trace Center, Audit, Retry Queue, Scheduler Monitor reachable
- [ ] On-call rota + incident contacts recorded in PROD_RUNBOOK
- [ ] Rollback owner identified

## Sign-offs
- [ ] Technical owner
- [ ] Business owner
- [ ] Security / compliance
- [ ] Approver (for controlled live activation)
