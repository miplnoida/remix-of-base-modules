---
Title: ui/global-date-format-standard
Content:
# Global Date Format Standard

## Overview
All date displays in the application MUST use the global `display_date_format` system setting. Hardcoded date formats are NOT permitted.

## System Setting
- **Setting Key**: `display_date_format`
- **Location**: System Administration → Global Settings → Display Settings
- **Default**: `dd/MM/yyyy`

## Two Date Categories

### Business Dates (no TZ conversion)
DOB, Period, Expiry, Meeting Date, Application Date, etc. Use `formatDisplayDate` / `formatDisplayDateTime`.

### Audit Timestamps (UTC → local TZ)
`created_at`, `updated_at`, `modified_on`, `inserted_on`, etc. Use `formatAuditDate` / `formatAuditDateTime`.

## Required Implementation

### For New Screens and Components
Always import and use the centralized formatting utilities:

```typescript
import { formatDisplayDate, formatDisplayDateTime, formatAuditDate, formatAuditDateTime } from '@/lib/dateFormat';

// Business date
<span>{formatDisplayDate(record.dateOfBirth)}</span>

// Business date with time
<span>{formatDisplayDateTime(record.meetingDate)}</span>

// Audit timestamp (UTC → local, date + time)
<span>{formatAuditDateTime(record.created_at)}</span>

// Audit timestamp (UTC → local, date only)
<span>{formatAuditDate(record.created_at, false)}</span>
```

### Hook-Based Approach (for reactive updates)
```typescript
import { useDateFormat } from '@/hooks/useDateFormat';

const MyComponent = () => {
  const { formatDate, formatDateTime, formatAudit, formatAuditDT } = useDateFormat();
  return (
    <>
      <span>{formatDate(record.dateOfBirth)}</span>
      <span>{formatAuditDT(record.created_at)}</span>
    </>
  );
};
```

### DatePicker Components
Both `src/components/ip/DatePicker.tsx` and `src/components/ui/date-picker.tsx` automatically use the system format. No manual format prop needed.

## Prohibited Patterns
Do NOT use these patterns:
- `new Date(value).toLocaleDateString()`
- `date-fns format()` with hardcoded format strings
- Custom inline formatDate functions
- Any hardcoded date format like `dd-MM-yyyy` in component code
- `format(new Date(dateStr), 'MMM d, yyyy')` or similar

## Available Formats
Administrators can choose from:
- DD/MM/YYYY (31/12/2026)
- DD-MM-YYYY (31-12-2026)
- MM/DD/YYYY (12/31/2026)
- MM-DD-YYYY (12-31-2026)
- YYYY-MM-DD (2026-12-31)
- YYYY/MM/DD (2026/12/31)
- DD MMM YYYY (31 Dec 2026)
- MMM DD, YYYY (Dec 31, 2026)

## Key Files
- **Utility**: `src/lib/dateFormat.ts`
- **Hook**: `src/hooks/useDateFormat.ts`
- **Settings Hook**: `src/hooks/useSystemSettings.ts`
- **Context**: `src/contexts/SystemSettingsContext.tsx`
- **Admin Page**: `src/pages/systemAdmin/GlobalSettings.tsx`
