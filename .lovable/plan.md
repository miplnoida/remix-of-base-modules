## Fix: Violation History page shows no records

### Root cause
`ce_violation_history` has two duplicate FKs to `ce_violations` on `violation_id` (`ce_violation_history_violation_id_fkey` and `fk_ce_violation_history_violation`). PostgREST can't resolve the embed `ce_violations(...)` and the query errors out — React Query returns `[]` and the UI shows "No history records".

### Changes

1. **DB migration — drop the duplicate FK** so future embeds stay unambiguous:
   - `ALTER TABLE public.ce_violation_history DROP CONSTRAINT fk_ce_violation_history_violation;`
   - Keep the canonical `ce_violation_history_violation_id_fkey`.

2. **`src/pages/compliance/violations/ViolationHistory.tsx`** — make the page resilient even if a future schema change reintroduces ambiguity:
   - Disambiguate the embed: `ce_violations!ce_violation_history_violation_id_fkey(violation_number, employer_id, employer_name)`.
   - Surface query errors in the UI (small inline error banner) instead of silently rendering an empty table, so this class of bug is visible next time.
   - Fix the `.or(...)` search so it only targets columns on `ce_violation_history` (`performed_by`, `notes`, `action`) — current form is already correct, leave as-is.

3. No other call sites of `ce_violation_history` need changes (per `rg` they all query without the ambiguous embed).

### Validation
- Reload `/compliance/violations/history` — list should show the 83 history rows newest-first with violation number and employer.
- Filter by `action = "Cancelled"` and search by `SAdmin` should both return rows.
- Build passes.
