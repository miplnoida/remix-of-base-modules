// IP Master form data matching the database schema
export interface IPMasterFormData {
  // Primary Key
  ssn: string;
  
  // Basic Details (matching ip_master columns)
  surname: string;
  firstname: string;
  middle_name: string;
  previous_name: string; // Maiden Name
  alias: string;
  sex: string; // M/F/N
  dob: string; // Date of Birth
  birth_place_code: string; // 3-char country code
  nationality_code: string; // 3-char country code
  marital_status: string; // Single char
  heightfeet: number | null;
  heightinches: number | null;
  eyecolor: string;
  name_prefix: string; // Title
  name_suffix: string; // Suffix
  
  // Address & Contact
  resident_addr1: string;
  resident_addr2: string;
  district: string; // Postal District code
  mail_addr1: string;
  mail_addr2: string;
  email_addr: string;
  phone: string;
  phone_mobile: string;
  
  // Relations - Contact
  contact: string;
  contact_relation: string;
  contact_addr1: string;
  contact_addr2: string;
  contact_phone: string;
  contact_mobile: string;
  contact_email: string;
  
  // Relations - Parent
  father_name: string;
  mother_name: string;
  
  // Relations - Spouse
  spouse_name: string;
  spouse_addr1: string;
  spouse_addr2: string;
  spouse_ssn: string;
  spouse_dob: string;
  
  // Relations - Witness
  witness_name: string;
  date_witnessed: string;
  
  // Relations - Beneficiary
  beneficiary: string;
  ben_addr1: string;
  ben_addr2: string;
  
  // Employment Details
  work_permit: string; // Y/N
  primary_occup: string; // 4-char occupation code
  npf: string; // Y/N
  application_date: string;
  date_of_residency: string;
  place_of_residence_code: string; // 3-char country code
  citizenship_flag: string; // Y/N
  ip_signature: string; // Y/N
  work_permit_expiration: string;
  
  // Document Verification
  verify_birth_code: string; // 1-char verification code
  verify_name_code: string;
  verify_marital_code: string;
  verify_death_code: string;
  date_verified: string;
  verified_by: string;
  
  // Status and Audit
  status: string; // Z = Draft, P = Pending, A = Approved
  date_of_entry: string;
  registration_date: string;
  date_modified: string;
  userid: string;
  entered_by: string;
}

export interface IPDependentData {
  ssn?: string;
  depend_id: string;
  depend_ssn: string;
  surname: string;
  firstname: string;
  middle_name_dep?: string;
  middle_name?: string;
  dob: string;
  sex: string; // M/F/N
  relation: string; // 3-char relation code
  depend_addr1: string;
  depend_addr2: string;
  school_child: string; // Y/N
  invalid: string; // Y/N
  date_modified: string;
  userid: string;
  tran_code: string;
  status: string; // P = Pending, A = Active, D = Deleted
  date_of_death: string;
}

export interface IPNoteData {
  ssn: string;
  note_date: string;
  note: string;
  userid: string;
  note_tran_code: string;
  note_seq: number;
}

// Initial form state
export const initialIPMasterFormData: IPMasterFormData = {
  ssn: '',
  surname: '',
  firstname: '',
  middle_name: '',
  previous_name: '',
  alias: '',
  sex: '',
  dob: '',
  birth_place_code: '',
  nationality_code: '',
  marital_status: '',
  heightfeet: null,
  heightinches: null,
  eyecolor: '',
  name_prefix: '',
  name_suffix: '',
  resident_addr1: '',
  resident_addr2: '',
  district: '',
  mail_addr1: '',
  mail_addr2: '',
  email_addr: '',
  phone: '',
  phone_mobile: '',
  contact: '',
  contact_relation: '',
  contact_addr1: '',
  contact_addr2: '',
  contact_phone: '',
  contact_mobile: '',
  contact_email: '',
  father_name: '',
  mother_name: '',
  spouse_name: '',
  spouse_addr1: '',
  spouse_addr2: '',
  spouse_ssn: '',
  spouse_dob: '',
  witness_name: '',
  date_witnessed: '',
  beneficiary: '',
  ben_addr1: '',
  ben_addr2: '',
  work_permit: 'N',
  primary_occup: '',
  npf: 'N',
  application_date: new Date().toISOString().split('T')[0],
  date_of_residency: '',
  place_of_residence_code: '',
  citizenship_flag: 'N',
  ip_signature: 'N',
  work_permit_expiration: '',
  verify_birth_code: '',
  verify_name_code: '',
  verify_marital_code: '',
  verify_death_code: '',
  date_verified: '',
  verified_by: '',
  status: 'Z',
  date_of_entry: new Date().toISOString().split('T')[0],
  registration_date: '',
  date_modified: '',
  userid: '',
  entered_by: '',
};

export const initialIPDependentData: IPDependentData = {
  depend_id: '',
  depend_ssn: '',
  surname: '',
  firstname: '',
  middle_name_dep: '',
  dob: '',
  sex: '',
  relation: '',
  depend_addr1: '',
  depend_addr2: '',
  school_child: 'N',
  invalid: 'N',
  date_modified: new Date().toISOString(),
  userid: '',
  tran_code: 'ADD',
  status: 'P',
  date_of_death: '',
};
