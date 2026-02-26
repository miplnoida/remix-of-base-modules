import React from 'react';
import { AUDIT_FEATURE_FLAGS, AuditFeatureFlag } from '@/config/auditRouteConfig';
import AuditModuleUnderActivation from '@/pages/audit/AuditModuleUnderActivation';

interface AuditFeatureGateProps {
  featureFlag: AuditFeatureFlag;
  children: React.ReactNode;
}

/**
 * Wrapper that checks a feature flag before rendering the child component.
 * If the flag is disabled, renders the "Under Activation" placeholder instead.
 * This is a non-invasive wrapper — it does NOT modify the wrapped component.
 */
export function AuditFeatureGate({ featureFlag, children }: AuditFeatureGateProps) {
  const isEnabled = AUDIT_FEATURE_FLAGS[featureFlag] ?? false;

  if (!isEnabled) {
    return <AuditModuleUnderActivation />;
  }

  return <>{children}</>;
}
