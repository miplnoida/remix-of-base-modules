import React from 'react';
import { useActionPermissions } from '@/hooks/useActionPermission';

interface PermissionGateProps {
  /** Module name registered in app_modules / role_permissions. */
  moduleName: string;
  /** Action key registered against the module (e.g. 'approve_benefit_claim'). */
  action: string;
  /** Element to render when the user lacks the permission. Defaults to nothing. */
  fallback?: React.ReactNode;
  /** When true, render children disabled instead of hiding them. */
  disableInsteadOfHide?: boolean;
  children: React.ReactNode;
}

/**
 * Inline (button-level) permission guard for BN privileged actions.
 *
 * Unlike `PermissionWrapper` (which is page-level and shows AccessDenied),
 * `PermissionGate` is for individual controls — it hides or disables the
 * child element when the current user does not hold the action permission.
 * Admin users always pass.
 */
export function PermissionGate({
  moduleName,
  action,
  fallback = null,
  disableInsteadOfHide = false,
  children,
}: PermissionGateProps) {
  const { can, isAdmin, isLoading } = useActionPermissions(moduleName);

  if (isLoading) return null;
  const allowed = isAdmin || can(action);

  if (allowed) return <>{children}</>;
  if (disableInsteadOfHide && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      disabled: true,
      title: 'You do not have permission for this action.',
    });
  }
  return <>{fallback}</>;
}

export default PermissionGate;
