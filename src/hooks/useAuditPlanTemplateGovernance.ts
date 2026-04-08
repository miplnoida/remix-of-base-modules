/**
 * React hook for Audit Plan Template governance operations.
 *
 * Provides CRUD, cloning, status transitions, and default-setting
 * with built-in governance guard checks.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useIsAdmin } from '@/hooks/useNavigationMenu';
import { toast } from 'sonner';
import {
  type GovernedTemplateRow,
  type TemplateStatus,
  type TemplateAction,
  type CloneOptions,
  checkTemplateAction,
  canPerformTemplateAction,
  buildClonePayload,
  bumpVersion,
  isValidStatusTransition,
  resolveEffectiveTemplate,
  getStatusLabel,
  HOUSE_DEFAULT_TEMPLATE_KEY,
} from '@/lib/audit/auditPlanTemplateGovernance';
import { PRESET_AUDIT_BLUE_MINIMAL } from '@/lib/audit/auditPlanTemplatePresets';

const QUERY_KEY = 'ia_audit_plan_templates_governed';

// ─── List All Templates ───

export function useAuditPlanTemplates() {
  return useQuery({
    queryKey: [QUERY_KEY],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('ia_audit_plan_templates')
        .select('*')
        .order('is_system', { ascending: false })
        .order('is_house_default', { ascending: false })
        .order('template_name');

      if (error) {
        console.error('Failed to fetch audit plan templates:', error);
        return [] as GovernedTemplateRow[];
      }

      return (data ?? []) as GovernedTemplateRow[];
    },
    staleTime: 2 * 60 * 1000,
  });
}

// ─── Resolve Effective Template ───

export function useEffectiveAuditPlanTemplate(selectedId?: string | null) {
  const { data: templates = [] } = useAuditPlanTemplates();

  const effective = resolveEffectiveTemplate(templates, selectedId);

  // Fallback to hardcoded preset if no DB templates exist
  const fallbackConfig = PRESET_AUDIT_BLUE_MINIMAL;

  return {
    template: effective,
    config: effective?.config_json ?? fallbackConfig,
    isUsingFallback: !effective,
  };
}

// ─── Permission Check ───

export function useTemplatePermission() {
  const { profile } = useSupabaseAuth() as any;
  const isAdmin = useIsAdmin();

  const can = (action: TemplateAction): boolean => {
    return canPerformTemplateAction(profile?.role, action, isAdmin);
  };

  const canOnTemplate = (template: GovernedTemplateRow, action: TemplateAction): boolean => {
    if (!can(action)) return false;
    const result = checkTemplateAction(template, action);
    return result.allowed;
  };

  const getBlockReason = (template: GovernedTemplateRow, action: TemplateAction): string | null => {
    if (!can(action)) return 'You do not have permission to perform this action.';
    const result = checkTemplateAction(template, action);
    return result.allowed ? null : result.reason;
  };

  return { can, canOnTemplate, getBlockReason, isAdmin };
}

// ─── Clone Template ───

export function useCloneTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      source: GovernedTemplateRow;
      options: CloneOptions;
    }) => {
      const payload = buildClonePayload(params.source, params.options);

      const { data, error } = await (supabase as any)
        .from('ia_audit_plan_templates')
        .insert({
          template_name: payload.template_name,
          template_key: payload.template_key,
          description: payload.description,
          is_system: false,
          is_active: true,
          is_house_default: false,
          status: 'draft',
          version: 1,
          cloned_from_id: payload.cloned_from_id,
          cloned_from_name: payload.cloned_from_name,
          config_json: payload.config_json,
          created_by: payload.created_by,
          updated_by: payload.updated_by,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(`Template "${vars.options.newName}" created from "${vars.source.template_name}"`);
    },
    onError: (err: any) => {
      toast.error('Failed to clone template', { description: err.message });
    },
  });
}

// ─── Update Template Config ───

export function useUpdateTemplateConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      templateId: string;
      configJson: Record<string, any>;
      updatedBy: string;
      currentVersion: number;
    }) => {
      const { data, error } = await (supabase as any)
        .from('ia_audit_plan_templates')
        .update({
          config_json: params.configJson,
          version: bumpVersion(params.currentVersion),
          updated_by: params.updatedBy,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.templateId)
        .eq('is_system', false) // safety guard
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Template updated');
    },
    onError: (err: any) => {
      toast.error('Failed to update template', { description: err.message });
    },
  });
}

// ─── Change Template Status ───

export function useChangeTemplateStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      templateId: string;
      currentStatus: TemplateStatus;
      newStatus: TemplateStatus;
      updatedBy: string;
    }) => {
      if (!isValidStatusTransition(params.currentStatus, params.newStatus)) {
        throw new Error(
          `Invalid transition: ${getStatusLabel(params.currentStatus)} → ${getStatusLabel(params.newStatus)}`
        );
      }

      const { data, error } = await (supabase as any)
        .from('ia_audit_plan_templates')
        .update({
          status: params.newStatus,
          updated_by: params.updatedBy,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.templateId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(`Template ${getStatusLabel(vars.newStatus).toLowerCase()}`);
    },
    onError: (err: any) => {
      toast.error('Status change failed', { description: err.message });
    },
  });
}

// ─── Set House Default ───

export function useSetHouseDefault() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      templateId: string;
      updatedBy: string;
    }) => {
      // Unset current default(s)
      await (supabase as any)
        .from('ia_audit_plan_templates')
        .update({ is_house_default: false, updated_at: new Date().toISOString() })
        .eq('is_house_default', true);

      // Set new default
      const { data, error } = await (supabase as any)
        .from('ia_audit_plan_templates')
        .update({
          is_house_default: true,
          updated_by: params.updatedBy,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.templateId)
        .eq('status', 'published') // safety: only published templates
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('House default template updated');
    },
    onError: (err: any) => {
      toast.error('Failed to set default', { description: err.message });
    },
  });
}

// ─── Delete Template ───

export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { templateId: string }) => {
      const { error } = await (supabase as any)
        .from('ia_audit_plan_templates')
        .delete()
        .eq('id', params.templateId)
        .eq('is_system', false) // safety guard
        .neq('is_house_default', true); // safety guard

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Template deleted');
    },
    onError: (err: any) => {
      toast.error('Failed to delete template', { description: err.message });
    },
  });
}
