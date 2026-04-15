

# Employer Meeting Form — Required Field Indicators & Validation Highlighting

## Problem
When a user clicks "Accept" on the employer meeting workbench, the `validateEmployerApplicationForConversion` function blocks with a generic error toast (e.g., "Employer name is required"), but the form fields themselves have no visual indicators showing which fields are required or which failed validation.

## Root Cause
1. The `EditField` component supports an `error` prop (red border + message), but the employer meeting form tabs (Employer Profile, Basic Details, Contact & Reach, Tech & Finance) never pass field-level errors — only the Owner/Location dialogs do.
2. The `validateEmployerApplicationForConversion` function only checks 3 things: `employer_name`, `ownership_code`, and at least one contact method. But the RPC defaults missing values silently (e.g., `office_code` defaults to `'STK'`), so the real validation gap is on the client form UX, not the server.
3. No required-field asterisk (`*`) indicators exist on any tab fields.

## Plan

### 1. Add validation state to `EmployerApplicationEditForm`
- Add a `validationErrors: Record<string, string>` state
- Add a `validateAllTabs()` function that checks all required fields across all tabs
- Expose a `triggerValidation()` method (via `React.forwardRef` + `useImperativeHandle`) so the parent `StartMeetingPage` can call it on Accept click

**Required fields to validate** (matching the conversion function + RPC needs):
- **Employer Profile tab**: `ownership_code` (required)
- **Basic Details tab**: `employer_name` (required, max 40), `hq_address1` (recommended), `application_date`
- **Contact & Reach tab**: at least one of `contact_telephone`, `email`, `mobile`; `village_code`, `activity_type`

### 2. Add required-field indicators (`*`) to labels
- Update `EditField` and `SelectField` components to accept an `isRequired` prop
- When `isRequired` is true, append a red asterisk to the label
- Apply this to: `employer_name`, `ownership_code`, `contact_telephone` (or email/mobile), `village_code`, `activity_type`

### 3. Highlight invalid fields with red borders on Accept
- When validation fails, set `validationErrors` state with field→message map
- Pass `error={validationErrors[fieldName]}` to each `EditField` and `SelectField`
- Fields will show red border + error message below (already supported by `EditField`)
- Extend `SelectField` to also support the `error` prop (red border + message)

### 4. Show error badge on tab triggers
- When validation errors exist in a tab, show a red error count badge on the tab trigger (e.g., "Basic Details ②")
- Group errors by tab to compute per-tab counts

### 5. Auto-navigate to first error tab
- When validation fails on Accept click, auto-switch to the tab containing the first error
- Show toast with the first error message

### 6. Clear errors on field change
- When a field value changes, remove its entry from `validationErrors`
- Real-time inline clearing as the user fixes fields

## Files to Modify

1. **`src/components/meetings/EmployerApplicationEditForm.tsx`** — Add validation state, required indicators, error passing, tab error badges, `forwardRef` + imperative handle
2. **`src/pages/meetings/StartMeetingPage.tsx`** — Call `triggerValidation()` on Accept click before opening confirmation dialog; use ref to the employer form
3. **`src/hooks/useConvertToEmployerRegistration.ts`** — Enhance `validateEmployerApplicationForConversion` to include all required fields with specific field names matching the form

## Technical Details
- No database changes needed — this is purely client-side validation UX
- No new Supabase endpoints required
- The `EditField` component already supports `error` prop with red border styling
- `SelectField` needs a minor extension to support `error` prop (add `className` pass-through to SearchableSelect wrapper)

