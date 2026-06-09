import { useMemo } from 'react';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import {
  availableTransitions,
  GOVERNANCE_TRANSITIONS,
  type GovernanceStatus,
  type GovernanceTransition,
} from '@/services/bn/governance/ruleGovernanceService';

export interface UseRuleGovernanceResult {
  userRoles: string[];
  isAdmin: boolean;
  isAuditor: boolean;
  canViewAudit: boolean;
  getActions: (status: GovernanceStatus) => GovernanceTransition[];
  allTransitions: GovernanceTransition[];
}

export function useRuleGovernance(): UseRuleGovernanceResult {
  const auth = useSupabaseAuth();
  const roles = auth.roles ?? [];
  const isAdmin = !!auth.isAdmin;

  return useMemo(() => ({
    userRoles: roles,
    isAdmin,
    isAuditor: roles.includes('BN_AUDITOR'),
    canViewAudit:
      isAdmin || roles.includes('BN_AUDITOR') || roles.includes('BN_CONFIG_ADMIN'),
    getActions: (status: GovernanceStatus) =>
      availableTransitions(status, roles, isAdmin),
    allTransitions: GOVERNANCE_TRANSITIONS,
  }), [roles, isAdmin]);
}
