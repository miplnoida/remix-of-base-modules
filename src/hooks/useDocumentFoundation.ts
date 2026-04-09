/**
 * Hook for the unified Document Foundation — shared branding, typography,
 * page layout, pagination, sign-off, colors, and table style used by
 * ALL audit document types.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  DEFAULT_FOUNDATION,
  type DocumentFoundationConfig,
  type DocumentSectionEntry,
  type AuditDocumentType,
} from '@/lib/audit/documentFoundationTypes';

const FOUNDATION_KEY = 'ia_org_document_foundation';
const SECTION_LIBRARY_KEY = 'ia_document_section_library';

// ─── Foundation Config ───

export function useDocumentFoundation() {
  return useQuery({
    queryKey: [FOUNDATION_KEY],
    queryFn: async (): Promise<DocumentFoundationConfig> => {
      const { data, error } = await (supabase as any)
        .from('ia_org_document_foundation')
        .select('branding, color_palette, typography, page_layout, pagination, sign_off, draft_rules, table_style')
        .eq('foundation_key', 'default')
        .maybeSingle();

      if (error) {
        console.error('Failed to fetch document foundation:', error);
        return DEFAULT_FOUNDATION;
      }
      if (!data) return DEFAULT_FOUNDATION;

      return {
        branding: { ...DEFAULT_FOUNDATION.branding, ...(data.branding || {}) },
        colorPalette: { ...DEFAULT_FOUNDATION.colorPalette, ...(data.color_palette || {}) },
        typography: { ...DEFAULT_FOUNDATION.typography, ...(data.typography || {}) },
        pageLayout: { ...DEFAULT_FOUNDATION.pageLayout, ...(data.page_layout || {}) },
        pagination: { ...DEFAULT_FOUNDATION.pagination, ...(data.pagination || {}) },
        signOff: data.sign_off || DEFAULT_FOUNDATION.signOff,
        draftRules: { ...DEFAULT_FOUNDATION.draftRules, ...(data.draft_rules || {}) },
        tableStyle: { ...DEFAULT_FOUNDATION.tableStyle, ...(data.table_style || {}) },
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useDocumentFoundationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      config,
      updatedBy,
    }: {
      config: DocumentFoundationConfig;
      updatedBy: string;
    }) => {
      const { data, error } = await (supabase as any)
        .from('ia_org_document_foundation')
        .update({
          branding: config.branding,
          color_palette: config.colorPalette,
          typography: config.typography,
          page_layout: config.pageLayout,
          pagination: config.pagination,
          sign_off: config.signOff,
          draft_rules: config.draftRules,
          table_style: config.tableStyle,
          updated_by: updatedBy,
          updated_at: new Date().toISOString(),
        })
        .eq('foundation_key', 'default')
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FOUNDATION_KEY] });
      // Also invalidate template-specific queries since they depend on foundation
      queryClient.invalidateQueries({ queryKey: ['ia_document_template_settings'] });
    },
  });
}

// ─── Section Library ───

export function useDocumentSectionLibrary(documentType?: AuditDocumentType) {
  return useQuery({
    queryKey: [SECTION_LIBRARY_KEY, documentType],
    queryFn: async (): Promise<DocumentSectionEntry[]> => {
      let query = (supabase as any)
        .from('ia_document_section_library')
        .select('*, default_include_in_toc, default_start_on_new_page')
        .order('default_order', { ascending: true });

      if (documentType) {
        query = query.contains('applies_to', [documentType]);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Failed to fetch section library:', error);
        return [];
      }
      return (data || []).map((row: any) => ({
        ...row,
        default_include_in_toc: row.default_include_in_toc ?? true,
        default_start_on_new_page: row.default_start_on_new_page ?? false,
      })) as DocumentSectionEntry[];
    },
    staleTime: 5 * 60 * 1000,
  });
}
