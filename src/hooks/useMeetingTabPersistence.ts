/**
 * Field-to-tab mapping definitions and helpers for per-tab persistence
 * in the meeting workbench.
 */

// ─── IP Meeting Field → Tab Mapping ─────────────────────────────────────────

export const IP_TAB_FIELDS: Record<string, string[]> = {
  'ip-personal': [
    'title', 'firstName', 'middleName1', 'middleName', 'middleName2', 'lastName',
    'suffix', 'maidenName', 'alias', 'gender', 'dateOfBirth', 'placeOfBirth',
    'nationality', 'maritalStatus', 'dateMarried', 'heightFeet', 'heightInches', 'eyeColor',
  ],
  'ip-contact': [
    'phoneMobile', 'phoneHome', 'email',
    'resAddr1', 'addressLine1', 'resAddr2', 'addressLine2', 'resDistrict', 'postalDistrict',
    'placeOfResidency', 'residencyDate',
    'mailingAddr1', 'mailingAddr2',
    'contactName', 'contactRelation', 'contactAddress1', 'contactAddress', 'contactAddress2',
    'contactPhone', 'contactMobile', 'contactEmail',
  ],
  'ip-relations': [
    'fatherName', 'fatherFirstName', 'fatherLastName',
    'motherName', 'motherFirstName', 'motherLastName',
    'spouseName', 'spouseFirstName', 'spouseLastName', 'spouseSSN', 'spouseDOB', 'spouseDateOfBirth',
    'spouseAddress1', 'spouseAddress2',
    'beneficiaryName', 'beneficiaryAddress1', 'beneficiaryAddress', 'beneficiaryAddress2',
    'witnessName', 'witnessDate',
  ],
  'ip-employment': [
    'hasWorkPermit', 'workPermit', 'workPermitExpiry',
    'occupationCode', 'occupation', 'occupationName',
    'npf', 'npfMember', 'citizenship', 'isCitizen',
    'employerName', 'employerAddress', 'employerTown', 'employerPhone',
  ],
  'ip-remarks': ['remarks'],
};

// ─── Employer Meeting Field → Tab Mapping ───────────────────────────────────

export const ER_TAB_FIELDS: Record<string, string[]> = {
  'er-employer-profile': [
    'previous_owner', 'prev_owner_address1', 'prev_owner_address2',
    'is_acquired', 'date_acquired', 'incorporated_date',
    'ownership_code', 'sector_code',
    'parent_reg_no', 'office_code', 'industrial_code', 'industry_code',
  ],
  'er-basic-details': [
    'employer_name', 'trade_name', 'business_email',
    'hq_address1', 'hq_address2', 'hq_city', 'hq_state', 'hq_country',
    'mailing_address1', 'mailing_address2', 'mailing_city', 'mailing_state', 'mailing_country',
    'application_date', 'wages_first_paid_date', 'male_count', 'female_count',
  ],
  'er-contact-reach': [
    'contact_telephone', 'contact_fax', 'contact_name', 'mobile', 'email', 'country',
    'village_code', 'activity_type', 'inspector_code',
  ],
  'er-tech-finance': [
    'computer_payroll', 'make_model',
  ],
};

/**
 * Build a field→tab reverse map from a TAB_FIELDS definition.
 */
export function buildFieldToTabMap(tabFields: Record<string, string[]>): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [tab, fields] of Object.entries(tabFields)) {
    for (const field of fields) {
      map[field] = tab;
    }
  }
  return map;
}

/**
 * Extract only the fields belonging to a given tab from a data object.
 */
export function extractTabFields(
  data: Record<string, any>,
  tabFields: string[]
): Record<string, any> {
  const result: Record<string, any> = {};
  for (const field of tabFields) {
    if (field in data) {
      result[field] = data[field];
    }
  }
  return result;
}

/**
 * Determine which tab IDs have dirty (changed) fields.
 * Compares current data vs. original (API + any previously saved overlay).
 */
export function getDirtyTabs(
  editedData: Record<string, any>,
  originalData: Record<string, any>,
  tabFields: Record<string, string[]>
): Set<string> {
  const dirty = new Set<string>();
  for (const [tab, fields] of Object.entries(tabFields)) {
    for (const field of fields) {
      const current = editedData[field];
      const original = originalData[field];
      if (JSON.stringify(current) !== JSON.stringify(original)) {
        dirty.add(tab);
        break;
      }
    }
  }
  return dirty;
}

/** Human-readable tab labels */
export const TAB_LABELS: Record<string, string> = {
  'ip-personal': 'Personal',
  'ip-contact': 'Contact',
  'ip-relations': 'Relations',
  'ip-employment': 'Employment',
  'ip-remarks': 'Remarks',
  'er-employer-profile': 'Employer Profile',
  'er-basic-details': 'Basic Details',
  'er-contact-reach': 'Contact & Reach',
  'er-tech-finance': 'Tech & Finance',
};
