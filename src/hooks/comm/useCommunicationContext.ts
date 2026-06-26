import { useQuery } from "@tanstack/react-query";
import { resolveCommunicationContext } from "@/lib/comm/communicationResolver";

export const COMM_CONTEXT_KEY = (module: string) => ["comm_context", module] as const;

/**
 * Resolves the enterprise communication context (organization + department +
 * primary location + selected comm assets) for a module. Cached for 5 minutes.
 */
export function useCommunicationContext(moduleCode: string = "LEGAL") {
  return useQuery({
    queryKey: COMM_CONTEXT_KEY(moduleCode),
    queryFn: () => resolveCommunicationContext(moduleCode),
    staleTime: 5 * 60_000,
  });
}
