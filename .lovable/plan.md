

# Fix Duplicate Page-View Audit Logs on Refresh

## Problem
In `SystemLoggingProvider.tsx`, `previousPath` is a `useRef` initialized to `''`. On every page refresh, React remounts, the ref resets to `''`, and the current pathname differs from `''`, so a new `page_view` audit entry is created. This causes duplicate route-entry logs on every refresh.

## Solution

Use `sessionStorage` to persist the last-logged route across refreshes. On mount, initialize `previousPath.current` from `sessionStorage` instead of `''`. This way, if the user refreshes the same page, the path matches and no duplicate log is created. When the user navigates to a new route, the new path is stored in `sessionStorage` and a fresh log is written.

### Changes to `src/providers/SystemLoggingProvider.tsx`

1. **Initialize `previousPath` from `sessionStorage`:** On component mount, read `sessionStorage.getItem('audit_last_route')` and set it as the initial value of `previousPath.current`.
2. **Persist on navigation:** When a new route is logged, write the path to `sessionStorage.setItem('audit_last_route', pathname)`.
3. **Clear on logout:** Listen for auth state changes — when user signs out, remove the key from `sessionStorage` so a fresh login gets a proper first page-view log.

### Files Modified
- `src/providers/SystemLoggingProvider.tsx` — ~5 lines changed

### What This Does NOT Change
- All mutation audit logs remain unaffected
- DB triggers remain unaffected  
- No database schema changes needed
- No new tables or columns required

