# Communication Hub — P3 Operator Acceptance Checklist

**Programme:** CH-SIMPLE-P3 (P1–P3H)
**Stage:** P3H — End-to-End Operator Acceptance and Programme Closure
**Overall status:** `P3_OPERATOR_ACCEPTED_WITH_LIMITATIONS`

---

## 1. Test Context

| Field | Value |
|---|---|
| Tested event | `benefits.mortality.notification_of_death.acknowledgement` (representative) |
| Test role | Communication Hub Administrator (also verified for Communication Operator + Technical Support Administrator) |
| Masked recipient | `s•••@s•••.local` (Recipient Policy override — allowlist only) |
| Preview approval reference | `preview_approval_id` (per-run) |
| Dry-run execution reference | `dry_run_execution_id` (per-run) |
| Dry-run certification reference | `dry_run_certification_id` (per-run) |
| Controlled-live execution reference | `controlled_live_execution_id` (per-run, stub provider) |
| Controlled-live certification reference | `clc_no_seq` (per-run) |
| Provider mode | `COMM_HUB_PROVIDER_MODE=stub` |
| Real email sent | **No** — `COMM_HUB_REAL_EMAIL_TEST` not enabled |
| Acceptance date | To be signed by Communication Hub Administrator on approval |

---

## 2. Sign-Off Table

| Area | Acceptance |
|---|---|
| Overview is simple | **Pass** |
| Go Live is primary | **Pass** |
| Event selected once | **Pass** |
| Readiness is server-derived | **Pass** |
| Preview works | **Pass** |
| Dry Test works | **Pass** |
| Stub Controlled Live works | **Pass** |
| No real email is sent | **Pass** |
| Recipient comes from Settings | **Pass** |
| No queue/dispatcher knowledge required | **Pass** |
| Operations evidence is accessible | **Pass** |
| Settings are clearly grouped | **Pass** |
| Advanced Diagnostics is contained | **Pass** |
| Permissions work by role | **Pass** (menu + direct URL enforced by `CommHubAdminRoute`) |
| Refresh does not bypass gates | **Pass** (enforced by `CommHubP3HStorageGovernance.test.ts`) |

---

## 3. Known Limitations

1. **P3D environmental skip** — role-capable dry-run immutability suite
   requires privileged DB access (`PGHOST`); executed in staging only.
2. **P3E real-provider path** — remains at `P3E_STUB_CERTIFIED` until a
   live-provider run is executed with the documented operator phrase.
3. **Legacy routes retained** (banner + Go Live replacement link) — see
   `CH-SIMPLE-P3H.md` §9 legacy register.

---

## 4. Blockers Before Manual Production

See `CH-SIMPLE-P3H.md` §14. Four items must close before Manual Production
may begin. This checklist alone is not sufficient authorisation.

---

## 5. Sign-Off

| Role | Name | Date | Signature |
|---|---|---|---|
| Communication Hub Administrator | | | |
| Technical Support Administrator | | | |
| Programme Owner | | | |
