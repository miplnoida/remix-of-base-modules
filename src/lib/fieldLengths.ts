/**
 * Centralized Field Length & Datatype Configuration
 * 
 * All field length limits for ip_master, ip_depend, and ip_notes tables.
 * These MUST match the database varchar/char constraints exactly.
 * 
 * Usage:
 *   import { IP_MASTER_FIELDS, IP_DEPEND_FIELDS, IP_NOTES_FIELDS } from '@/lib/fieldLengths';
 *   <Input maxLength={IP_MASTER_FIELDS.first_name.maxLength} />
 */

export interface FieldDef {
  maxLength: number;
  type: 'varchar' | 'char' | 'smallint' | 'numeric' | 'date' | 'timestamp' | 'uuid' | 'bigint';
  /** For numeric types: total digits */
  precision?: number;
  /** For numeric types: decimal places */
  scale?: number;
  /** For smallint: min value */
  min?: number;
  /** For smallint: max value */
  max?: number;
  /** Human-readable label */
  label?: string;
}

// ─── ip_master ────────────────────────────────────────────────────────────────

export const IP_MASTER_FIELDS: Record<string, FieldDef> = {
  // Identity
  application_id:      { maxLength: 20,  type: 'varchar', label: 'Application ID' },
  ssn:                 { maxLength: 6,   type: 'varchar', label: 'SSN' },
  name_prefix:         { maxLength: 6,   type: 'varchar', label: 'Title' },
  firstname:           { maxLength: 25,  type: 'varchar', label: 'First Name' },
  middle_name:         { maxLength: 25,  type: 'varchar', label: 'First Middle Name' },
  second_middle_name:  { maxLength: 25,  type: 'varchar', label: 'Second Middle Name' },
  surname:             { maxLength: 25,  type: 'varchar', label: 'Surname' },
  name_suffix:         { maxLength: 6,   type: 'varchar', label: 'Suffix' },
  previous_name:       { maxLength: 25,  type: 'varchar', label: 'Maiden Name' },
  alias:               { maxLength: 25,  type: 'varchar', label: 'Alias' },
  sex:                 { maxLength: 1,   type: 'varchar', label: 'Gender' },
  marital_status:      { maxLength: 20,  type: 'varchar', label: 'Marital Status' },

  // Physical
  heightfeet:          { maxLength: 1,   type: 'smallint', min: 0, max: 8, label: 'Height (Feet)' },
  heightinches:        { maxLength: 2,   type: 'smallint', min: 0, max: 11, label: 'Height (Inches)' },

  // Origin
  birth_place:         { maxLength: 3,   type: 'varchar', label: 'Birth Place' },
  nationality:         { maxLength: 3,   type: 'varchar', label: 'Nationality' },
  eyecolor:            { maxLength: 3,   type: 'varchar', label: 'Eye Color' },

  // Address
  resident_addr1:      { maxLength: 30,  type: 'varchar', label: 'Resident Address 1' },
  resident_addr2:      { maxLength: 30,  type: 'varchar', label: 'Resident Address 2' },
  district:            { maxLength: 3,   type: 'varchar', label: 'Postal District' },
  mail_addr1:          { maxLength: 30,  type: 'varchar', label: 'Mailing Address 1' },
  mail_addr2:          { maxLength: 30,  type: 'varchar', label: 'Mailing Address 2' },

  // Contact
  email_addr:          { maxLength: 40,  type: 'varchar', label: 'Email' },
  telephone:           { maxLength: 15,  type: 'varchar', label: 'Telephone' },
  mobile:              { maxLength: 15,  type: 'varchar', label: 'Mobile' },

  // Employment
  primary_occup:       { maxLength: 4,   type: 'varchar', label: 'Occupation' },
  work_permit:         { maxLength: 1,   type: 'varchar', label: 'Work Permit' },
  npf:                 { maxLength: 1,   type: 'varchar', label: 'NPF Status' },
  place_of_residence:  { maxLength: 30,  type: 'varchar', label: 'Place of Residence' },
  citizenship:         { maxLength: 30,  type: 'varchar', label: 'Citizenship' },
  employer_name:       { maxLength: 50,  type: 'varchar', label: 'Employer Name' },
  employer_address:    { maxLength: 200, type: 'varchar', label: 'Employer Address' },
  employer_phone:      { maxLength: 10,  type: 'varchar', label: 'Employer Phone' },
  employer_town:       { maxLength: 50,  type: 'varchar', label: 'Employer Town' },

  // Verification codes
  ip_signature:        { maxLength: 1,   type: 'varchar', label: 'Signature on File' },
  marital_doc_type:    { maxLength: 1,   type: 'varchar', label: 'Marital Doc Type' },
  birth_doc_type:      { maxLength: 1,   type: 'varchar', label: 'Birth Doc Type' },
  death_doc_type:      { maxLength: 1,   type: 'varchar', label: 'Death Doc Type' },
  name_doc_type:       { maxLength: 1,   type: 'varchar', label: 'Name Doc Type' },

  // Status
  status:              { maxLength: 1,   type: 'varchar', label: 'Status' },
  rejection_reason:    { maxLength: 250, type: 'varchar', label: 'Rejection Reason' },

  // Relations - Contact
  contact:             { maxLength: 35,  type: 'varchar', label: 'Contact Name' },
  contact_relation:    { maxLength: 20,  type: 'varchar', label: 'Contact Relation' },
  contact_addr1:       { maxLength: 30,  type: 'varchar', label: 'Contact Address 1' },
  contact_addr2:       { maxLength: 30,  type: 'varchar', label: 'Contact Address 2' },
  contact_phone:       { maxLength: 10,  type: 'varchar', label: 'Contact Phone' },
  contact_mobile:      { maxLength: 10,  type: 'varchar', label: 'Contact Mobile' },
  contact_email:       { maxLength: 40,  type: 'varchar', label: 'Contact Email' },

  // Relations - Family
  father_name:         { maxLength: 35,  type: 'varchar', label: "Father's Name" },
  mother_name:         { maxLength: 35,  type: 'varchar', label: "Mother's Name" },
  spouse_name:         { maxLength: 35,  type: 'varchar', label: 'Spouse Name' },
  spouse_addr1:        { maxLength: 30,  type: 'varchar', label: 'Spouse Address 1' },
  spouse_addr2:        { maxLength: 30,  type: 'varchar', label: 'Spouse Address 2' },
  spouse_ssn:          { maxLength: 6,   type: 'varchar', label: 'Spouse SSN' },
  witness_name:        { maxLength: 35,  type: 'varchar', label: 'Witness Name' },
  beneficiary:         { maxLength: 35,  type: 'varchar', label: 'Beneficiary' },
  ben_addr1:           { maxLength: 30,  type: 'varchar', label: 'Beneficiary Address 1' },
  ben_addr2:           { maxLength: 30,  type: 'varchar', label: 'Beneficiary Address 2' },

  // Additional fields
  entered_by:          { maxLength: 5,   type: 'varchar', label: 'Entered By' },
  userid:              { maxLength: 5,   type: 'varchar', label: 'User ID' },
  tran_code:           { maxLength: 3,   type: 'varchar', label: 'Transaction Code' },
  deb_crd_amount:      { maxLength: 12,  type: 'numeric', precision: 10, scale: 2, label: 'Debit/Credit Amount' },
  phone:               { maxLength: 10,  type: 'varchar', label: 'Phone' },
};

// ─── ip_depend ────────────────────────────────────────────────────────────────

export const IP_DEPEND_FIELDS: Record<string, FieldDef> = {
  ssn:                 { maxLength: 6,   type: 'varchar', label: 'SSN' },
  depend_id:           { maxLength: 6,   type: 'varchar', label: 'Dependent ID' },
  depend_ssn:          { maxLength: 6,   type: 'varchar', label: 'Dependent SSN' },
  surname:             { maxLength: 25,  type: 'varchar', label: 'Surname' },
  firstname:           { maxLength: 25,  type: 'varchar', label: 'First Name' },
  middle_name:         { maxLength: 25,  type: 'varchar', label: 'Middle Name' },
  sex:                 { maxLength: 1,   type: 'char',    label: 'Gender' },
  relation:            { maxLength: 3,   type: 'varchar', label: 'Relation' },
  depend_addr1:        { maxLength: 50,  type: 'varchar', label: 'Address Line 1' },
  depend_addr2:        { maxLength: 50,  type: 'varchar', label: 'Address Line 2' },
  school_child:        { maxLength: 1,   type: 'char',    label: 'School Child' },
  invalid:             { maxLength: 1,   type: 'varchar', label: 'Invalid' },
  userid:              { maxLength: 5,   type: 'varchar', label: 'User ID' },
  tran_code:           { maxLength: 3,   type: 'varchar', label: 'Transaction Code' },
  status:              { maxLength: 1,   type: 'char',    label: 'Status' },
};

// ─── ip_notes ─────────────────────────────────────────────────────────────────

export const IP_NOTES_FIELDS: Record<string, FieldDef> = {
  ssn:                 { maxLength: 6,   type: 'varchar', label: 'SSN' },
  note:                { maxLength: 100, type: 'varchar', label: 'Note' },
  userid:              { maxLength: 5,   type: 'varchar', label: 'User ID' },
  note_tran_code:      { maxLength: 3,   type: 'varchar', label: 'Transaction Code' },
};

/**
 * Helper: get maxLength for a field from any of the three tables.
 * Returns the first match found.
 */
export function getFieldMaxLength(fieldName: string): number {
  const def = IP_MASTER_FIELDS[fieldName] || IP_DEPEND_FIELDS[fieldName] || IP_NOTES_FIELDS[fieldName];
  return def?.maxLength ?? 255;
}

/**
 * Helper: truncate a string to the field's max length.
 */
export function truncateToFieldLimit(fieldName: string, value: string | null | undefined): string | null {
  if (!value) return null;
  const maxLen = getFieldMaxLength(fieldName);
  return value.slice(0, maxLen);
}
