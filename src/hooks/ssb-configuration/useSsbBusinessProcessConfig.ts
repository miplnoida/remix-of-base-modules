/**
 * React Query hooks over ssbBusinessProcessConfigService.
 * Business modules must consume these hooks (or the underlying service)
 * instead of touching ssb_*_policy tables directly.
 */
import { useQuery } from "@tanstack/react-query";
import {
  ssbBusinessProcessConfigService as svc,
  type BusinessProcessKey,
} from "@/services/ssb-configuration/ssbBusinessProcessConfigService";

const KEY = ["ssb", "business-process"] as const;
const staleTime = 30_000;

export function useSsbBusinessProcesses(asOfDate?: string) {
  return useQuery({
    queryKey: [...KEY, "list", asOfDate ?? "today"],
    queryFn: () => svc.listBusinessProcesses(asOfDate),
    staleTime,
  });
}

export function useMemberRegistrationConfiguration(asOfDate?: string) {
  return useQuery({
    queryKey: [...KEY, "member_registration", asOfDate ?? "today"],
    queryFn: () => svc.getMemberRegistrationConfiguration(asOfDate),
    staleTime,
  });
}

export function useEmployerRegistrationConfiguration(asOfDate?: string) {
  return useQuery({
    queryKey: [...KEY, "employer_registration", asOfDate ?? "today"],
    queryFn: () => svc.getEmployerRegistrationConfiguration(asOfDate),
    staleTime,
  });
}

export function useContributionCollectionConfiguration(asOfDate?: string) {
  return useQuery({
    queryKey: [...KEY, "contribution_collection", asOfDate ?? "today"],
    queryFn: () => svc.getContributionCollectionConfiguration(asOfDate),
    staleTime,
  });
}

export function useBenefitAdministrationConfiguration(asOfDate?: string) {
  return useQuery({
    queryKey: [...KEY, "benefit_administration", asOfDate ?? "today"],
    queryFn: () => svc.getBenefitAdministrationConfiguration(asOfDate),
    staleTime,
  });
}

export function useClaimsProcessingConfiguration(asOfDate?: string) {
  return useQuery({
    queryKey: [...KEY, "claims_processing", asOfDate ?? "today"],
    queryFn: () => svc.getClaimsProcessingConfiguration(asOfDate),
    staleTime,
  });
}

export function usePaymentsConfiguration(asOfDate?: string) {
  return useQuery({
    queryKey: [...KEY, "payments", asOfDate ?? "today"],
    queryFn: () => svc.getPaymentsConfiguration(asOfDate),
    staleTime,
  });
}

export function useComplianceCaseConfiguration(asOfDate?: string) {
  return useQuery({
    queryKey: [...KEY, "compliance_case_management", asOfDate ?? "today"],
    queryFn: () => svc.getComplianceCaseConfiguration(asOfDate),
    staleTime,
  });
}

export function useBusinessProcessReadiness(processKey: BusinessProcessKey, asOfDate?: string) {
  return useQuery({
    queryKey: [...KEY, "readiness", processKey, asOfDate ?? "today"],
    queryFn: () => svc.getBusinessProcessReadiness(processKey, asOfDate),
    staleTime,
  });
}

export function useBenefitsReadiness(asOfDate?: string) {
  return useQuery({
    queryKey: [...KEY, "benefits-readiness", asOfDate ?? "today"],
    queryFn: () => svc.evaluateBenefitsReadiness(asOfDate),
    staleTime,
  });
}
