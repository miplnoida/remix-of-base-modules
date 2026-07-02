import { useQuery } from "@tanstack/react-query";
import { listRecoveryWorkbenchRows } from "@/services/legal/lgRecoveryWorkbenchService";

export function useRecoveryWorkbench() {
  return useQuery({
    queryKey: ["legal", "recovery-workbench"],
    queryFn: listRecoveryWorkbenchRows,
    staleTime: 60_000,
  });
}
