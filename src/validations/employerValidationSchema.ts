/**
 * Centralized validation rules for all ER (Employer Registration) database tables.
 * Field lengths, types, and constraints match the MS-SQL Server schema exactly.
 * 
 * Last updated: 2026-02-20
 */

import { z } from 'zod';

// ============================================================
// Field length constants (from DB schema)
// ============================================================
export const ER_FIELD_LIMITS = {
  // er_master
  regno: 6,
  name: 40,
  trade_name: 40,
  phone: 10,
  fax: 10,
  hq_addr1: 25,
  hq_addr2: 25,
  office_code: 3,
  activity_type: 50,
  industrial_code: 4,
  maddr1: 25,
  maddr2: 25,
  village_code: 3,
  sector_code: 1,
  arrears: 1,
  legal_action: 1,
  entered_by: 5,
  modified_by_master: 5,
  verified_by: 5,
  ownership_code: 3,
  previous_owner: 40,
  prev_owner_addr1: 25,
  prev_owner_addr2: 25,
  computer_payroll: 1,
  make_model: 30,
  disk_tape: 30,
  acquired_code: 1,
  status: 1,
  inspector_code: 3,
  parent_regno: 6,
  registry_num: 30,
  mobile: 10,
  email: 40,

  // er_owner
  owner_name: 40,
  owner_title: 25,
  owner_phone: 10,
  owner_mobile: 10,
  owner_email: 30,
  owner_ssn: 6,

  // er_locations
  loc_trade_name: 40,
  loc_addr1: 25,
  loc_addr2: 25,
  loc_activity_type: 50,

  // er_notes
  note: 100,
  note_user_id: 5,

  // er_commence
  commence_modified_by: 30,

  // er_suit
  suit_type: 3,
  suit_year: 4,
  suit_no: 4,
  suit_status: 1,
  scheme_code: 2,
  initial_suit_year: 4,
  initial_suit_no: 4,
  jds_year: 4,
  jds_no: 4,
  outcome_code: 3,
  remarks: 255,
  remarks2: 255,
  suit_entered_by: 5,
  suit_modified_by: 5,
  suit_verified_by: 5,

  // er_visit
  visit_inspector_code: 3,
  work_code: 1,
  visit_outcome_code: 3,
  operation_code: 3,

  // er_notification
  notif_status_code: 3,
  notif_userid: 30,
  notif_name: 25,
  notif_comment: 100,

  // er_last_regno
  last_regno: 6,
} as const;

// Numeric precision limits (numeric(10,2) => max 99999999.99)
export const ER_NUMERIC_LIMITS = {
  numeric_10_2: { max: 99999999.99, precision: 2 },
  numeric_15_0: { max: 999999999999999, precision: 0 },
  numeric_18_0: { max: 999999999999999999, precision: 0 },
} as const;

// ============================================================
// Reusable field validators
// ============================================================
const optionalString = (maxLen: number) =>
  z.string().max(maxLen, `Max ${maxLen} characters`).optional().or(z.literal(''));

const requiredString = (maxLen: number, label: string) =>
  z.string().min(1, `${label} is required`).max(maxLen, `Max ${maxLen} characters`);

const regnoField = () =>
  z.string().max(6, 'Max 6 characters').regex(/^[A-Za-z0-9]*$/, 'Only alphanumeric characters allowed');

const phoneField = () =>
  z.string().max(10, 'Max 10 characters').regex(/^\+?\d*$/, 'Only digits allowed (optional leading +)').optional().or(z.literal(''));

const charField = (len: number) =>
  z.string().max(len, `Max ${len} character(s)`).optional().or(z.literal(''));

const numericField = (max: number, precision: number) =>
  z.number().max(max, `Max value is ${max}`).refine(
    (v) => {
      if (precision === 0) return Number.isInteger(v);
      const parts = v.toString().split('.');
      return !parts[1] || parts[1].length <= precision;
    },
    `Max ${precision} decimal place(s)`
  ).nullable().optional();

const optionalDatetime = () => z.string().optional().or(z.literal(''));

// ============================================================
// er_master validation schema
// ============================================================
export const erMasterValidationSchema = z.object({
  regno: regnoField(),
  name: requiredString(40, 'Employer name'),
  trade_name: optionalString(40),
  phone: phoneField(),
  fax: phoneField(),
  hq_addr1: optionalString(25),
  hq_addr2: optionalString(25),
  office_code: optionalString(3),
  activity_type: optionalString(50),
  industrial_code: optionalString(4),
  maddr1: optionalString(25),
  maddr2: optionalString(25),
  village_code: optionalString(3),
  sector_code: charField(1),
  males_employed: z.number().min(0).nullable().optional(),
  females_employed: z.number().min(0).nullable().optional(),
  arrears: charField(1),
  legal_action: charField(1),
  exp_mthly_income: numericField(99999999.99, 2),
  registration_date: optionalDatetime(),
  date_wages_first_paid: optionalDatetime(),
  date_of_closure: optionalDatetime(),
  application_date: optionalDatetime(),
  date_of_entry: optionalDatetime(),
  date_of_issue: optionalDatetime(),
  date_modified: optionalDatetime(),
  date_verified: optionalDatetime(),
  entered_by: optionalString(5),
  modified_by: optionalString(5),
  verified_by: optionalString(5),
  ownership_code: optionalString(3),
  previous_owner: optionalString(40),
  prev_owner_addr1: optionalString(25),
  prev_owner_addr2: optionalString(25),
  date_of_acquisition: optionalDatetime(),
  date_incorporated: optionalDatetime(),
  computer_payroll: charField(1),
  make_model: optionalString(30),
  disk_tape: optionalString(30),
  acquired_code: charField(1),
  estim_arrears_ss: numericField(99999999.99, 2),
  estim_arrears_lv: numericField(99999999.99, 2),
  estim_arrears_pe: numericField(99999999.99, 2),
  estim_wages_ss: numericField(99999999.99, 2),
  estim_wages_lv: numericField(99999999.99, 2),
  estim_wages_pe: numericField(99999999.99, 2),
  status: charField(1),
  inspector_code: optionalString(3),
  parent_regno: optionalString(6),
  re_registration_date: optionalDatetime(),
  registry_num: optionalString(30),
  mobile: phoneField(),
  email: z.string().max(40, 'Max 40 characters').email('Invalid email format').optional().or(z.literal('')),
});

// ============================================================
// er_owner validation schema
// ============================================================
export const erOwnerValidationSchema = z.object({
  regno: regnoField(),
  name: optionalString(40),
  title: optionalString(25),
  phone: phoneField(),
  mobile: phoneField(),
  email: z.string().max(30, 'Max 30 characters').email('Invalid email format').optional().or(z.literal('')),
  ssn: z.string().max(6, 'Max 6 characters').regex(/^\d*$/, 'Only digits allowed').optional().or(z.literal('')),
  location_id: z.number().optional(),
});

// ============================================================
// er_locations validation schema
// ============================================================
export const erLocationValidationSchema = z.object({
  regno: regnoField(),
  trade_name: optionalString(40),
  loc_addr1: optionalString(25),
  loc_addr2: optionalString(25),
  activity_type: optionalString(50),
});

// ============================================================
// er_notes validation schema
// ============================================================
export const erNoteValidationSchema = z.object({
  regno: regnoField(),
  note: optionalString(100),
  user_id: optionalString(5),
  note_date: optionalDatetime(),
});

// ============================================================
// er_commence validation schema
// ============================================================
export const erCommenceValidationSchema = z.object({
  regno: regnoField(),
  date_commenced: optionalDatetime(),
  date_ceased: optionalDatetime(),
  date_modified: optionalDatetime(),
  modified_by: optionalString(30),
});

// ============================================================
// er_suit validation schema
// ============================================================
export const erSuitValidationSchema = z.object({
  regno: regnoField(),
  suit_type: optionalString(3),
  suit_year: optionalString(4),
  suit_no: optionalString(4),
  suit_status: charField(1),
  suit_amount: numericField(99999999.99, 2),
  scheme_code: optionalString(2),
  initial_suit_year: optionalString(4),
  initial_suit_no: optionalString(4),
  jds_year: optionalString(4),
  jds_no: optionalString(4),
  date_of_filing: optionalDatetime(),
  date_of_hearing: optionalDatetime(),
  awarded_amount: numericField(99999999.99, 2),
  awarded_cost: numericField(99999999.99, 2),
  outcome_code: optionalString(3),
  remarks: optionalString(255),
  remarks2: optionalString(255),
  date_of_entry: optionalDatetime(),
  date_modified: optionalDatetime(),
  date_verified: optionalDatetime(),
  entered_by: optionalString(5),
  modified_by: optionalString(5),
  verified_by: optionalString(5),
  beginperiod: optionalDatetime(),
  endperiod: optionalDatetime(),
  date_pay_by: optionalDatetime(),
});

// ============================================================
// er_visit validation schema
// ============================================================
export const erVisitValidationSchema = z.object({
  regno: regnoField(),
  date_of_visit: z.string().min(1, 'Visit date is required'),
  inspector_code: optionalString(3),
  time_start: optionalDatetime(),
  time_end: optionalDatetime(),
  work_code: charField(1),
  outcome_code: optionalString(3),
  number_of_jobs: z.number().int('Must be a whole number').nullable().optional(),
  operation_code: optionalString(3),
});

// ============================================================
// er_notification validation schema
// ============================================================
export const erNotificationValidationSchema = z.object({
  status_code: optionalString(3),
  userid: optionalString(30),
  event_date: optionalDatetime(),
  Name: optionalString(25),
  amount: numericField(99999999.99, 2),
  Comment: optionalString(100),
});

// ============================================================
// er_last_regno validation schema
// ============================================================
export const erLastRegnoValidationSchema = z.object({
  regno: z.string().max(6, 'Max 6 characters').min(1, 'Regno is required'),
  date_issued: z.string().min(1, 'Date issued is required'),
});

// ============================================================
// Inline validation helper — validates a single field and returns error message or null
// ============================================================
export function validateERField(
  table: 'er_master' | 'er_owner' | 'er_locations' | 'er_notes' | 'er_commence' | 'er_suit' | 'er_visit' | 'er_notification',
  fieldName: string,
  value: any
): string | null {
  const schemas: Record<string, z.ZodObject<any>> = {
    er_master: erMasterValidationSchema,
    er_owner: erOwnerValidationSchema,
    er_locations: erLocationValidationSchema,
    er_notes: erNoteValidationSchema,
    er_commence: erCommenceValidationSchema,
    er_suit: erSuitValidationSchema,
    er_visit: erVisitValidationSchema,
    er_notification: erNotificationValidationSchema,
  };

  const schema = schemas[table];
  if (!schema || !schema.shape[fieldName]) return null;

  const fieldSchema = schema.shape[fieldName] as z.ZodTypeAny;
  const result = fieldSchema.safeParse(value);
  if (result.success) return null;
  return result.error.issues[0]?.message || 'Invalid value';
}

// ============================================================
// Step-level validation for ER Master form (used by FormDetailTab)
// ============================================================
export function validateERMasterStep(step: number, formData: Record<string, any>): Record<string, string> {
  const errors: Record<string, string> = {};

  const checkField = (field: string, value: any) => {
    const err = validateERField('er_master', field, value);
    if (err) errors[field] = err;
  };

  switch (step) {
    case 0: // Entity Overview
      if (!formData.name?.trim()) errors.name = 'Employer name is required';
      else checkField('name', formData.name);
      checkField('trade_name', formData.trade_name || '');
      // Email: required + format + length
      if (!formData.email?.trim()) {
        errors.email = 'Email address is required';
      } else {
        const emailErr = validateERField('er_master', 'email', formData.email);
        if (emailErr) errors.email = emailErr;
      }
      if (!formData.hq_addr1?.trim()) errors.hq_addr1 = 'HQ Address 1 is required';
      else checkField('hq_addr1', formData.hq_addr1);
      checkField('hq_addr2', formData.hq_addr2 || '');
      if (!formData.maddr1?.trim()) errors.maddr1 = 'Mailing Address 1 is required';
      else checkField('maddr1', formData.maddr1);
      checkField('maddr2', formData.maddr2 || '');
      checkField('parent_regno', formData.parent_regno || '');
      checkField('registry_num', formData.registry_num || '');
      break;

    case 1: // Background Info
      checkField('previous_owner', formData.previous_owner || '');
      checkField('prev_owner_addr1', formData.prev_owner_addr1 || '');
      checkField('prev_owner_addr2', formData.prev_owner_addr2 || '');
      break;

    case 2: // Contact & Reach
      if (!formData.phone?.trim()) {
        errors.phone = 'Contact telephone is required';
      } else {
        checkField('phone', formData.phone);
      }
      checkField('fax', formData.fax || '');
      checkField('mobile', formData.mobile || '');
      if (!formData.village_code || formData.village_code === '000') {
        errors.village_code = 'Village is required';
      }
      if (!formData.activity_type?.trim()) {
        errors.activity_type = 'Activity type is required';
      }
      if (!formData.inspector_code || formData.inspector_code === 'UNK') {
        errors.inspector_code = 'Inspector code is required';
      }
      if (!formData.application_date) {
        errors.application_date = 'Application date is required';
      }
      break;

    case 3: // Tech & Finance
      checkField('make_model', formData.make_model || '');
      break;
  }

  return errors;
}
