
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
  | 'data_entry_clerk'
  | 'legal_officer'
  | 'accounts_manager'
  | 'cashier'
  | 'cashier_supervisor';

export type Department = 
  | 'administration'
  | 'human_resources'
  | 'compliance'
  | 'benefits'
  | 'finance'
  | 'employer_relations'
  | 'field_operations'
  | 'data_management'
  | 'legal'
  | 'accounts';

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
  | 'conduct_inspections'
  | 'manage_legal_proceedings'
  | 'manage_documents'
  | 'system_administration'
  | 'benefits_management'
  | 'reports_analytics'
  | 'cashier_operations'
  | 'cashier_supervisor'
  | 'cashier_reports'
  | 'system_admin';
