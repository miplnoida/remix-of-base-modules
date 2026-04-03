import React, { createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type LegalRole = 'Clerk' | 'LegalOfficer' | 'Supervisor' | 'FinanceOfficer' | 'ReadOnly' | 'Admin';

interface LegalAuthContextType {
  user: User | null;
  session: Session | null;
  roles: LegalRole[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  hasRole: (role: LegalRole) => boolean;
  hasAnyRole: (roles: LegalRole[]) => boolean;
}

const LegalAuthContext = createContext<LegalAuthContextType | undefined>(undefined);

export const useLegalAuth = () => {
  const context = useContext(LegalAuthContext);
  if (!context) {
    throw new Error('useLegalAuth must be used within LegalAuthProvider');
  }
  return context;
};

/**
 * LegalAuthProvider — now delegates to SupabaseAuthContext instead of
 * making duplicate getSession() and fetchRoles() calls.
 */
export const LegalAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, session, roles: supabaseRoles, isLoading, logout } = useSupabaseAuth();

  // Cast the string roles from SupabaseAuthContext to LegalRole
  const roles = supabaseRoles as LegalRole[];

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Signed in successfully');
    }
    
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: redirectUrl
      }
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Account created successfully');
    }

    return { error };
  };

  const signOut = async () => {
    await logout();
  };

  const hasRole = (role: LegalRole) => roles.includes(role);

  const hasAnyRole = (checkRoles: LegalRole[]) => 
    checkRoles.some(role => roles.includes(role));

  return (
    <LegalAuthContext.Provider
      value={{
        user,
        session,
        roles,
        loading: isLoading,
        signIn,
        signUp,
        signOut,
        hasRole,
        hasAnyRole,
      }}
    >
      {children}
    </LegalAuthContext.Provider>
  );
};
