import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useIsAdmin } from '@/hooks/useNavigationMenu';
import { AccessDenied } from '@/components/auth/AccessDenied';
import ComplianceFeatureGate from '@/components/compliance/ComplianceFeatureGate';
import { COMPLIANCE_FEATURE_FLAG_RULES } from '@/lib/compliance/menuFeatureFilter';

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

interface ModuleRow {
  id: string;
  name: string;
  display_name: string;
  route: string;
}

function matchPrefix(pathname: string, route: string): boolean {
  if (!route) return false;
  if (pathname === route) return true;
  return pathname.startsWith(route.replace(/\/+$/, '') + '/');
}

function findBestModule(pathname: string, mods: ModuleRow[]): ModuleRow | null {
  let best: ModuleRow | null = null;
  for (const m of mods) {
    if (!m.route) continue;
    if (matchPrefix(pathname, m.route)) {
      if (!best || m.route.length > best.route.length) best = m;
    }
  }
  return best;
}

function findRule(pathname: string, modRoute: string) {
  return COMPLIANCE_FEATURE_FLAG_RULES.find(
    (r) => matchPrefix(pathname, r.prefix) || matchPrefix(modRoute, r.prefix),
  );
}

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
        .select('id,name,display_name,route')
        .like('route', '/compliance/%')
        .eq('is_enabled', true);
      if (error) throw error;
      return (data || []) as ModuleRow[];
    },
  });

  const { data: accessibleNames, isLoading: accLoading } = useQuery({
    queryKey: ['compliance-accessible-modules', user?.id],
    enabled: inCompliance && isAuthenticated && !!user?.id && !isAdmin,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)(
        'get_user_accessible_modules',
        { _user_id: user!.id },
      );
      if (error) throw error;
      return new Set<string>((data || []).map((m: any) => m.name));
    },
  });

  if (!inCompliance || !isAuthenticated) {
    return <>{children ?? <Outlet />}</>;
  }

  if (modsLoading || (!isAdmin && accLoading)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const matched = allMods ? findBestModule(pathname, allMods) : null;

  // No module match — fail-open. Inner PermissionWrapper / per-page guards
  // still apply where present.
  if (!matched) {
    return <>{children ?? <Outlet />}</>;
  }

  // Permission check (admins bypass)
  if (!isAdmin && !(accessibleNames && accessibleNames.has(matched.name))) {
    return <AccessDenied />;
  }

  // Feature flag check
  const rule = findRule(pathname, matched.route);
  if (rule) {
    return (
      <ComplianceFeatureGate flagKey={rule.flag} title={matched.display_name || 'This page'}>
        {children ?? <Outlet />}
      </ComplianceFeatureGate>
    );
  }

  return <>{children ?? <Outlet />}</>;
}

export default ComplianceAccessGate;
