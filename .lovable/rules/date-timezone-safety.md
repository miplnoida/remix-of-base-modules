---
Title: constraints/date-timezone-safety
Content:
# Date Timezone Safety Standard

## Mandatory Rule
All date picker controls and date string parsing MUST treat values as date-only fields. No implicit timezone or UTC conversion is allowed when binding dates between calendar controls, textboxes, and the database.

## The Problem
`new Date("2026-01-01")` and `parseISO("2026-01-01")` interpret date-only strings as **UTC midnight**. In negative-offset timezones (e.g., UTC-5), this becomes Dec 31, 2025 23:00 local time, causing an off-by-one-day display bug.

## Required Implementation

### Parsing Date Strings
Always use `parseDateSafe` from `@/lib/dateFormat`:
```typescript
import { parseDateSafe } from '@/lib/dateFormat';

// CORRECT - timezone-safe
const date = parseDateSafe("2026-01-01"); // Creates local noon

// PROHIBITED - causes timezone offset
const date = new Date("2026-01-01");      // UTC midnight
const date = parseISO("2026-01-01");      // UTC midnight
```

### Storing Dates
Always use `formatDateForStorage` from `@/lib/dateFormat`:
```typescript
import { formatDateForStorage } from '@/lib/dateFormat';

// CORRECT - extracts local year/month/day
const stored = formatDateForStorage(date); // "2026-01-01"

// PROHIBITED - may shift due to UTC conversion
const stored = date.toISOString().split('T')[0];
```

### Displaying Dates
Always use `formatDisplayDate` from `@/lib/dateFormat` (uses global system setting):
```typescript
import { formatDisplayDate } from '@/lib/dateFormat';

// CORRECT
<span>{formatDisplayDate(record.date)}</span>

// PROHIBITED - hardcoded format
<span>{format(new Date(dateStr), 'dd/MM/yyyy')}</span>
```

## Prohibited Patterns
- `new Date(dateString)` where dateString is a date-only string (yyyy-MM-dd)
- `parseISO(dateString)` where dateString is a date-only string
- `date.toISOString().split('T')[0]` for storage formatting
- `format(date, 'dd/MM/yyyy')` with hardcoded format strings

## Key Files
- **Safe Parser**: `parseDateSafe` in `src/lib/dateFormat.ts`
- **Storage Formatter**: `formatDateForStorage` in `src/lib/dateFormat.ts`
- **Display Formatter**: `formatDisplayDate` in `src/lib/dateFormat.ts`
