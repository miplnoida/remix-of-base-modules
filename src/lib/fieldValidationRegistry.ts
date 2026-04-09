/**
 * Centralized Field Validation Registry
 *
 * Maps module-prefixed field keys to validation rules. Max lengths are always
 * derived from the DB column definitions in ER_FIELD_LIMITS / IP_MASTER_FIELDS
 * so they stay in sync with the schema automatically.
 *
 * Usage:
 *   import { validateField, validateForm } from '@/lib/fieldValidationRegistry';
 *   const err = validateField('owner.phone', value);
 *   const allErrors = validateForm('owner', { name, phone, email, ssn });
 */

import { ER_FIELD_LIMITS } from '@/validations/employerValidationSchema';
import { IP_MASTER_FIELDS } from '@/lib/fieldLengths';
import {
  validatePhone,
  validateEmail,
  validateSSN,
  type ValidationResult,
} from '@/lib/contactValidation';

// ─── Rule Definition ─────────────────────────────────────────────────────────

export interface FieldRule {
  type: 'text' | 'phone' | 'email' | 'ssn' | 'number' | 'date';
  label: string;
  required?: boolean;
  minLength?: number;
  maxLength: number; // Always from DB column definition
  pattern?: RegExp;
  patternMessage?: string;
}

// ─── Registry ────────────────────────────────────────────────────────────────

const FIELD_RULES: Record<string, FieldRule> = {
  // Owner fields (er_owner table)
  'owner.name':   { type: 'text',  label: 'Name',   required: true,  maxLength: ER_FIELD_LIMITS.owner_name },
  'owner.title':  { type: 'text',  label: 'Title',                   maxLength: ER_FIELD_LIMITS.owner_title },
  'owner.phone':  { type: 'phone', label: 'Phone',                   maxLength: ER_FIELD_LIMITS.owner_phone },
  'owner.mobile': { type: 'phone', label: 'Mobile',                  maxLength: ER_FIELD_LIMITS.owner_mobile },
  'owner.email':  { type: 'email', label: 'Email',                   maxLength: ER_FIELD_LIMITS.owner_email },
  'owner.ssn':    { type: 'ssn',   label: 'SSN',    required: true,  minLength: 6, maxLength: ER_FIELD_LIMITS.owner_ssn },

  // Location fields (er_locations table)
  'location.trade_name':   { type: 'text', label: 'Trade Name',     required: true, maxLength: ER_FIELD_LIMITS.loc_trade_name },
  'location.address1':     { type: 'text', label: 'Address Line 1',                maxLength: ER_FIELD_LIMITS.loc_addr1 },
  'location.address2':     { type: 'text', label: 'Address Line 2',                maxLength: ER_FIELD_LIMITS.loc_addr2 },
  'location.activity_type':{ type: 'text', label: 'Activity Type',                 maxLength: ER_FIELD_LIMITS.loc_activity_type },

  // ER Master contact fields
  'er.phone':  { type: 'phone', label: 'Phone', maxLength: ER_FIELD_LIMITS.phone },
  'er.fax':    { type: 'phone', label: 'Fax',   maxLength: ER_FIELD_LIMITS.fax },
  'er.mobile': { type: 'phone', label: 'Mobile',maxLength: ER_FIELD_LIMITS.mobile },
  'er.email':  { type: 'email', label: 'Email', maxLength: ER_FIELD_LIMITS.email },

  // IP Master contact fields
  'ip.telephone':     { type: 'phone', label: 'Telephone',     maxLength: IP_MASTER_FIELDS.telephone.maxLength },
  'ip.mobile':        { type: 'phone', label: 'Mobile',        maxLength: IP_MASTER_FIELDS.mobile.maxLength },
  'ip.email_addr':    { type: 'email', label: 'Email',         maxLength: IP_MASTER_FIELDS.email_addr.maxLength },
  'ip.contact_phone': { type: 'phone', label: 'Contact Phone', maxLength: IP_MASTER_FIELDS.contact_phone.maxLength },
  'ip.contact_mobile':{ type: 'phone', label: 'Contact Mobile',maxLength: IP_MASTER_FIELDS.contact_mobile.maxLength },
  'ip.contact_email': { type: 'email', label: 'Contact Email', maxLength: IP_MASTER_FIELDS.contact_email.maxLength },
  'ip.ssn':           { type: 'ssn',   label: 'SSN', required: true, minLength: 6, maxLength: IP_MASTER_FIELDS.ssn.maxLength },
};

// ─── Validate a single field ─────────────────────────────────────────────────

export function validateField(ruleKey: string, value: any): ValidationResult {
  const rule = FIELD_RULES[ruleKey];
  if (!rule) return { valid: true };

  const strVal = value == null ? '' : String(value);

  switch (rule.type) {
    case 'phone':
      return validatePhone(strVal, ruleKey, rule.label, !!rule.required, rule.maxLength);

    case 'email':
      return validateEmail(strVal, ruleKey, rule.label, !!rule.required, rule.maxLength);

    case 'ssn':
      return validateSSN(strVal, rule.label, !!rule.required, rule.maxLength);

    case 'text': {
      const trimmed = strVal.trim();
      if (!trimmed && rule.required) {
        return { valid: false, error: `${rule.label} is required` };
      }
      if (trimmed && rule.minLength && trimmed.length < rule.minLength) {
        return { valid: false, error: `${rule.label} must be at least ${rule.minLength} characters` };
      }
      if (trimmed && trimmed.length > rule.maxLength) {
        return { valid: false, error: `${rule.label} exceeds maximum length of ${rule.maxLength} characters` };
      }
      return { valid: true };
    }

    case 'number': {
      if (rule.required && (value == null || value === '')) {
        return { valid: false, error: `${rule.label} is required` };
      }
      return { valid: true };
    }

    default:
      return { valid: true };
  }
}

// ─── Validate all fields for a module ────────────────────────────────────────

export function validateForm(
  module: string,
  formData: Record<string, any>,
): Record<string, string> {
  const errors: Record<string, string> = {};
  const prefix = `${module}.`;

  for (const [key, rule] of Object.entries(FIELD_RULES)) {
    if (!key.startsWith(prefix)) continue;
    const fieldName = key.slice(prefix.length);
    const result = validateField(key, formData[fieldName]);
    if (!result.valid && result.error) {
      errors[fieldName] = result.error;
    }
  }

  return errors;
}

// ─── Get rule for a field (for maxLength in UI) ──────────────────────────────

export function getFieldRule(ruleKey: string): FieldRule | undefined {
  return FIELD_RULES[ruleKey];
}
