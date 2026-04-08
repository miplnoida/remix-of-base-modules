import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  DEFAULT_AUDIT_REPORT_CONFIG,
  DEFAULT_AUDIT_PLAN_CONFIG,
  type AuditReportTemplateConfig,
  type AuditPlanTemplateConfig,
} from '@/lib/audit/documentTemplateDefaults';

type TemplateType = 'audit_report' | 'audit_plan';

function getDefault(type: TemplateType) {
  return type === 'audit_report' ? DEFAULT_AUDIT_REPORT_CONFIG : DEFAULT_AUDIT_PLAN_CONFIG;
}

export function useAuditDocumentTemplate<T = AuditReportTemplateConfig | AuditPlanTemplateConfig>(
  templateType: TemplateType
) {
  return useQuery({
    queryKey: ['ia_document_template_settings', templateType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ia_document_template_settings' as any)
        .select('config_json')
        .eq('template_type', templateType)
        .maybeSingle();

      if (error) {
        console.error('Failed to fetch document template:', error);
        return getDefault(templateType) as T;
      }

      if (!data || !data.config_json) {
        return getDefault(templateType) as T;
      }

      // Deep merge with defaults to ensure new keys are present
      const defaults = getDefault(templateType);
      return { ...defaults, ...(data.config_json as any) } as T;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useAuditReportTemplate() {
  return useAuditDocumentTemplate<AuditReportTemplateConfig>('audit_report');
}

export function useAuditPlanTemplate() {
  return useAuditDocumentTemplate<AuditPlanTemplateConfig>('audit_plan');
}

export function useAuditDocumentTemplateMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      templateType,
      configJson,
      updatedBy,
    }: {
      templateType: TemplateType;
      configJson: Record<string, any>;
      updatedBy: string;
    }) => {
      const { data, error } = await supabase
        .from('ia_document_template_settings' as any)
        .update({
          config_json: configJson,
          updated_by: updatedBy,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('template_type', templateType)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['ia_document_template_settings', variables.templateType],
      });
    },
  });
}
