---
Title: ui/global-date-format-standard
Content:
# Global Date Format Standard

## Overview
All date displays in the application MUST use the global `display_date_format` system setting. Hardcoded date formats are NOT permitted.

## System Setting
- **Setting Key**: `display_date_format`
- **Location**: System Administration → Global Settings
- **Default**: `dd/MM/yyyy`

## Required Implementation

### For New Screens and Components
Always import and use the centralized formatting utilities:

```typescript
import { formatDisplayDate, formatDisplayDateTime } from '@/lib/dateFormat';

// Display a date
<span>{formatDisplayDate(record.createdAt)}</span>

// Display date with time
<span>{formatDisplayDateTime(record.updatedAt)}</span>
```

### Hook-Based Approach (for reactive updates)
```typescript
import { useDateFormat } from '@/hooks/useDateFormat';

const MyComponent = () => {
  const { formatDate, formatDateTime } = useDateFormat();
  return <span>{formatDate(someDate)}</span>;
};
```

## Prohibited Patterns
Do NOT use these patterns:
- `new Date(value).toLocaleDateString()`
- `date-fns format()` with hardcoded format strings
- Custom inline formatDate functions
- Any hardcoded date format like `dd-MM-yyyy` in component code

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
