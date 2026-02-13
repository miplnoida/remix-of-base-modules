/**
 * Global Contact Field Validation Utilities
 * 
 * MANDATORY STANDARD: All phone, mobile, fax, and email fields across the entire
 * application MUST use these validation functions. No form, popup, or module may
 * bypass these rules.
 * 
 * Rules:
 * - Phone/Mobile/Fax: Only digits and optional leading '+'. No letters or special chars.
 * - Email: RFC-compliant format validation.
 * - All fields: Trim whitespace before validation. Enforce DB column max length.
 * - Both client-side and server-side (Supabase triggers) enforce these rules.
 */

// ─── Phone / Mobile / Fax ────────────────────────────────────────────────────

/** Only digits, optionally prefixed with '+' */
const PHONE_PATTERN = /^\+?\d*$/;

/** Default max lengths per DB column definitions */
export const PHONE_MAX_LENGTHS: Record<string, number> = {
  // ip_master
  phone: 10,
  phone_mobile: 10,
  telephone: 15,   // text column, no explicit limit – enforce 15
  mobile: 15,      // text column – enforce 15
  contact_phone: 10,
  contact_mobile: 10,
  // er_master
  fax: 10,
  // er_owner
  // meetings
  // Generic fallback
  default: 15,
};

/** Default max lengths for email columns */
export const EMAIL_MAX_LENGTHS: Record<string, number> = {
  email: 40,
  email_addr: 40,
  contact_email: 40,
  payerEmail: 75,
  emailAddress: 75,
  default: 75,
};

/** RFC-compliant email pattern */
const EMAIL_PATTERN = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

// ─── Validation functions ────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate a phone/mobile/fax number value.
 * @param value - Raw input value
 * @param fieldName - Field identifier (used to look up max length)
 * @param label - Human-readable label for error messages (e.g. "Phone Number")
 * @param required - Whether the field is mandatory
 */
export function validatePhone(
  value: string | null | undefined,
  fieldName: string = 'phone',
  label: string = 'Phone number',
  required: boolean = false,
): ValidationResult {
  const trimmed = (value ?? '').trim();

  if (!trimmed) {
    return required
      ? { valid: false, error: `${label} is required` }
      : { valid: true };
  }

  if (!PHONE_PATTERN.test(trimmed)) {
    return { valid: false, error: `${label} must contain only digits (and optional leading +)` };
  }

  const maxLen = PHONE_MAX_LENGTHS[fieldName] ?? PHONE_MAX_LENGTHS.default;
  if (trimmed.length > maxLen) {
    return { valid: false, error: `${label} exceeds maximum length of ${maxLen} characters` };
  }

  return { valid: true };
}

/**
 * Validate an email address value.
 * @param value - Raw input value
 * @param fieldName - Field identifier (used to look up max length)
 * @param label - Human-readable label for error messages
 * @param required - Whether the field is mandatory
 */
export function validateEmail(
  value: string | null | undefined,
  fieldName: string = 'email',
  label: string = 'Email',
  required: boolean = false,
): ValidationResult {
  const trimmed = (value ?? '').trim();

  if (!trimmed) {
    return required
      ? { valid: false, error: `${label} is required` }
      : { valid: true };
  }

  const maxLen = EMAIL_MAX_LENGTHS[fieldName] ?? EMAIL_MAX_LENGTHS.default;
  if (trimmed.length > maxLen) {
    return { valid: false, error: `${label} exceeds maximum length of ${maxLen} characters` };
  }

  if (!EMAIL_PATTERN.test(trimmed)) {
    return { valid: false, error: `Invalid ${label.toLowerCase()} format (e.g. user@example.com)` };
  }

  return { valid: true };
}

/**
 * Sanitize phone input: strip non-digit characters except leading +
 */
export function sanitizePhoneInput(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith('+')) {
    return '+' + trimmed.slice(1).replace(/\D/g, '');
  }
  return trimmed.replace(/\D/g, '');
}

/**
 * Get the max length for a phone field
 */
export function getPhoneMaxLength(fieldName: string): number {
  return PHONE_MAX_LENGTHS[fieldName] ?? PHONE_MAX_LENGTHS.default;
}

/**
 * Get the max length for an email field
 */
export function getEmailMaxLength(fieldName: string): number {
  return EMAIL_MAX_LENGTHS[fieldName] ?? EMAIL_MAX_LENGTHS.default;
}

/**
 * Validate multiple contact fields at once and return errors object.
 * Useful in form validation steps.
 */
export function validateContactFields(
  fields: Array<{
    value: string | null | undefined;
    fieldName: string;
    label: string;
    type: 'phone' | 'email';
    required?: boolean;
  }>,
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const field of fields) {
    const result =
      field.type === 'phone'
        ? validatePhone(field.value, field.fieldName, field.label, field.required)
        : validateEmail(field.value, field.fieldName, field.label, field.required);

    if (!result.valid && result.error) {
      errors[field.fieldName] = result.error;
    }
  }

  return errors;
}
