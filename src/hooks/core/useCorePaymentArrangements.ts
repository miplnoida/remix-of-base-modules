import { useQuery } from "@tanstack/react-query";
import {
  getArrangement,
  listArrangementsByDebtor,
  listArrangementsByLegalCase,
  listArrangementsByComplianceCase,
} from "@/services/core/corePaymentArrangementService";

export function useCoreArrangementsByDebtor(debtorId?: string | null, debtorType: string = "EMPLOYER") {
  return useQuery({
    queryKey: ["core_pa", "byDebtor", debtorType, debtorId],
    queryFn: () => listArrangementsByDebtor(debtorId!, debtorType),
    enabled: !!debtorId,
    staleTime: 30_000,
  });
}

export function useCoreArrangementsByLegalCase(lgCaseId?: string | null) {
  return useQuery({
    queryKey: ["core_pa", "byLegalCase", lgCaseId],
    queryFn: () => listArrangementsByLegalCase(lgCaseId!),
    enabled: !!lgCaseId,
    staleTime: 30_000,
  });
}

export function useCoreArrangementsByComplianceCase(ceCaseId?: string | null) {
  return useQuery({
    queryKey: ["core_pa", "byComplianceCase", ceCaseId],
    queryFn: () => listArrangementsByComplianceCase(ceCaseId!),
    enabled: !!ceCaseId,
    staleTime: 30_000,
  });
}

export function useCoreArrangementDetail(id?: string | null) {
  return useQuery({
    queryKey: ["core_pa", "detail", id],
    queryFn: () => getArrangement(id!),
    enabled: !!id,
    staleTime: 30_000,
  });
}
