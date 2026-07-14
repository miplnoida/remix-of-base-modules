/**
 * Award 360 permission resolver.
 * Resolves the canonical module permissions used by the workspace and by the
 * action-availability matrix. Uses the shared `useModulePermissions` hook so
 * role names are never hardcoded.
 *
 * BN-AWARD360-V2.1.
 */
import { useModulePermissions } from '@/hooks/useNavigationMenu';
import { isFeatureEnabled } from '@/lib/bn/featureToggles';

export interface Award360Permissions {
  canViewAward: boolean;
  canViewCentralAudit: boolean;
  canPropose: boolean;
  canApprove: boolean;
  canServiceLifeCert: boolean;
  canServiceMedical: boolean;
  canServiceOverpayment: boolean;
  canServiceSuspension: boolean;
  canServicePayments: boolean;
  canServiceCommunications: boolean;
  canViewSensitiveMedical: boolean;
  isLoading: boolean;
}

export interface Award360FeatureFlags {
  lifeCert: boolean;
  medicalReview: boolean;
  overpayment: boolean;
  awardSuspension: boolean;
  payments: boolean;
}

export function useAward360Permissions(): Award360Permissions {
  // Canonical modules registered under app_modules.
  const awards = useModulePermissions('bn_awards');
  const audit = useModulePermissions('bn_audit');
  const lifeCert = useModulePermissions('bn_life_certificates');
  const medical = useModulePermissions('bn_medical_reviews');
  const overpayment = useModulePermissions('bn_overpayments');
  const suspension = useModulePermissions('bn_award_suspension');
  const payments = useModulePermissions('bn_payments');
  const communications = useModulePermissions('bn_communications');

  const isLoading =
    awards.isLoading ||
    audit.isLoading ||
    lifeCert.isLoading ||
    medical.isLoading ||
    overpayment.isLoading ||
    suspension.isLoading ||
    payments.isLoading ||
    communications.isLoading;

  return {
    canViewAward: awards.hasPermission('view'),
    canViewCentralAudit: audit.hasPermission('view') || audit.hasPermission('audit'),
    canPropose: awards.hasPermission('propose') || suspension.hasPermission('propose'),
    canApprove: awards.hasPermission('approve') || suspension.hasPermission('approve'),
    canServiceLifeCert: lifeCert.hasPermission('view'),
    canServiceMedical: medical.hasPermission('view'),
    canServiceOverpayment: overpayment.hasPermission('view'),
    canServiceSuspension: suspension.hasPermission('view'),
    canServicePayments: payments.hasPermission('view'),
    canServiceCommunications: communications.hasPermission('view'),
    // Sensitive medical detail is a distinct action. Fall back to
    // module-view when the fine-grained action is not registered.
    canViewSensitiveMedical:
      medical.hasPermission('view_sensitive') || medical.hasPermission('view'),
    isLoading,
  };
}

export function useAward360FeatureFlags(): Award360FeatureFlags {
  return {
    lifeCert: isFeatureEnabled('bn.servicing.lifeCert'),
    medicalReview: isFeatureEnabled('bn.servicing.medicalReview'),
    overpayment: isFeatureEnabled('bn.servicing.overpayment'),
    awardSuspension: isFeatureEnabled('bn.servicing.awardSuspension'),
    payments: isFeatureEnabled('bn.payments'),
  };
}
