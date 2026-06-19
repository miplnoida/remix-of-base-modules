import { useQuery } from "@tanstack/react-query";
import { listLegalTemplates, getTemplate, buildTokenContext } from "@/services/legal/lgTemplateService";
import {
  listLgDocumentLinks,
  createLgDocumentLink,
  deleteLgDocumentLink,
} from "@/services/legal/lgDocumentLinkService";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useLegalTemplates() {
  return useQuery({
    queryKey: ["lg_templates"],
    queryFn: listLegalTemplates,
    staleTime: 5 * 60_000,
  });
}

export function useLegalTemplate(id: string | undefined) {
  return useQuery({
    queryKey: ["lg_template", id],
    queryFn: () => getTemplate(id as string),
    enabled: !!id,
  });
}

export function useLgTokenContext(lgCaseId: string | undefined) {
  return useQuery({
    queryKey: ["lg_token_context", lgCaseId],
    queryFn: () => buildTokenContext(lgCaseId as string),
    enabled: !!lgCaseId,
  });
}

export function useLgDocumentLinks(caseId: string | undefined) {
  return useQuery({
    queryKey: ["lg_document_link", caseId],
    queryFn: () => listLgDocumentLinks(caseId as string),
    enabled: !!caseId,
  });
}

export function useCreateLgDocumentLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createLgDocumentLink,
    onSuccess: (d) => qc.invalidateQueries({ queryKey: ["lg_document_link", d.lg_case_id] }),
  });
}

export function useDeleteLgDocumentLink(caseId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteLgDocumentLink,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lg_document_link", caseId] }),
  });
}
