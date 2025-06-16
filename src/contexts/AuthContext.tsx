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
      'manage_legal_proceedings'
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
