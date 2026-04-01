

# Remove Audit Holiday Calendar & Consolidate on Global Settings Public Holidays

## Overview

Remove the duplicate Holiday Calendar screen (`/audit/holidays`) and its backing `ia_holidays` table. Migrate all audit module consumers to use the `public_holidays` table from Global Settings. Add the missing `is_ssb_specific` flag to `public_holidays` so no functionality is lost.

---

## Changes

### 1. Database Migration — Extend `public_holidays`

Add `is_ssb_specific` boolean column (default `false`) to `public_holidays` to preserve the SSB-specific holiday type that existed in `ia_holidays`.

### 2. Migrate Audit Consumers to `public_holidays`

**Update `useAuditData.ts`**: Rewrite `useIAHolidays()` to query `public_holidays` instead of `ia_holidays`. Map column names (`holiday_date` → `date`, `holiday_name` → `name`). Remove `useIAHolidayMutations()` (CRUD now handled exclusively in Global Settings).

**Consumers affected** (no UI changes needed — they just call `useIAHolidays()`):
- `src/pages/audit/WorkloadCapacity.tsx`
- `src/components/audit/TeamAvailabilityDashboard.tsx`
- `src/pages/audit/HolidayManagement.tsx` — this is another duplicate; remove it too

### 3. Remove Holiday Calendar Screen & Routes

- Delete `src/pages/audit/HolidayCalendar.tsx`
- Delete `src/pages/audit/HolidayManagement.tsx`
- Remove route from `src/components/routing/AppRoutes.tsx` (line 964)
- Remove lazy import (line 223)
- Remove from `src/components/sidebar/menuItems/auditMenuItems.ts` (Holiday Calendar entry)
- Remove from `src/config/auditRouteConfig.ts` (line 96)
- Remove from `src/hooks/useDynamicNavigation.ts` (route `/audit/holidays` references)

### 4. Update Global Settings `PublicHolidaysSection`

Add an `is_ssb_specific` checkbox to the Add/Edit dialog so admins can mark holidays as SSB-specific (preserving the feature from the removed screen).

---

## Files Changed

| File | Change |
|------|--------|
| Migration SQL | Add `is_ssb_specific` to `public_holidays` |
| `src/hooks/useAuditData.ts` | Rewrite `useIAHolidays` to query `public_holidays`; remove mutations |
| `src/pages/audit/HolidayCalendar.tsx` | Delete |
| `src/pages/audit/HolidayManagement.tsx` | Delete |
| `src/components/routing/AppRoutes.tsx` | Remove route + lazy import |
| `src/components/sidebar/menuItems/auditMenuItems.ts` | Remove Holiday Calendar entry |
| `src/config/auditRouteConfig.ts` | Remove holiday-management entry |
| `src/hooks/useDynamicNavigation.ts` | Remove `/audit/holidays` references |
| `src/components/admin/PublicHolidaysSection.tsx` | Add SSB-specific checkbox |

