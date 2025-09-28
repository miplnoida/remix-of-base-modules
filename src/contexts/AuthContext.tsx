
import React, { createContext, useContext, useState } from 'react';
import { User } from '@/types/auth';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Mock users for demonstration
const mockUsers: User[] = [
  {
    id: '1',
    email: 'admin@secureserve.gov',
    name: 'System Administrator',
    role: 'admin',
    department: 'administration',
    permissions: [
      'view_dashboard', 
      'manage_employers', 
      'manage_insured_persons', 
      'process_claims', 
      'generate_reports', 
      'manage_compliance', 
      'manage_users', 
      'view_financial_data', 
      'approve_benefits', 
      'conduct_inspections',
      'manage_legal_proceedings',
      'manage_documents',
      'system_administration',
      'benefits_management',
      'reports_analytics',
      'cashier_operations',
      'cashier_supervisor',
      'cashier_reports',
      'system_admin',
      'admin',
      // NewBenefit permissions for admin
      'view_own_profile',
      'apply_for_benefits',
      'view_own_claims',
      'view_own_payments',
      'upload_documents',
      'view_inbox',
      'view_claims',
      'update_claim_status',
      'request_documents',
      'calculate_benefits',
      'make_decisions',
      'approve_claims',
      'view_team_queues',
      'reassign_claims',
      'view_payments',
      'process_payments',
      'generate_payment_files',
      'handle_returns',
      'manage_overpayments',
      'view_medical_claims',
      'schedule_medical_board',
      'record_medical_decisions',
      'manage_medical_reviews',
      'view_employer_claims',
      'verify_employment',
      'manage_employer_compliance',
      'view_contribution_records',
      'configure_rates',
      'manage_templates',
      'view_audit_logs',
      'view_all_claims',
      'view_all_payments',
      'generate_audit_reports',
      // Audit permissions for admin
      'create_audit_plans',
      'edit_audit_plans',
      'assign_auditors',
      'approve_audit_plans',
      'reject_audit_plans',
      'execute_audit_activities',
      'enter_audit_findings',
      'view_audit_assignments',
      'manage_audit_followups',
      'view_audit_readonly',
      'approve_audit_closeouts',
      'configure_audit_system'
    ]
  },
  {
    id: '2',
    email: 'hr@secureserve.gov',
    name: 'HR Manager',
    role: 'hr_manager',
    department: 'human_resources',
    permissions: ['view_dashboard', 'manage_insured_persons', 'generate_reports']
  },
  {
    id: '3',
    email: 'compliance@secureserve.gov',
    name: 'Compliance Officer',
    role: 'compliance_officer',
    department: 'compliance',
    permissions: ['view_dashboard', 'manage_compliance', 'conduct_inspections', 'generate_reports']
  },
  {
    id: '4',
    email: 'benefits@secureserve.gov',
    name: 'Benefits Manager',
    role: 'benefits_manager',
    department: 'benefits',
    permissions: ['view_dashboard', 'process_claims', 'approve_benefits', 'generate_reports']
  },
  {
    id: '5',
    email: 'legal@secureserve.gov',
    name: 'Legal Officer',
    role: 'legal_officer',
    department: 'legal',
    permissions: ['view_dashboard', 'manage_compliance', 'conduct_inspections', 'generate_reports', 'manage_legal_proceedings']
  },
  {
    id: '6',
    email: 'accounts@secureserve.gov',
    name: 'Accounts Manager',
    role: 'accounts_manager',
    department: 'accounts',
    permissions: [
      'view_dashboard', 
      'view_financial_data', 
      'generate_reports', 
      'cashier_operations',
      'cashier_supervisor',
      'cashier_reports',
      'reports_analytics',
      'admin'
    ]
  },
  {
    id: '7',
    email: 'cashier@secureserve.gov',
    name: 'Cashier Officer',
    role: 'cashier',
    department: 'accounts',
    permissions: [
      'view_dashboard', 
      'cashier_operations',
      'cashier_reports'
    ]
  },
  {
    id: '8',
    email: 'supervisor@secureserve.gov',
    name: 'Cashier Supervisor',
    role: 'cashier_supervisor',
    department: 'accounts',
    permissions: [
      'view_dashboard', 
      'cashier_operations',
      'cashier_supervisor',
      'cashier_reports',
      'view_financial_data',
      'reports_analytics',
      'admin'
    ]
  },
  // Audit Module Users
  {
    id: '9',
    email: 'audit.officer1@secureserve.gov',
    name: 'Maria Rodriguez',
    role: 'audit_officer',
    department: 'audit',
    permissions: [
      'view_dashboard',
      'create_audit_plans',
      'edit_audit_plans',
      'assign_auditors',
      'view_audit_assignments',
      'manage_audit_followups',
      'generate_reports'
    ]
  },
  {
    id: '10',
    email: 'auditor.jdoe@secureserve.gov',
    name: 'John Doe',
    role: 'auditor',
    department: 'audit',
    permissions: [
      'view_dashboard',
      'view_audit_assignments',
      'execute_audit_activities',
      'enter_audit_findings',
      'manage_audit_followups'
    ]
  },
  {
    id: '11',
    email: 'auditor.asmith@secureserve.gov',
    name: 'Alice Smith',
    role: 'auditor',
    department: 'audit',
    permissions: [
      'view_dashboard',
      'view_audit_assignments',
      'execute_audit_activities',
      'enter_audit_findings',
      'manage_audit_followups'
    ]
  },
  {
    id: '12',
    email: 'audit.manager1@secureserve.gov',
    name: 'David Thompson',
    role: 'audit_manager',
    department: 'audit',
    permissions: [
      'view_dashboard',
      'approve_audit_plans',
      'reject_audit_plans',
      'approve_audit_closeouts',
      'view_audit_assignments',
      'manage_audit_followups',
      'generate_reports'
    ]
  },
  {
    id: '13',
    email: 'compliance.reader1@secureserve.gov',
    name: 'Sarah Wilson',
    role: 'compliance_reader',
    department: 'compliance',
    permissions: [
      'view_dashboard',
      'view_audit_readonly',
      'generate_reports'
    ]
  },
  {
    id: '14',
    email: 'sys.admin1@secureserve.gov',
    name: 'Robert Taylor',
    role: 'admin',
    department: 'administration',
    permissions: [
      'view_dashboard',
      'configure_audit_system',
      'system_administration',
      'admin'
    ]
  }
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = async (email: string, password: string): Promise<boolean> => {
    console.log('Login attempt:', { email, password });
    console.log('Available users:', mockUsers.map(u => u.email));
    
    // Mock authentication
    const foundUser = mockUsers.find(u => u.email === email);
    console.log('Found user:', foundUser);
    
    if (foundUser && password === 'password123') {
      console.log('Login successful for:', foundUser.name);
      setUser(foundUser);
      return true;
    }
    
    console.log('Login failed - invalid credentials');
    return false;
  };

  const logout = () => {
    console.log('User logged out');
    setUser(null);
  };

  const hasPermission = (permission: string): boolean => {
    return user?.permissions.includes(permission as any) || false;
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};
