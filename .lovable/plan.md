

## Fix: Truncated Text in SearchableSelect Dropdowns

### Problem
The `SearchableSelect` dropdown panel is constrained to the trigger button's width via `w-[--radix-popover-trigger-width]`, and item labels use `truncate` class. In the workflow notification grid, the Module and Template columns are narrow, so dropdown items get clipped.

### Fix (single file)

**File: `src/components/ui/searchable-select.tsx`**

1. **Line 79** — Change `PopoverContent` width from fixed trigger-width to a minimum of trigger-width but allow it to grow:
   - Change: `className="w-[--radix-popover-trigger-width] p-0"` 
   - To: `className="min-w-[--radix-popover-trigger-width] w-auto max-w-[400px] p-0"`
   - This lets the dropdown expand to fit content up to 400px, while never being narrower than the trigger.

2. **Line 116** — Remove the `truncate` class from the label span so text wraps or displays fully:
   - Change: `<span className="truncate">`
   - To: `<span className="whitespace-normal break-words">`

These two changes ensure dropdown items show their full text in both Module and Template dropdowns across the entire application.

