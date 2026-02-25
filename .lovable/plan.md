

## Error Analysis: Correlation ID `123093d6-b309-4df5-8905-e71e11adac5c`

### Root Cause

The error `TypeError: Cannot read properties of undefined (reading 'has')` occurred at `StartMeetingPage.tsx` inside the `InsuredPersonEditForm` component. The crash happened in the document filtering logic where `replacedDocCategories.has(category)` was called.

The prop `replacedDocCategories` is typed as `Set<string> | undefined` (optional). Although the parent component initializes it with `useState<Set<string>>(new Set())`, the child components (`ApplicationEditForm` and `InsuredPersonEditForm`) declare it as optional (`replacedDocCategories?: Set<string>`). In certain rendering paths — particularly when a non-IP-Registration meeting type falls through or during the initial render cycle before state is fully hydrated — the value can be `undefined`.

### Current State

The code at line 1495 **already has** the optional chaining fix (`replacedDocCategories?.has(category)`). This means the error was from a **previous build** that lacked the `?.` guard, and it has since been corrected.

The error log timestamp is `2026-02-25T20:40:56` — this was before the latest deployment that added the optional chaining.

### Remaining Risk (Defensive Fix Needed)

Even though `?.has` prevents the crash, the prop is still optional and could silently skip filtering if undefined. A more robust fix:

1. **Default parameter value** — In `InsuredPersonEditForm`, default `replacedDocCategories` to `new Set()` in the destructuring so it is never undefined:
   ```typescript
   function InsuredPersonEditForm({ 
     ..., 
     replacedDocCategories = new Set<string>(), 
     ... 
   })
   ```

2. **Same for `ApplicationEditForm`** — Apply the same default in the interface destructuring.

3. **No other `.has()` call sites exist** — Confirmed only one usage at line 1495, already guarded.

### Implementation Plan

**File: `src/pages/meetings/StartMeetingPage.tsx`**

- **Line ~697**: In `ApplicationEditForm` destructuring, add default `replacedDocCategories = new Set()`.
- **Line ~719**: In `InsuredPersonEditForm` destructuring, add default `replacedDocCategories = new Set()`.

This is a one-line defensive change in two locations. No database or backend changes required.

### Verification

After the fix, navigate to `/meetings/start/<any-id>` with the Documents tab open. The page should render without errors. The error with correlation ID `123093d6-b309-4df5-8905-e71e11adac5c` should not recur.

