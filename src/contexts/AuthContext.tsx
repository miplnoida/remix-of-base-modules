
/**
 * Legacy AuthContext — now a thin compatibility shim over SupabaseAuthContext.
 *
 * All 25+ files that import `useAuth` from this module will transparently
 * receive the real Supabase-authenticated user instead of mock data.
 *
 * The `User` type from `@/types/auth` is mapped from the Supabase profile so
 * that destructured properties like `user.name`, `user.role`, `user.permissions`
 * continue to work without touching every consumer.
 */

import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { User, UserRole, Department, Permission } from '@/types/auth';

/**
 * Compatibility hook — delegates entirely to useSupabaseAuth().
 * No provider needed; works as long as SupabaseAuthProvider is mounted.
 */
export const useAuth = () => {
  const ctx = useSupabaseAuth();

  // Map Supabase profile to legacy User shape
  const user: User | null = ctx.user
    ? {
        id: ctx.user.id,
        email: ctx.user.email ?? '',
        name: ctx.profile?.full_name ?? ctx.user.email ?? '',
        role: (ctx.roles?.[0] ?? 'data_entry_clerk') as UserRole,
        department: 'administration' as Department,
        permissions: [] as Permission[], // permissions are now checked via RPC
      }
    : null;

  const login = async (email: string, password: string): Promise<boolean> => {
    const result = await ctx.login(email, password);
    return result.success;
  };

  const logout = () => {
    ctx.logout();
  };

  const hasPermission = (_permission: string): boolean => {
    // Legacy mock permission check — always returns true for admin
    if (ctx.isAdmin) return true;
    // For non-admin, callers should migrate to useHasPermission / useModulePermissions
    return false;
  };

  return { user, login, logout, hasPermission };
};

/**
 * AuthProvider is no longer needed — kept as a transparent pass-through
 * so any remaining <AuthProvider> in the tree doesn't break.
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};
