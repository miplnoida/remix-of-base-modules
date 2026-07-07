/**
 * Employer Registry (pilot) — canonical types.
 * Read-only adapter over legacy employer tables (`au_er_master`, `er_master`).
 * NO writes to legacy tables in this foundation epic — mutations open workflow
 * instances only.
 */

export type EmployerLifecycleStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'UNKNOWN';
export type EmployerComplianceStatus = 'COMPLIANT' | 'NON_COMPLIANT' | 'UNDER_AUDIT' | 'UNKNOWN';
export type EmployerContributionStatus = 'PAID' | 'OVERDUE' | 'PENDING' | 'UNKNOWN';

export interface EmployerRegistryRecord {
  employerId: string;
  employerNumber: string;
  employerName: string;
  employerType?: string | null;
  registrationDate?: string | null;
  employerStatus: EmployerLifecycleStatus;
  complianceStatus?: EmployerComplianceStatus;
  contributionStatus?: EmployerContributionStatus;
  officeCode?: string | null;
  address?: {
    line1?: string | null;
    city?: string | null;
    country?: string | null;
  };
  contact?: {
    phone?: string | null;
    email?: string | null;
  };
  sourceTable: 'au_er_master' | 'er_master';
  legacyMappingUsed: boolean;
}

export interface EmployerRegistryListFilters {
  search?: string;
  status?: EmployerLifecycleStatus;
  limit?: number;
}

export interface EmployerRegistryStats {
  total: number;
  active: number;
  suspended: number;
  inactive: number;
}
