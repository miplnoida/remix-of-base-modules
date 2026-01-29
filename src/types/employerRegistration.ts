// Employer Registration form data matching the database schema

// ER Master - Main employer record
export interface ERMasterFormData {
  regno: string;
  name: string;
  trade_name: string;
  phone: string;
  fax: string;
  hq_addr1: string;
  hq_addr2: string;
  office_code: string;
  activity_type: string;
  industrial_code: string;
  maddr1: string;
  maddr2: string;
  village_code: string;
  sector_code: string;
  males_employed: number | null;
  females_employed: number | null;
  arrears: string;
  legal_action: string;
  exp_mthly_income: number | null;
  registration_date: string;
  date_wages_first_paid: string;
  date_of_closure: string;
  application_date: string;
  date_of_entry: string;
  date_of_issue: string;
  date_modified: string;
  date_verified: string;
  entered_by: string;
  modified_by: string;
  verified_by: string;
  ownership_code: string;
  previous_owner: string;
  prev_owner_addr1: string;
  prev_owner_addr2: string;
  date_of_acquisition: string;
  date_incorporated: string;
  computer_payroll: string;
  make_model: string;
  disk_tape: string;
  acquired_code: string;
  estim_arrears_ss: number | null;
  estim_arrears_lv: number | null;
  estim_arrears_pe: number | null;
  estim_wages_ss: number | null;
  estim_wages_lv: number | null;
  estim_wages_pe: number | null;
  status: string;
  inspector_code: string;
  parent_regno: string;
  re_registration_date: string;
  registry_num: string;
  mobile: string;
  email: string;
}

// ER Owner - Owners/principals of the organization
export interface EROwnerData {
  regno: string;
  location_id: number | null;
  owner_id?: number;
  name: string;
  title: string;
  phone: string;
  mobile: string;
  email: string;
  ssn: string;
}

// ER Location - Business locations
export interface ERLocationData {
  regno: string;
  location_id?: number;
  trade_name: string;
  loc_addr1: string;
  loc_addr2: string;
  activity_type: string;
}

// ER Notes - Internal notes
export interface ERNoteData {
  regno: string;
  note_date: string;
  seq_no?: number;
  note: string;
  user_id: string;
}

// ER Commence - Commencement dates
export interface ERCommenceData {
  commence_seq_no?: number;
  regno: string;
  date_commenced: string;
  date_ceased: string;
  date_modified: string;
  modified_by: string;
}

// ER Visit - Inspection visits
export interface ERVisitData {
  regno: string;
  location_id: number | null;
  date_of_visit: string;
  inspector_code: string;
  time_start: string;
  time_end: string;
  work_code: string;
  outcome_code: string;
  number_of_jobs: number | null;
  operation_code: string;
}

// ER Suit - Legal suits
export interface ERSuitData {
  suit_identifier?: number;
  regno: string;
  suit_type: string;
  suit_year: string;
  suit_no: string;
  suit_status: string;
  suit_amount: number | null;
  scheme_code: string;
  initial_suit_year: string;
  initial_suit_no: string;
  jds_year: string;
  jds_no: string;
  date_of_filing: string;
  date_of_hearing: string;
  awarded_amount: number | null;
  awarded_cost: number | null;
  outcome_code: string;
  remarks: string;
  remarks2: string;
  date_of_entry: string;
  date_modified: string;
  date_verified: string;
  entered_by: string;
  modified_by: string;
  verified_by: string;
  beginperiod: string;
  endperiod: string;
  date_pay_by: string;
}

// Status codes for employer registration
export const ER_STATUS_CODES = {
  Z: { label: 'Draft', variant: 'secondary' as const },
  P: { label: 'Pending', variant: 'default' as const },
  A: { label: 'Active', variant: 'default' as const },
  V: { label: 'Verified', variant: 'outline' as const },
  C: { label: 'Ceased', variant: 'destructive' as const },
  S: { label: 'Suspended', variant: 'destructive' as const },
  D: { label: 'Deleted', variant: 'destructive' as const },
  R: { label: 'Rejected', variant: 'destructive' as const },
};

// Initial form state
export const initialERMasterFormData: ERMasterFormData = {
  regno: '',
  name: '',
  trade_name: '',
  phone: '',
  fax: '',
  hq_addr1: '',
  hq_addr2: '',
  office_code: 'STK',
  activity_type: '',
  industrial_code: '0000',
  maddr1: '',
  maddr2: '',
  village_code: '000',
  sector_code: 'O',
  males_employed: null,
  females_employed: null,
  arrears: 'N',
  legal_action: 'N',
  exp_mthly_income: null,
  registration_date: '',
  date_wages_first_paid: '',
  date_of_closure: '',
  application_date: new Date().toISOString().split('T')[0],
  date_of_entry: new Date().toISOString().split('T')[0],
  date_of_issue: '',
  date_modified: '',
  date_verified: '',
  entered_by: '',
  modified_by: '',
  verified_by: '',
  ownership_code: '',
  previous_owner: '',
  prev_owner_addr1: '',
  prev_owner_addr2: '',
  date_of_acquisition: '',
  date_incorporated: '',
  computer_payroll: 'N',
  make_model: '',
  disk_tape: '',
  acquired_code: 'N',
  estim_arrears_ss: null,
  estim_arrears_lv: null,
  estim_arrears_pe: null,
  estim_wages_ss: null,
  estim_wages_lv: null,
  estim_wages_pe: null,
  status: 'Z',
  inspector_code: 'UNK',
  parent_regno: '',
  re_registration_date: '',
  registry_num: '',
  mobile: '',
  email: '',
};

export const initialEROwnerData: EROwnerData = {
  regno: '',
  location_id: null,
  name: '',
  title: '',
  phone: '',
  mobile: '',
  email: '',
  ssn: '',
};

export const initialERLocationData: ERLocationData = {
  regno: '',
  trade_name: '',
  loc_addr1: '',
  loc_addr2: '',
  activity_type: '',
};

export const initialERNoteData: ERNoteData = {
  regno: '',
  note_date: new Date().toISOString(),
  note: '',
  user_id: '',
};

export const initialERCommenceData: ERCommenceData = {
  regno: '',
  date_commenced: '',
  date_ceased: '',
  date_modified: '',
  modified_by: '',
};
