/**
 * ⚠️ NON-CANONICAL — DO NOT USE FOR NEW BENEFITS WORK.
 *
 * Prototype auth context bound to the mock `newBenefitService`. Retained only as a
 * UX reference for the contributor/employer portal migration. NOT a production auth
 * boundary and NOT connected to Cloud auth.
 *
 * Canonical auth: `src/contexts/AuthContext.tsx` (Supabase) + role/permission checks
 * in `src/services/*`. See `docs/bn/enterprise-domain-audit.md` §7.1.
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '@/types/newBenefit';

interface NewBenefitAuthContextType {
  currentUser: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  isContributor: () => boolean;
  isStaff: () => boolean;
}

const NewBenefitAuthContext = createContext<NewBenefitAuthContextType | undefined>(undefined);

// Mock users database
const mockUsers: User[] = [
  // Contributors
  {
    id: '1',
    username: '123456789',
    ssn: '123456789',
    role: 'CONTRIBUTOR',
    firstName: 'John',
    lastName: 'Contributor',
    email: 'john@example.com',
    active: true
  },
  {
    id: '2',
    username: '987654321',
    ssn: '987654321', 
    role: 'CONTRIBUTOR',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane@example.com',
    active: true
  },
  // Staff
  {
    id: '3',
    username: 'claims_officer1',
    role: 'CLAIMS_OFFICER',
    firstName: 'Mary',
    lastName: 'Officer',
    email: 'mary@ssb.gov.kn',
    active: true
  },
  {
    id: '4',
    username: 'supervisor1',
    role: 'SUPERVISOR',
    firstName: 'Robert',
    lastName: 'Supervisor',
    email: 'robert@ssb.gov.kn',
    active: true
  },
  {
    id: '5',
    username: 'payments1',
    role: 'PAYMENTS_OFFICER',
    firstName: 'Linda',
    lastName: 'Payments',
    email: 'linda@ssb.gov.kn',
    active: true
  },
  {
    id: '6',
    username: 'medical1',
    role: 'MEDICAL_COORDINATOR',
    firstName: 'Dr. James',
    lastName: 'Medical',
    email: 'james@ssb.gov.kn',
    active: true
  },
  {
    id: '7',
    username: 'employer1',
    role: 'EMPLOYER_LIAISON',
    firstName: 'Sarah',
    lastName: 'Employer',
    email: 'sarah@ssb.gov.kn',
    active: true
  },
  {
    id: '8',
    username: 'admin1',
    role: 'ADMIN',
    firstName: 'Michael',
    lastName: 'Admin',
    email: 'michael@ssb.gov.kn',
    active: true
  },
  {
    id: '9',
    username: 'auditor1',
    role: 'AUDITOR',
    firstName: 'Patricia',
    lastName: 'Auditor',
    email: 'patricia@ssb.gov.kn',
    active: true
  },
  {
    id: '10',
    username: 'config_analyst1',
    role: 'CONFIG_ANALYST',
    firstName: 'Karen',
    lastName: 'Analyst',
    email: 'karen@ssb.gov.kn',
    active: true
  }
];

// Role permissions mapping
const rolePermissions: Record<UserRole, string[]> = {
  CONTRIBUTOR: [
    'view_own_profile',
    'apply_for_benefits',
    'view_own_claims',
    'view_own_payments',
    'upload_documents',
    'view_inbox'
  ],
  CLAIMS_OFFICER: [
    'view_claims',
    'process_claims',
    'update_claim_status',
    'request_documents',
    'calculate_benefits',
    'make_decisions'
  ],
  SUPERVISOR: [
    'view_claims',
    'process_claims',
    'update_claim_status',
    'request_documents',
    'calculate_benefits',
    'make_decisions',
    'approve_claims',
    'view_team_queues',
    'reassign_claims',
    'view_simulations',
    'create_scenarios',
    'run_simulations',
    'view_sim_traces',
    'view_sim_audit'
  ],
  PAYMENTS_OFFICER: [
    'view_payments',
    'process_payments',
    'generate_payment_files',
    'handle_returns',
    'manage_overpayments'
  ],
  MEDICAL_COORDINATOR: [
    'view_medical_claims',
    'schedule_medical_board',
    'record_medical_decisions',
    'manage_medical_reviews'
  ],
  EMPLOYER_LIAISON: [
    'view_employer_claims',
    'verify_employment',
    'manage_employer_compliance',
    'view_contribution_records'
  ],
  ADMIN: [
    'view_own_profile',
    'apply_for_benefits',
    'view_own_claims',
    'view_own_payments',
    'upload_documents',
    'view_inbox',
    'view_claims',
    'process_claims',
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
    'manage_users',
    'configure_rates',
    'manage_templates',
    'view_audit_logs',
    'system_administration',
    'view_all_claims',
    'view_all_payments',
    'generate_audit_reports',
    'view_simulations',
    'create_scenarios',
    'run_simulations',
    'view_sim_traces',
    'delete_scenarios',
    'view_sim_audit'
  ],
  CONFIG_ANALYST: [
    'view_claims',
    'view_simulations',
    'create_scenarios',
    'run_simulations',
    'view_sim_traces',
    'configure_rates',
    'view_contribution_records'
  ],
  AUDITOR: [
    'view_all_claims',
    'view_all_payments',
    'view_audit_logs',
    'generate_audit_reports',
    'view_simulations',
    'view_sim_traces',
    'view_sim_audit'
  ]
};

export const NewBenefitAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    // Check for existing session
    const savedUser = localStorage.getItem('newBenefitCurrentUser');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    // For demo purposes, any password works
    const user = mockUsers.find(u => u.username === username && u.active);
    
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('newBenefitCurrentUser', JSON.stringify(user));
      return true;
    }
    
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('newBenefitCurrentUser');
  };

  const hasPermission = (permission: string): boolean => {
    if (!currentUser) return false;
    const userPermissions = rolePermissions[currentUser.role] || [];
    return userPermissions.includes(permission);
  };

  const isContributor = (): boolean => {
    return currentUser?.role === 'CONTRIBUTOR';
  };

  const isStaff = (): boolean => {
    return currentUser?.role !== 'CONTRIBUTOR';
  };

  return (
    <NewBenefitAuthContext.Provider
      value={{
        currentUser,
        login,
        logout,
        hasPermission,
        isContributor,
        isStaff
      }}
    >
      {children}
    </NewBenefitAuthContext.Provider>
  );
};

export const useNewBenefitAuth = () => {
  const context = useContext(NewBenefitAuthContext);
  if (context === undefined) {
    throw new Error('useNewBenefitAuth must be used within a NewBenefitAuthProvider');
  }
  return context;
};