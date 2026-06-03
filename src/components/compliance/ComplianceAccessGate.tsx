import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useIsAdmin } from '@/hooks/useNavigationMenu';
import { AccessDenied } from '@/components/auth/AccessDenied';
import ComplianceFeatureGate from '@/components/compliance/ComplianceFeatureGate';
import { resolveComplianceAccess, type ComplianceModuleRow } from '@/lib/compliance/accessResolution';
import { fetchAllUserPermissions } from '@/lib/permissions/fetchAllUserPermissions';

/**
 * Global Compliance & Enforcement access gate.
 *
 * Wraps every protected route's Outlet. For any pathname under /compliance/*
 * it enforces this precedence:
 *
 *   1. Auth (handled upstream by ProtectedLayout/ProtectedRoute)
 *   2. Role/module/action permission — checked against the user's
 *      accessible-modules set, resolved by matching the current pathname
 *      against the most-specific app_modules.route.
 *   3. Feature-flag check — uses COMPLIANCE_FEATURE_FLAG_RULES (the same
 *      ruleset that hides menu items) and delegates rendering to
 *      ComplianceFeatureGate so the existing FeatureDisabled UX is reused.
 *   4. Renders the Outlet.
 *
 * Unauthorized users always see <AccessDenied/> regardless of feature-flag
 * state — they must not learn whether a gated feature is ON or OFF.
 *
 * Fail-open for unmapped paths (legacy redirects, ad-hoc sub-routes with no
 * app_modules row) so the existing app keeps working; per-page
 * PermissionWrapper / inner checks still apply.
 */

export function ComplianceAccessGate({ children }: { children?: React.ReactNode }) {
  const location = useLocation();
  const pathname = location.pathname;
  const inCompliance = pathname === '/compliance' || pathname.startsWith('/compliance/');

  const { user, isAuthenticated } = useSupabaseAuth();
  const isAdmin = useIsAdmin();

  const { data: allMods, isLoading: modsLoading } = useQuery({
    queryKey: ['compliance-all-modules'],
    enabled: inCompliance && isAuthenticated,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_modules')
        .select('id,name,display_name,route,parent_id,sort_order,is_enabled,show_in_menu,routes_enabled')
        .or('route.like./compliance/%,route.eq./compliance')
        .eq('is_enabled', true);
      if (error) throw error;
      return (data || []) as ComplianceModuleRow[];
    },
  });

  const { data: permissionState, isLoading: permissionLoading } = useQuery({
    queryKey: ['compliance-access-resolution-permissions', user?.id],
    enabled: inCompliance && isAuthenticated && !!user?.id && !isAdmin,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const permissions = await fetchAllUserPermissions(user!.id);
      const { data: accessibleData, error: accessibleError } = await (supabase.rpc as any)('get_user_accessible_modules', { _user_id: user!.id })
        .range(0, 9999);
      if (accessibleError) throw accessibleError;
      return {
        permissions,
        accessibleNames: new Set<string>((accessibleData || []).map((m: any) => m.name)),
      };
    },

  });

  if (!inCompliance || !isAuthenticated) {
    return <>{children ?? <Outlet />}</>;
  }

  if (modsLoading || (!isAdmin && permissionLoading)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const resolution = resolveComplianceAccess({
    pathname,
    modules: allMods || [],
    permissions: isAdmin ? [] : (permissionState?.permissions || []),
    accessibleModuleNames: permissionState?.accessibleNames,
    isAdmin,
  });

  if (resolution.finalDecision === 'access-denied' || resolution.finalDecision === 'fail-closed') {
    return <AccessDenied />;
  }

  if (resolution.matchedFeatureRule) {
    return (
      <ComplianceFeatureGate
        flagKey={resolution.matchedFeatureRule.flag}
        title={resolution.selectedModule?.display_name || 'This page'}
      >
        {children ?? <Outlet />}
      </ComplianceFeatureGate>
    );
  }

  return <>{children ?? <Outlet />}</>;
}

export default ComplianceAccessGate;
