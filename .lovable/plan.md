## Fix: current-month period still shows as un-deletable

**Cause**: `useC3PeriodsDeletability` in `src/hooks/useC3ConfigManagement.ts` (lines 419–424) is a client-side mirror of the DB rule, and it still uses the old `start <= currentMonthStart` check. The DB RPC was already relaxed, but the UI tooltip / disabled-state comes from this hook, so the trash icon stays frozen.

## Change

In `src/hooks/useC3ConfigManagement.ts`, replace the Rule 2 block:

```ts
// Rule 2: only strictly past months are frozen (C3 for a period is filed
// in the FOLLOWING month, so the current month is still deletable).
const start = new Date(p.start_date + 'T00:00:00');
if (start < currentMonthStart) {
  result[p.id] = { canDelete: false, reason: 'Period is in the past — already used in C3 generation and frozen' };
  continue;
}
```

Logic and message now match the DB RPC exactly. No other files need changes.
