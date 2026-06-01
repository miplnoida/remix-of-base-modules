import React from 'react';
import { isComplianceDbFlagEnabled } from '@/lib/compliance/featureToggles';
import { hasComplianceDbFlagsLoaded } from '@/lib/compliance/featureFlagCache';
import FeatureDisabled from '@/pages/compliance/FeatureDisabled';

/**
 * Phase 1 feature-flag route wrapper.
 *
 * Wrap a route element with this gate to render <FeatureDisabled /> when the
 * given DB feature_flags.flag_key is OFF. Permission gating is handled
 * separately by the existing ProtectedLayout / PermissionWrapper chain.
 *
 * Behaviour:
 *   - Cache NOT loaded yet → render children (fail-open so transient
 *     load failures never hide working UI).
 *   - Cache loaded + flag === false → render FeatureDisabled.
 *   - Cache loaded + flag === true / missing → render children.
 */
interface Props {
  flagKey: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}

export const ComplianceFeatureGate: React.FC<Props> = ({ flagKey, title, description, children }) => {
  if (hasComplianceDbFlagsLoaded() && !isComplianceDbFlagEnabled(flagKey)) {
    return <FeatureDisabled title={title} flagKey={flagKey} description={description} />;
  }
  return <>{children}</>;
};

export default ComplianceFeatureGate;
