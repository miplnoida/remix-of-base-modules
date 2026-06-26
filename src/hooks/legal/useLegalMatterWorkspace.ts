import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { useLegalCapability } from "@/hooks/legal/useLegalCapability";
import { legalMatterWorkspaceService } from "@/services/legal/legalMatterWorkspaceService";
import type {
  LegalMatterWorkspace,
  LegalMatterWorkspaceFilters,
  LegalMatterWorkspaceUserContext,
} from "@/types/legalMatterWorkspace";

export type LegalMatterRef =
  | { kind: "referral"; id: string }
  | { kind: "intake"; id: string }
  | { kind: "case"; id: string }
  | { kind: "advice"; id: string };

/** Resolve a single Legal Matter Workspace by lifecycle reference. */
export function useLegalMatterWorkspace(matterRef: LegalMatterRef | null | undefined) {
  const { capability } = useLegalCapability();
  return useQuery({
    queryKey: ["legal-matter-workspace", matterRef?.kind, matterRef?.id, capability.role],
    enabled: !!matterRef?.id,
    queryFn: async (): Promise<LegalMatterWorkspace | null> => {
      if (!matterRef) return null;
      switch (matterRef.kind) {
        case "referral": return legalMatterWorkspaceService.getByReferralId(matterRef.id, capability);
        case "intake":   return legalMatterWorkspaceService.getByIntakeId(matterRef.id, capability);
        case "case":     return legalMatterWorkspaceService.getByCaseId(matterRef.id, capability);
        case "advice":   return legalMatterWorkspaceService.getByAdviceRequestId(matterRef.id, capability);
      }
    },
    staleTime: 15_000,
  });
}

/** List Legal Matter Workspaces for the workbench grid. */
export function useLegalMatterWorkspaceList(filters: LegalMatterWorkspaceFilters = {}) {
  const { capability } = useLegalCapability();
  const key = useMemo(() => JSON.stringify(filters), [filters]);
  return useQuery({
    queryKey: ["legal-matter-workspace-list", key, capability.role],
    queryFn: () => legalMatterWorkspaceService.listForWorkbench(filters, capability),
    staleTime: 15_000,
  });
}

/** List matters scoped to the user's workbasket / team / direct ownership. */
export function useLegalMatterUserWorkbasket(ctx: LegalMatterWorkspaceUserContext) {
  const { capability } = useLegalCapability();
  return useQuery({
    queryKey: ["legal-matter-user-workbasket", ctx.userId, ctx.userCode, ctx.teamCodes.join(","), ctx.workbasketCodes.join(","), capability.role],
    enabled: !!ctx.userId,
    queryFn: () => legalMatterWorkspaceService.listForUserWorkbasket(ctx, capability),
    staleTime: 15_000,
  });
}
