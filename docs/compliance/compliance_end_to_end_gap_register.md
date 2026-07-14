# Compliance E2E — Gap Register (Living Document)

Source of truth for gaps discovered across Batches 1–5. Update on each batch.

## Legend
- **Severity:** Blocker · High · Medium · Low
- **Status:** Open · Fix Proposed · In Progress · Fixed · Won't Fix

## Batch 1 — Data + C3 + Payment detection (2026-07-14)

| ID | Severity | Status | Area | Summary | Evidence | Proposed direction |
|---|---|---|---|---|---|---|
| G1 | High | Open | Waivers config | `ce_waiver_rules` empty | `SELECT count(*) FROM ce_waiver_rules;` = 0 | Seed baseline rules; expose admin CRUD |
| G2 | High | Open | Legal handoff | `ce_legal_handoff` sparse | ≤3 rows | Add missing thresholds per policy matrix |
| G3 | Medium | Open | Waivers admin UX | No UI to author waiver rules | Route audit | Wire admin surface |
| G4 | Medium | Fixed | Repeat defaulters | Last Filing Period blank | Issue #9 fix in `riskProfileService.ts` | Regression check pending |
| G5 | **Blocker** | Open | Ledger sync | `ce-c3-ledger-sync` returns success with `processed_count=0` for seeded payers | run_id `442aac11-c8ec-4ce5-835e-5598fd8d315b` | Trace filter clause; likely posting_status/sync-flag join |
| G6 | **Blocker** | Open | Violation scan | `ce-violation-scan` runs stranded in `Running` status | 5 consecutive stranded runs since 2026-05-04 | Inspect completion path & error swallowing |
| G7 | High | Open | Automation jobs | 25/30 jobs `is_enabled=false` incl. LEDGER-*, JOB-NOTICE-GEN, JOB-PENALTY-RECALC | Query on `ce_automation_jobs` | Confirm intent; enable in controlled window |
| G8 | Medium | Open | Overdue detection | `run-overdue-detection` returns no body / no run record within 30s | curl timing | Add server-side logging; verify invocation shape |
| G9 | High | Open | Routes | `/compliance`, `/compliance/inspections`, `/compliance/legal` return 404 | Playwright body + console log | Register routes or hide menu items |
| G10 | Low | Open | PostgREST cache | Recent DDL triggers ~20s PGRST002 503 storm on reads | Console log burst | Debounce menu/permission reload; already self-recovers |

## Batch 2 — Assignment + Verification + Notices
_Not yet executed (blocked by G5, G6)._

## Batch 3 — Cases + Inspections
_Not yet executed._

## Batch 4 — Arrangements + Waivers
_Not yet executed._

## Batch 5 — Legal + Reports + Regression
_Not yet executed._
