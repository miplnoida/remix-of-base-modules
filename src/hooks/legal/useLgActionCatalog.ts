import { useQuery } from "@tanstack/react-query";
import { listActionCatalog, type LgActionCatalogEntry } from "@/services/legal/lgActionCatalogService";

export function useLgActionCatalog(opts: {
  source_mode?: string | null;
  party_kind?: "EMPLOYER" | "INSURED" | "INTERNAL" | null;
}) {
  return useQuery<LgActionCatalogEntry[]>({
    queryKey: ["lg-action-catalog", opts.source_mode ?? "*", opts.party_kind ?? "*"],
    queryFn: () => listActionCatalog(opts),
    staleTime: 5 * 60 * 1000,
  });
}
