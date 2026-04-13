

## Fix: Period-From/Period-To Filter Not Working on C3 Screens

### Root Cause

All three screens (C3 Contribution, NW Director, Self Employed) construct the period filter as:

```
periodFrom = `${periodFromMonth}-${periodFromYear}`  →  "Jan-2026"
```

However, the `period` column in the database is a `date` type stored as `2026-01-01`. The external API (wiz-admin-api) likely cannot parse `Jan-2026` into a valid date for comparison, so the period filter is silently ignored and all records are returned unfiltered.

### Fix

Convert the month abbreviation + year into `YYYY-MM-01` format before sending to the API. For example, `Jan` + `2026` → `2026-01-01`.

**Files to modify:**

| File | Change |
|------|--------|
| `src/pages/c3Management/c3Details/C3ContributionList.tsx` | Convert period format from `Jan-2026` to `2026-01-01` |
| `src/pages/c3Management/c3Details/NwDirectorList.tsx` | Same conversion |
| `src/pages/c3Management/c3Details/SelfEmployedContributionList.tsx` | Same conversion |

### Technical Detail

Add a helper (or inline) that maps the 3-letter month abbreviation to a zero-padded month number:

```typescript
function toDatePeriod(month: string, year: string): string {
  const idx = MONTHS.indexOf(month); // 0-based
  const mm = String(idx + 1).padStart(2, '0');
  return `${year}-${mm}-01`;
}
```

Then in each `handleSearch`:
```typescript
// Before (broken):
const periodFrom = periodFromMonth && periodFromYear
  ? `${periodFromMonth}-${periodFromYear}` : undefined;

// After (fixed):
const periodFrom = periodFromMonth && periodFromYear
  ? toDatePeriod(periodFromMonth, periodFromYear) : undefined;
```

This applies identically to all three files. No API or database changes needed.

