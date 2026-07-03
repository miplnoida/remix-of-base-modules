# Legal V1 — UAT Defect Log Template

**Version:** 1.0

Copy a row per defect. Keep this file as the single UAT defect ledger.

---

## Severity guide
- **Blocker** — halts a business-critical flow (Compliance→Legal→Recovery). No workaround.
- **Major** — flow completes but produces wrong data / requires workaround.
- **Minor** — cosmetic, label, sort order, non-blocking UX.
- **Enhancement** — new capability (routed to V2 backlog).

---

## Defect ledger

| Defect ID | Test Case | Module | Title | Severity | Steps to reproduce | Expected | Actual | Environment | Reported by | Reported on | Owner | Status | Fix ref | Retested by | Retested on |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| UAT-DEF-001 | UAT-A-001 | A | *e.g. Referral loses period on submit* | Major | 1. …<br>2. … | Period preserved | Period wiped | Test/UAT | J. Doe | 2026-07-04 | LG_ADMIN | OPEN | — | — | — |

Statuses: `OPEN` → `IN_FIX` → `READY_FOR_RETEST` → `CLOSED` / `WONT_FIX` / `DEFERRED_V2`.

## Attachments folder

Store screenshots and console/network captures under
`docs/legal/UAT/evidence/UAT-DEF-<id>/`.

## Daily standup summary (fill in during UAT)

| Date | Blockers open | Majors open | Minors open | Closed today |
|---|---|---|---|---|
| YYYY-MM-DD | 0 | 0 | 0 | 0 |
