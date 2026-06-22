import { useQuery } from "@tanstack/react-query";
import {
  loadAllSources,
  loadSourceConfig,
  checkCaseCreation,
  type CaseCreationCheck,
} from "@/services/legal/lgCaseSourceConfigService";

export function useLgSources(country = "SKN") {
  return useQuery({
    queryKey: ["lg_case_source_config_all", country],
    queryFn: () => loadAllSources(country),
    staleTime: 60_000,
  });
}

export function useLgSourceAllowance(source_code: string | null | undefined, country = "SKN") {
  return useQuery({
    queryKey: ["lg_case_source_allowance", country, source_code],
    queryFn: () => loadSourceConfig(source_code!, country),
    enabled: !!source_code,
    staleTime: 30_000,
  });
}

export function useCaseCreationCheck(args: {
  source_code: string | null | undefined;
  case_type_code?: string | null;
  stage_code?: string | null;
  manual?: boolean;
  country?: string;
}) {
  return useQuery<CaseCreationCheck | null>({
    queryKey: [
      "lg_case_creation_check",
      args.country ?? "SKN",
      args.source_code,
      args.case_type_code ?? null,
      args.stage_code ?? null,
      args.manual ?? false,
    ],
    queryFn: async () =>
      args.source_code
        ? checkCaseCreation({
            source_code: args.source_code,
            case_type_code: args.case_type_code ?? null,
            stage_code: args.stage_code ?? null,
            manual: args.manual,
            country: args.country,
          })
        : null,
    enabled: !!args.source_code,
    staleTime: 10_000,
  });
}
