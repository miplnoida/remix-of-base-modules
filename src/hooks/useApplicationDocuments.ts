/**
 * useApplicationDocuments
 * -----------------------
 * Single source of truth for resolving the EFFECTIVE document set during the
 * meeting / review phase, for both Insured Person (IP) and Employer (ER) flows.
 *
 * - Reads the external API documents passed in as `externalDocs` (read-only).
 * - Calls the backend resolver RPC (`ip_app_docs_resolve` or `er_app_docs_resolve`)
 *   to merge them with persisted overrides (uploads / replacements / deletions)
 *   stored in `ip_application_documents` / `er_application_documents`.
 *
 * Also exposes thin mutation helpers that go through the corresponding
 * `*_app_doc_upsert` / `*_app_doc_delete` RPCs — never write directly to the
 * tables from the client.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type ApplicationDocScope = 'ip' | 'er';

export interface ResolvedDocument {
  id?: string;
  source_document_id?: string | null;
  document_name?: string | null;
  document_type?: string | null;
  doc_code?: string | null;
  file_name?: string | null;
  file_path?: string | null;
  url?: string | null;
  storage_url?: string | null;
  mime_type?: string | null;
  file_size?: number | null;
  uploaded_at?: string | null;
  verification_category?: string | null;
  supportive_doc_type?: string | null;
  is_supportive?: boolean;
  metadata?: Record<string, any> | null;
  source?: 'external' | 'override';
}

export interface ResolveResponse {
  external: ResolvedDocument[];
  overrides: ResolvedDocument[];
  merged: ResolvedDocument[];
}

interface Args {
  scope: ApplicationDocScope;
  applicationReference: string | undefined;
  externalDocs: any[] | undefined;
  enabled?: boolean;
}

const RESOLVE_FN: Record<ApplicationDocScope, 'ip_app_docs_resolve' | 'er_app_docs_resolve'> = {
  ip: 'ip_app_docs_resolve',
  er: 'er_app_docs_resolve',
};

const UPSERT_FN: Record<ApplicationDocScope, 'ip_app_doc_upsert' | 'er_app_doc_upsert'> = {
  ip: 'ip_app_doc_upsert',
  er: 'er_app_doc_upsert',
};

const DELETE_FN: Record<ApplicationDocScope, 'ip_app_doc_delete' | 'er_app_doc_delete'> = {
  ip: 'ip_app_doc_delete',
  er: 'er_app_doc_delete',
};

const REF_PARAM: Record<ApplicationDocScope, string> = {
  ip: 'p_application_reference',
  er: 'p_source_application_reference',
};

export function useApplicationDocuments({ scope, applicationReference, externalDocs, enabled = true }: Args) {
  const queryClient = useQueryClient();
  const queryKey = ['app-documents', scope, applicationReference, (externalDocs || []).length];

  const query = useQuery({
    queryKey,
    enabled: enabled && !!applicationReference,
    queryFn: async (): Promise<ResolveResponse> => {
      const fn = RESOLVE_FN[scope];
      const args: Record<string, any> = { p_external_docs: externalDocs || [] };
      args[REF_PARAM[scope]] = applicationReference;
      const { data, error } = await (supabase.rpc as any)(fn, args);
      if (error) throw error;
      return (data as ResolveResponse) ?? { external: [], overrides: [], merged: [] };
    },
    staleTime: 15_000,
  });

  const upsert = useMutation({
    mutationFn: async (params: {
      sourceDocumentId?: string | null;
      fileMeta: Record<string, any>;
      userId: string;
      userCode: string;
    }) => {
      const fn = UPSERT_FN[scope];
      const args: Record<string, any> = {
        p_source_document_id: params.sourceDocumentId ?? null,
        p_file_meta: params.fileMeta,
        p_user_id: params.userId,
        p_user_code: params.userCode,
      };
      args[REF_PARAM[scope]] = applicationReference;
      const { data, error } = await (supabase.rpc as any)(fn, args);
      if (error) throw error;
      return data as string; // uuid
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['app-documents', scope, applicationReference] }),
  });

  const remove = useMutation({
    mutationFn: async (params: { docIdOrSourceId: string; userId: string; userCode: string }) => {
      const fn = DELETE_FN[scope];
      const args: Record<string, any> = {
        p_doc_id_or_source_id: params.docIdOrSourceId,
        p_user_id: params.userId,
        p_user_code: params.userCode,
      };
      args[REF_PARAM[scope]] = applicationReference;
      const { error } = await (supabase.rpc as any)(fn, args);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['app-documents', scope, applicationReference] }),
  });

  return {
    merged: query.data?.merged ?? [],
    external: query.data?.external ?? [],
    overrides: query.data?.overrides ?? [],
    isLoading: query.isLoading,
    error: query.error,
    upsert,
    remove,
    refetch: query.refetch,
  };
}
