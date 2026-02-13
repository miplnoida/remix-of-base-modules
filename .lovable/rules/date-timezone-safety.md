---
Title: constraints/date-timezone-safety
Content:
# Date Timezone Safety Standard

## Mandatory Rule
All date picker controls and date string parsing MUST treat values as date-only fields. No implicit timezone or UTC conversion is allowed when binding dates between calendar controls, textboxes, and the database.

## Two Categories of Dates

### 1. Business Dates (NO timezone conversion)
Fields like Date of Birth, Period, Work Permit Expiry, Residency Date, Meeting Date, Application Dates, or any domain-specific business date.

These must be displayed exactly as stored. Use `formatDisplayDate` / `formatDisplayDateTime` (reads format from Global Settings).

### 2. Audit Timestamps (UTC → local conversion)
Fields like `created_at`, `updated_at`, `modified_on`, `inserted_on`, `verified_on`, `received_on`, or any audit-tracking timestamp.

These are stored in UTC and must be converted to the user's local timezone before rendering. Use `formatAuditDate` / `formatAuditDateTime`.

## Required Implementation

### Parsing Business Date Strings
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

### Displaying Business Dates
Always use `formatDisplayDate` from `@/lib/dateFormat` (uses global system setting):
```typescript
import { formatDisplayDate } from '@/lib/dateFormat';

// CORRECT
<span>{formatDisplayDate(record.dateOfBirth)}</span>

// PROHIBITED - hardcoded format
<span>{format(new Date(dateStr), 'dd/MM/yyyy')}</span>
```

### Displaying Audit Timestamps
Always use `formatAuditDate` or `formatAuditDateTime` from `@/lib/dateFormat`:
```typescript
import { formatAuditDate, formatAuditDateTime } from '@/lib/dateFormat';

// Date only (UTC → local, system format)
<span>{formatAuditDate(record.created_at, false)}</span>

// Date + time (UTC → local, system format + HH:mm)
<span>{formatAuditDateTime(record.created_at)}</span>

// Date + time + seconds
<span>{formatAuditDateTime(record.updated_at, true)}</span>
```

### Hook-Based Approach (reactive)
```typescript
import { useDateFormat } from '@/hooks/useDateFormat';

const { formatDate, formatDateTime, formatAudit, formatAuditDT } = useDateFormat();

// Business date
<span>{formatDate(record.dateOfBirth)}</span>

// Audit timestamp
<span>{formatAuditDT(record.created_at)}</span>
```

## Prohibited Patterns
- `new Date(dateString)` where dateString is a date-only string (yyyy-MM-dd)
- `parseISO(dateString)` where dateString is a date-only string
- `date.toISOString().split('T')[0]` for storage formatting
- `format(date, 'dd/MM/yyyy')` with hardcoded format strings
- `new Date(value).toLocaleDateString()` for any date display
- Any hardcoded date format in component code

## Key Files
- **Safe Parser**: `parseDateSafe` in `src/lib/dateFormat.ts`
- **Storage Formatter**: `formatDateForStorage` in `src/lib/dateFormat.ts`
- **Business Date Display**: `formatDisplayDate` in `src/lib/dateFormat.ts`
- **Business DateTime Display**: `formatDisplayDateTime` in `src/lib/dateFormat.ts`
- **Audit Date Display**: `formatAuditDate` in `src/lib/dateFormat.ts`
- **Audit DateTime Display**: `formatAuditDateTime` in `src/lib/dateFormat.ts`
- **Hook**: `useDateFormat` in `src/hooks/useDateFormat.ts`
- **Settings Context**: `src/contexts/SystemSettingsContext.tsx`
