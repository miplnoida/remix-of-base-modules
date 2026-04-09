# Validation Framework

> **Knowledge Repository Entry** — Last updated: 2026-04-09

## Overview

The application uses a **centralized, declarative validation framework** built on three layers:

1. **`src/lib/contactValidation.ts`** — Low-level format validators for phone, email, and SSN fields.
2. **`src/lib/fieldValidationRegistry.ts`** — Declarative registry mapping `module.field` keys to validation rules.
3. **`src/validations/employerValidationSchema.ts`** / **`src/lib/fieldLengths.ts`** — DB column length constants (`ER_FIELD_LIMITS`, `IP_MASTER_FIELDS`).

## Design Principles

| Principle | Detail |
|---|---|
| **Max length from DB** | Every `maxLength` is derived from `ER_FIELD_LIMITS` or `IP_MASTER_FIELDS` — never hardcoded in components. |
| **Format validation** | Phone: digits + optional leading `+`. Email: RFC pattern. SSN: exactly 6 digits. |
| **Single entry point** | `validateField(ruleKey, value)` and `validateForm(module, formData)` are the only validation APIs needed. |
| **UI standard** | Errors shown as `text-xs text-destructive mt-1` below the field, with `border-destructive` on the input. |

## Supported Types

| Type | Validation |
|---|---|
| `text` | Required check, min/max length |
| `phone` | Digits-only (optional `+`), max length from DB |
| `email` | RFC pattern, max length from DB |
| `ssn` | Digits-only, exact length (default 6) |
| `number` | Required check |
| `date` | Required check |

## Adding a New Field

1. Add the DB column length to `ER_FIELD_LIMITS` or `IP_MASTER_FIELDS`.
2. Add a rule entry in `FIELD_RULES` inside `fieldValidationRegistry.ts`:

```typescript
'mymodule.fieldname': { type: 'phone', label: 'Field Label', maxLength: ER_FIELD_LIMITS.my_field },
```

3. In the form component, call `validateField('mymodule.fieldname', value)` on change and on submit.

## Form Integration Pattern

```tsx
const [errors, setErrors] = useState<Record<string, string>>({});

// On field change — clear error + re-validate
const handleChange = (field: string, value: string) => {
  setFormData(prev => ({ ...prev, [field]: value }));
  const result = validateField(`owner.${field}`, value);
  setErrors(prev => {
    const next = { ...prev };
    if (result.valid) delete next[field];
    else next[field] = result.error!;
    return next;
  });
};

// On save — full form validation
const handleSave = () => {
  const allErrors = validateForm('owner', formData);
  if (Object.keys(allErrors).length > 0) {
    setErrors(allErrors);
    toast.error('Please check the form for valid information!');
    return;
  }
  // proceed with save
};
```

## Error Display Standard

```tsx
<EditField label="Phone" value={v} onChange={...} maxLength={10} error={errors.phone} />
```

The `EditField` component renders:
- Red border: `border-destructive focus-visible:ring-destructive`
- Error text: `<p className="text-xs text-destructive mt-1">{error}</p>`

## Test Scenarios

| Scenario | Expected |
|---|---|
| Phone with letters | Error: "must contain only digits" |
| Email without `@` | Error: "Invalid email format" |
| SSN with 5 digits | Error: "must be exactly 6 digits" |
| Empty required Name | Error: "Name is required" |
| Valid inputs | No errors, save succeeds |
