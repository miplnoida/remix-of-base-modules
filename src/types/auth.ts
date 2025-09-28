
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
  | 'system_admin'
  | 'admin'
  // NewBenefit permissions
  | 'view_own_profile'
  | 'apply_for_benefits'
  | 'view_own_claims'
  | 'view_own_payments'
  | 'upload_documents'
  | 'view_inbox'
  | 'view_claims'
  | 'update_claim_status'
  | 'request_documents'
  | 'calculate_benefits'
  | 'make_decisions'
  | 'approve_claims'
  | 'view_team_queues'
  | 'reassign_claims'
  | 'view_payments'
  | 'process_payments'
  | 'generate_payment_files'
  | 'handle_returns'
  | 'manage_overpayments'
  | 'view_medical_claims'
  | 'schedule_medical_board'
  | 'record_medical_decisions'
  | 'manage_medical_reviews'
  | 'view_employer_claims'
  | 'verify_employment'
  | 'manage_employer_compliance'
  | 'view_contribution_records'
  | 'configure_rates'
  | 'manage_templates'
  | 'view_audit_logs'
  | 'view_all_claims'
  | 'view_all_payments'
  | 'generate_audit_reports';
