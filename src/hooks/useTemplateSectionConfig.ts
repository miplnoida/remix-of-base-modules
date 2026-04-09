/**
 * Hook to fetch and mutate per-template section configurations
 * from ia_document_template_sections.
 *
 * Each document template type (audit_report, audit_plan) gets its own
 * section visibility/ordering/TOC config, separate from the Section Library
 * metadata and separate from Foundation formatting.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { AuditDocumentType } from '@/lib/audit/documentFoundationTypes';

export interface TemplateSectionConfig {
  id: string;
  template_type: string;
  section_key: string;
  is_enabled: boolean;
  is_required: boolean;
  sort_order: number;
  title_override: string | null;
  include_in_toc: boolean;
  start_on_new_page: boolean;
}

const QUERY_KEY = 'ia_document_template_sections';

export function useTemplateSectionConfigs(templateType: AuditDocumentType) {
  return useQuery({
    queryKey: [QUERY_KEY, templateType],
    queryFn: async (): Promise<TemplateSectionConfig[]> => {
      const { data, error } = await (supabase as any)
        .from('ia_document_template_sections')
        .select('*')
        .eq('template_type', templateType)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Failed to fetch template section configs:', error);
        return [];
      }
      return (data || []) as TemplateSectionConfig[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpsertTemplateSectionConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      templateType,
      sectionKey,
      config,
      updatedBy,
    }: {
      templateType: AuditDocumentType;
      sectionKey: string;
      config: Partial<Omit<TemplateSectionConfig, 'id' | 'template_type' | 'section_key'>>;
      updatedBy: string;
    }) => {
      const { data, error } = await (supabase as any)
        .from('ia_document_template_sections')
        .upsert(
          {
            template_type: templateType,
            section_key: sectionKey,
            ...config,
            updated_by: updatedBy,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'template_type,section_key' }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.templateType] });
    },
  });
}

export function useBulkUpsertTemplateSections() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      templateType,
      sections,
      updatedBy,
    }: {
      templateType: AuditDocumentType;
      sections: Omit<TemplateSectionConfig, 'id'>[];
      updatedBy: string;
    }) => {
      const rows = sections.map((s) => ({
        ...s,
        updated_by: updatedBy,
        updated_at: new Date().toISOString(),
      }));

      const { data, error } = await (supabase as any)
        .from('ia_document_template_sections')
        .upsert(rows, { onConflict: 'template_type,section_key' })
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.templateType] });
    },
  });
}
