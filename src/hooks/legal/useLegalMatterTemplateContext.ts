/**
 * useLegalMatterTemplateContext
 *
 * Thin react-query wrapper around legalMatterWorkspaceService.buildTemplateContext.
 * Phase 2 letter UIs can call this to get a workspace-aware template context
 * (legacy buildTokenContext merged with workspace identity / party / officer).
 */
import { useQuery } from "@tanstack/react-query";
import { legalMatterWorkspaceService } from "@/services/legal/legalMatterWorkspaceService";

export function useLegalMatterTemplateContext(matterId: string | null | undefined) {
  return useQuery({
    queryKey: ["legal-matter-template-context", matterId],
    enabled: !!matterId,
    queryFn: () => legalMatterWorkspaceService.buildTemplateContext(matterId as string),
    staleTime: 30_000,
  });
}

export function useLegalMatterAiContext(matterId: string | null | undefined) {
  return useQuery({
    queryKey: ["legal-matter-ai-context", matterId],
    enabled: !!matterId,
    queryFn: () => legalMatterWorkspaceService.buildAiContext(matterId as string),
    staleTime: 30_000,
  });
}
