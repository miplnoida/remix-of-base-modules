
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department: Department;
  permissions: Permission[];
}

export type UserRole = 
  | 'admin'
  | 'hr_manager'
  | 'compliance_officer'
  | 'benefits_manager'
  | 'financial_analyst'
  | 'employer_liaison'
  | 'field_inspector'
  | 'data_entry_clerk';

export type Department = 
  | 'administration'
  | 'human_resources'
  | 'compliance'
  | 'benefits'
  | 'finance'
  | 'employer_relations'
  | 'field_operations'
  | 'data_management';

export type Permission = 
  | 'view_dashboard'
  | 'manage_employers'
  | 'manage_insured_persons'
  | 'process_claims'
  | 'generate_reports'
  | 'manage_compliance'
  | 'manage_users'
  | 'view_financial_data'
  | 'approve_benefits'
  | 'conduct_inspections';
