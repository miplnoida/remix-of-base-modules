

# Centralized Validation for Owner Dialog + Framework Alignment

## Problem
The Owner add/edit dialog has zero validation. Users can save empty names, letters in phone fields, malformed emails, and incomplete SSNs. Max lengths are hardcoded in JSX instead of being derived from the database column definitions already captured in `ER_FIELD_LIMITS`.

## Design Principle
- **Max length**: Always derived from `ER_FIELD_LIMITS` (which mirrors DB column sizes) -- never hardcoded per field
- **Format validation**: Email pattern, phone digits-only, SSN exactly 6 digits -- uses existing utilities
- **Required fields**: Name and SSN are mandatory for owners

## Changes

### 1. `src/components/meetings/EmployerApplicationEditForm.tsx`

**Enhance `EditField` component** to accept an `error` prop:
- When set, show red border on the input and red error text below it
- Follow the project's `text-xs text-destructive mt-1` standard

**Owner dialog -- wire validation:**
- Add `ownerErrors` state (`Record<string, string>`)
- Import `ER_FIELD_LIMITS` from `src/validations/employerValidationSchema.ts` and `validatePhone`, `validateEmail`, `sanitizePhoneInput` from `contactValidation.ts`
- Replace hardcoded `maxLength` values with `ER_FIELD_LIMITS` lookups (e.g. `owner_name: 40`, `owner_title: 25`, `owner_phone: 10`, `owner_mobile: 10`, `owner_email: 30`, `owner_ssn: 6`)
- Phone/Mobile fields: sanitize input on change via `sanitizePhoneInput()`, validate format on change
- Email field: validate format on change using `validateEmail()` with maxLength from `ER_FIELD_LIMITS.owner_email` (30)
- SSN field: digits-only filtering on change, validate exactly 6 digits on change and on submit
- Name field: required validation on change and submit
- **On Save click**: run full validation on all fields; if errors exist, show toast and block save; otherwise proceed
- Clear individual field errors as user types (onChange)

**Location dialog -- same pattern:**
- Add `locErrors` state
- Validate `trade_name` as required on save
- Use `ER_FIELD_LIMITS` for `loc_trade_name: 40`, `loc_addr1: 25`, `loc_addr2: 25`, `loc_activity_type: 50`

### 2. `src/lib/contactValidation.ts`

**Add `validateSSN` function:**
```typescript
export function validateSSN(
  value: string | null | undefined,
  label = 'SSN',
  required = true,
): ValidationResult {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return required ? { valid: false, error: `${label} is required` } : { valid: true };
  if (!/^\d+$/.test(trimmed)) return { valid: false, error: `${label} must contain only digits` };
  const ssnLen = 6; // from FORMAT_CONFIG.ssnLength
  if (trimmed.length !== ssnLen) return { valid: false, error: `${label} must be exactly ${ssnLen} digits` };
  return { valid: true };
}
```

**Update `validatePhone` and `validateEmail`** to accept an explicit `maxLen` parameter override, so callers can pass the DB column length directly instead of relying on the hardcoded lookup maps:
```typescript
export function validatePhone(value, fieldName, label, required, maxLenOverride?)
```
When `maxLenOverride` is provided, use it; otherwise fall back to the existing `PHONE_MAX_LENGTHS` map. This ensures max length is always driven by the DB schema definition passed by the caller.

### 3. `src/lib/fieldValidationRegistry.ts` (New File)

Create a lightweight registry that maps `module.field` keys to validation rules. Each rule references the DB column max length from the existing `ER_FIELD_LIMITS` / `IP_MASTER_FIELDS` constants rather than duplicating values:

```typescript
import { ER_FIELD_LIMITS } from '@/validations/employerValidationSchema';
import { IP_MASTER_FIELDS } from '@/lib/fieldLengths';

interface FieldRule {
  type: 'text' | 'phone' | 'email' | 'ssn' | 'number' | 'date';
  label: string;
  required?: boolean;
  minLength?: number;
  maxLength: number; // Always from DB column definition
}

const FIELD_RULES: Record<string, FieldRule> = {
  'owner.name':   { type: 'text',  label: 'Name',   required: true, maxLength: ER_FIELD_LIMITS.owner_name },
  'owner.title':  { type: 'text',  label: 'Title',  maxLength: ER_FIELD_LIMITS.owner_title },
  'owner.phone':  { type: 'phone', label: 'Phone',  maxLength: ER_FIELD_LIMITS.owner_phone },
  'owner.mobile': { type: 'phone', label: 'Mobile', maxLength: ER_FIELD_LIMITS.owner_mobile },
  'owner.email':  { type: 'email', label: 'Email',  maxLength: ER_FIELD_LIMITS.owner_email },
  'owner.ssn':    { type: 'ssn',   label: 'SSN',    required: true, minLength: 6, maxLength: ER_FIELD_LIMITS.owner_ssn },
  // Extensible for other modules...
};

export function validateField(ruleKey: string, value: any): ValidationResult { ... }
export function validateForm(module: string, formData: Record<string, any>): Record<string, string> { ... }
```

### 4. `docs/VALIDATION-FRAMEWORK.md` (New File)

Knowledge repository entry documenting:
- Max length is always derived from DB column definitions (ER_FIELD_LIMITS, IP_MASTER_FIELDS)
- Format rules per type (phone, email, SSN)
- How to add new fields to the registry
- Error display standards

## Files Summary

| File | Action | Purpose |
|---|---|---|
| `src/components/meetings/EmployerApplicationEditForm.tsx` | Edit | Add error prop to EditField, wire validation to Owner + Location dialogs |
| `src/lib/contactValidation.ts` | Edit | Add `validateSSN()`, add `maxLenOverride` param to phone/email validators |
| `src/lib/fieldValidationRegistry.ts` | Create | Central registry referencing DB column lengths |
| `docs/VALIDATION-FRAMEWORK.md` | Create | Knowledge repository documentation |

## No Backend/Database Changes Required
Existing `ER_FIELD_LIMITS` and `erOwnerValidationSchema` already mirror the DB schema. No new constraints or migrations needed.

