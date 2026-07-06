import { useQuery } from "@tanstack/react-query";
import {
  ssbImplementationConfigService,
  computeReadiness,
  getKnProfile,
  type SsbSectionReadiness,
} from "@/services/ssb/ssbImplementationConfigService";

export function useSsbImplementationConfig() {
  return useQuery({
    queryKey: ["ssb", "profile", "KN"],
    queryFn: getKnProfile,
    staleTime: 60_000,
  });
}

function usePolicyList<T>(key: string, fetcher: (pid: string) => Promise<T[]>, profileId?: string | null) {
  return useQuery({
    queryKey: ["ssb", key, profileId ?? "none"],
    queryFn: () => (profileId ? fetcher(profileId) : Promise.resolve([] as T[])),
    enabled: !!profileId,
    staleTime: 30_000,
  });
}

export const useSsbAddressPolicy = (pid?: string | null) =>
  usePolicyList("address", ssbImplementationConfigService.listAddressPolicies, pid);
export const useSsbIdentityPolicy = (pid?: string | null) =>
  usePolicyList("identity", ssbImplementationConfigService.listIdentityPolicies, pid);
export const useSsbNumberingPolicy = (pid?: string | null) =>
  usePolicyList("numbering", ssbImplementationConfigService.listNumberingPolicies, pid);
export const useSsbFinancialPolicy = (pid?: string | null) =>
  usePolicyList("financial", ssbImplementationConfigService.listFinancialPolicies, pid);
export const useSsbLegalPolicy = (pid?: string | null) =>
  usePolicyList("legal", ssbImplementationConfigService.listLegalPolicies, pid);
export const useSsbDocumentPolicy = (pid?: string | null) =>
  usePolicyList("document", ssbImplementationConfigService.listDocumentPolicies, pid);
export const useSsbWorkflowPolicy = (pid?: string | null) =>
  usePolicyList("workflow", ssbImplementationConfigService.listWorkflowPolicies, pid);
export const useSsbCommunicationPolicy = (pid?: string | null) =>
  usePolicyList("communication", ssbImplementationConfigService.listCommunicationPolicies, pid);
export const useSsbContributionCalendarPolicy = (pid?: string | null) =>
  usePolicyList("calendar", ssbImplementationConfigService.listContributionCalendarPolicies, pid);

export function useSsbSetupReadiness(profileId?: string | null) {
  return useQuery<SsbSectionReadiness[]>({
    queryKey: ["ssb", "readiness", profileId ?? "none"],
    queryFn: () => (profileId ? computeReadiness(profileId) : Promise.resolve([])),
    enabled: !!profileId,
    staleTime: 30_000,
  });
}
