/**
 * SecurityPolicyContext
 * 
 * Global security context that:
 * - Checks application lockdown state
 * - Validates route permissions on navigation
 * - Logs unauthorized access attempts
 * - Enforces settings route restrictions for non-admins
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  getAppLockdownState,
  logUnauthorizedAccess,
  getClientIP,
  SecurityState,
} from '@/services/securityPolicyService';
import { logAuditTrail } from '@/services/auditService';

interface RouteSecurityRule {
  route_pattern: string;
  module_name: string;
  screen_name: string | null;
  requires_auth: boolean;
  admin_only: boolean;
  is_settings_route: boolean;
  severity_on_violation: string;
}

interface SecurityPolicyContextType {
  isLocked: boolean;
  lockdownState: SecurityState | null;
  isCheckingRoute: boolean;
  lastDeniedRoute: string | null;
}

const SecurityPolicyContext = createContext<SecurityPolicyContextType>({
  isLocked: false,
  lockdownState: null,
  isCheckingRoute: false,
  lastDeniedRoute: null,
});

export const useSecurityPolicy = () => useContext(SecurityPolicyContext);

// Routes that never require auth (public routes)
const PUBLIC_ROUTES = [
  '/login',
  '/forgot-password',
  '/reset-password',
  '/change-password',
  '/mfa-verify',
  '/setup',
  '/demo-login',
  '/inspector/login',
  '/unauthorized',
  '/access-denied',
  '/403',
  '/404',
  '/500',
  '/maintenance',
];

function isPublicRoute(path: string): boolean {
  return PUBLIC_ROUTES.some(pr => path === pr || path.startsWith(pr + '/'));
}

/**
 * Match a URL path against a route pattern (supports :param and * wildcards)
 */
function matchRoutePattern(path: string, pattern: string): boolean {
  // Exact match
  if (path === pattern) return true;
  
  // Convert route pattern to regex
  const regexStr = '^' + pattern
    .replace(/:[^/]+/g, '[^/]+')  // :param -> match segment
    .replace(/\*/g, '.*')          // * -> match anything
    + '$';
  
  try {
    return new RegExp(regexStr).test(path);
  } catch {
    return false;
  }
}

export const SecurityPolicyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, isAdmin, isLoading: authLoading, profile } = useSupabaseAuth();
  const queryClient = useQueryClient();
  const [isCheckingRoute, setIsCheckingRoute] = useState(false);
  const [lastDeniedRoute, setLastDeniedRoute] = useState<string | null>(null);
  const lastCheckedPath = useRef<string>('');
  const clientIPRef = useRef<string>('unknown');

  // Fetch client IP once
  useEffect(() => {
    getClientIP().then(ip => { clientIPRef.current = ip; });
  }, []);

  // 1. Check lockdown state
  const { data: lockdownState } = useQuery({
    queryKey: ['app-lockdown-state'],
    queryFn: getAppLockdownState,
    refetchInterval: 30_000, // Check every 30s
    staleTime: 10_000,
  });

  const isLocked = lockdownState?.is_locked ?? false;

  // 2. Fetch route security rules
  const { data: routeRules = [] } = useQuery({
    queryKey: ['route-security-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('route_security_config')
        .select('route_pattern, module_name, screen_name, requires_auth, admin_only, is_settings_route, severity_on_violation')
        .eq('is_active', true);
      if (error) {
        console.error('[SecurityPolicy] Failed to load route rules:', error);
        return [];
      }
      return (data || []) as RouteSecurityRule[];
    },
    staleTime: 5 * 60_000,
  });

  // 3. Route change enforcement
  const checkRouteAccess = useCallback(async (path: string) => {
    // Skip for public routes
    if (isPublicRoute(path)) return;
    
    // Skip while auth is loading
    if (authLoading) return;
    
    // Skip duplicate checks
    if (lastCheckedPath.current === path) return;
    lastCheckedPath.current = path;

    setIsCheckingRoute(true);

    try {
      // Check lockdown (admins bypass)
      if (isLocked && !isAdmin) {
        setLastDeniedRoute(path);
        await logUnauthorizedAccess({
          route: path,
          reason: 'Application is in lockdown mode',
          severity: 'critical',
          userId: user?.id,
          userEmail: user?.email || undefined,
          ipAddress: clientIPRef.current,
        });
        navigate('/maintenance', { replace: true });
        return;
      }

      // Not authenticated trying to access protected route
      if (!isAuthenticated) {
        await logUnauthorizedAccess({
          route: path,
          reason: 'Unauthenticated access attempt',
          severity: 'medium',
          ipAddress: clientIPRef.current,
        });
        navigate('/login', { replace: true });
        return;
      }

      // Find matching route rule
      const matchedRule = routeRules.find(rule => matchRoutePattern(path, rule.route_pattern));

      if (matchedRule) {
        // Settings routes: admin only
        if (matchedRule.is_settings_route && !isAdmin) {
          setLastDeniedRoute(path);
          await logUnauthorizedAccess({
            route: path,
            moduleName: matchedRule.module_name,
            reason: 'Non-admin attempted settings access',
            severity: 'high',
            userId: user?.id,
            userEmail: user?.email || undefined,
            ipAddress: clientIPRef.current,
          });
          
          await logAuditTrail({
            action: 'unauthorized_settings_access',
            entityType: 'route',
            entityId: path,
            module: 'Security',
            userCode: profile?.user_code || undefined,
            userId: user?.id,
            metadata: { module_name: matchedRule.module_name, severity: 'high' },
          });
          
          navigate('/access-denied', { replace: true });
          return;
        }

        // Admin-only routes
        if (matchedRule.admin_only && !isAdmin) {
          setLastDeniedRoute(path);
          await logUnauthorizedAccess({
            route: path,
            moduleName: matchedRule.module_name,
            reason: 'Non-admin attempted admin-only route',
            severity: matchedRule.severity_on_violation,
            userId: user?.id,
            userEmail: user?.email || undefined,
            ipAddress: clientIPRef.current,
          });
          navigate('/access-denied', { replace: true });
          return;
        }

        // Module permission check (skip for admins)
        if (!isAdmin && matchedRule.module_name) {
          const { data: canAccess, error } = await (supabase.rpc as any)('can_access_module', {
            _user_id: user?.id,
            _module_name: matchedRule.module_name,
          });

          if (error || !canAccess) {
            setLastDeniedRoute(path);
            await logUnauthorizedAccess({
              route: path,
              moduleName: matchedRule.module_name,
              reason: `No permission for module: ${matchedRule.module_name}`,
              severity: matchedRule.severity_on_violation,
              userId: user?.id,
              userEmail: user?.email || undefined,
              ipAddress: clientIPRef.current,
            });
            navigate('/access-denied', { replace: true });
            return;
          }
        }
      }
      // If no rule found, the route falls through to existing ProtectedLayout/ProtectedRoute checks
    } catch (err) {
      console.error('[SecurityPolicy] Route check error:', err);
    } finally {
      setIsCheckingRoute(false);
    }
  }, [authLoading, isAuthenticated, isAdmin, isLocked, routeRules, user, profile, navigate]);

  // Trigger check on route change
  useEffect(() => {
    checkRouteAccess(location.pathname);
  }, [location.pathname, checkRouteAccess]);

  // Reset lastCheckedPath when user changes
  useEffect(() => {
    lastCheckedPath.current = '';
  }, [user?.id]);

  return (
    <SecurityPolicyContext.Provider
      value={{
        isLocked,
        lockdownState: lockdownState ?? null,
        isCheckingRoute,
        lastDeniedRoute,
      }}
    >
      {children}
    </SecurityPolicyContext.Provider>
  );
};
