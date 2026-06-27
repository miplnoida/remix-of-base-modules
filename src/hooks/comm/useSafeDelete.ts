import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useUserCode } from "@/hooks/useUserCode";
import {
  canDelete,
  hardDelete,
  softArchive,
  replaceReferences,
} from "@/lib/comm/safeDeleteService";
import type { CommEntityType } from "@/lib/comm/referenceRegistry";

export function useWhereUsed(entityType: CommEntityType, id: string | null | undefined, matchKey?: string) {
  return useQuery({
    queryKey: ["comm-where-used", entityType, id, matchKey ?? null],
    enabled: !!id,
    queryFn: () => canDelete(entityType, id!, matchKey),
    staleTime: 30_000,
  });
}

export function useSafeDelete(entityType: CommEntityType) {
  const qc = useQueryClient();
  const { userCode } = useUserCode();
  return useMutation({
    mutationFn: async ({ id, reason, matchKey }: { id: string; reason: string; matchKey?: string }) => {
      await hardDelete(entityType, id, reason, userCode ?? null, matchKey);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [entityType] });
      qc.invalidateQueries({ queryKey: ["comm-where-used"] });
      toast.success("Deleted");
    },
    onError: (e: any) => toast.error(e?.message ?? "Delete failed"),
  });
}

export function useArchive(entityType: CommEntityType) {
  const qc = useQueryClient();
  const { userCode } = useUserCode();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      await softArchive(entityType, id, reason, userCode ?? null);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [entityType] });
      toast.success("Archived");
    },
    onError: (e: any) => toast.error(e?.message ?? "Archive failed"),
  });
}

export function useReplaceReferences(entityType: CommEntityType) {
  const qc = useQueryClient();
  const { userCode } = useUserCode();
  return useMutation({
    mutationFn: async ({ oldId, newId, reason }: { oldId: string; newId: string; reason: string }) => {
      return replaceReferences(entityType, oldId, newId, reason, userCode ?? null);
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["comm-where-used"] });
      qc.invalidateQueries({ queryKey: [entityType] });
      toast.success(`Rewrote ${r.rewritten} reference${r.rewritten === 1 ? "" : "s"} (${r.skipped} skipped)`);
    },
    onError: (e: any) => toast.error(e?.message ?? "Replace failed"),
  });
}
