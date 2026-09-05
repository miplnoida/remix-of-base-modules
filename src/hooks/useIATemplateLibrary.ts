/**
 * Internal Audit Template Library — front-door data access.
 *
 * IMPORTANT ARCHITECTURE RULE:
 * This hook does NOT own any template storage. It reads the canonical
 * specialist stores (programmes/procedures, preparation checklists, audit plan
 * templates, document/report template settings, section library) and exposes
 * governed lifecycle RPCs for the programme family only. Communications remain
 * owned by Omni-Comms and are only linked to, never duplicated here.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useInternalAuditPermissions } from '@/hooks/useInternalAuditPermissions';

export type TemplateFamilyKey =
  | 'programme'
  | 'checklist'
  | 'audit_plan'
  | 'document'
  | 'section'
  | 'communication';

export interface LibraryItem {
  id: string;
  family: TemplateFamilyKey;
  name: string;
  code?: string | null;
  area?: string | null;
  status: string;
  version?: number | null;
  isDefault?: boolean;
  itemCount?: number | null;
  updatedAt?: string | null;
  /** Where the specialist editor for this item lives. */
  editorPath: string;
  raw: any;
}

/** Capability gate matching the server-side `ia_can_manage_templates`. */
export function useTemplateLibraryPermissions() {
  const { isAdmin, isLoading, has } = useInternalAuditPermissions();
  const canManage =
    isAdmin || has('audit_template_library', 'edit') || has('audit_configuration', 'configure');
  return {
    isLoading,
    canView: isAdmin || has('internal_audit', 'view') || has('audit_programs', 'view') || canManage,
    canManage,
    canApprove:
      isAdmin || has('audit_template_library', 'approve') || has('audit_configuration', 'configure'),
  };
}

export function useTemplateLibrary() {
  return useQuery({
    queryKey: ['ia-template-library'],
    queryFn: async (): Promise<LibraryItem[]> => {
      const [programmes, checklists, plans, docs, sections] = await Promise.all([
        supabase
          .from('ia_audit_programs' as any)
          .select('*, ia_audit_procedures(count)')
          .order('program_name'),
        supabase
          .from('ia_checklist_templates' as any)
          .select('*, ia_checklist_template_items(count)')
          .order('template_name'),
        supabase.from('ia_audit_plan_templates' as any).select('*').order('template_name'),
        supabase.from('ia_document_template_settings' as any).select('*'),
        supabase.from('ia_document_section_library' as any).select('*').order('section_title'),
      ]);

      const items: LibraryItem[] = [];

      for (const p of ((programmes.data ?? []) as any[])) {
        items.push({
          id: p.id,
          family: 'programme',
          name: p.program_name,
          code: p.program_code,
          area: p.audit_area,
          status: p.status ?? 'Draft',
          version: p.version ?? 1,
          isDefault: !!p.is_default,
          itemCount: p.ia_audit_procedures?.[0]?.count ?? 0,
          updatedAt: p.updated_at,
          editorPath: '/audit/programs',
          raw: p,
        });
      }

      for (const c of ((checklists.data ?? []) as any[])) {
        items.push({
          id: c.id,
          family: 'checklist',
          name: c.template_name,
          code: c.template_code ?? null,
          area: c.audit_area ?? c.category ?? null,
          status: c.is_active === false ? 'Inactive' : 'Active',
          itemCount: c.ia_checklist_template_items?.[0]?.count ?? 0,
          updatedAt: c.updated_at,
          editorPath: '/audit/config?tab=checklists',
          raw: c,
        });
      }

      for (const t of ((plans.data ?? []) as any[])) {
        items.push({
          id: t.id,
          family: 'audit_plan',
          name: t.template_name,
          code: t.template_code ?? null,
          area: null,
          status: t.status ?? (t.is_active === false ? 'Inactive' : 'Active'),
          version: t.version ?? 1,
          isDefault: !!t.is_default,
          updatedAt: t.updated_at,
          editorPath: '/audit/document-templates?tab=audit_plan',
          raw: t,
        });
      }

      for (const d of ((docs.data ?? []) as any[])) {
        items.push({
          id: d.id,
          family: 'document',
          name: String(d.template_type ?? 'Document Template').replace(/_/g, ' '),
          code: d.template_type,
          status: 'Configured',
          updatedAt: d.updated_at,
          editorPath:
            d.template_type === 'audit_plan'
              ? '/audit/document-templates?tab=audit_plan'
              : d.template_type === 'mgmt_response'
                ? '/audit/document-templates?tab=mgmt_response'
                : '/audit/document-templates?tab=audit_report',
          raw: d,
        });
      }

      for (const s of ((sections.data ?? []) as any[])) {
        items.push({
          id: s.id,
          family: 'section',
          name: s.section_title ?? s.section_key,
          code: s.section_key,
          status: s.is_active === false ? 'Inactive' : 'Active',
          updatedAt: s.updated_at,
          editorPath: '/audit/document-templates?tab=sections',
          raw: s,
        });
      }

      return items;
    },
  });
}

export function useProgrammeUsage(programId?: string) {
  return useQuery({
    queryKey: ['ia-programme-usage', programId],
    enabled: !!programId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('ia_programme_usage' as any, {
        p_program_id: programId,
      });
      if (error) throw error;
      const res = data as any;
      if (!res?.success) throw new Error(res?.error ?? 'Unable to load usage');
      return (res.usage ?? []) as any[];
    },
  });
}

export function useProgrammeProcedures(programId?: string) {
  return useQuery({
    queryKey: ['ia-programme-procedures', programId],
    enabled: !!programId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ia_audit_procedures' as any)
        .select('*')
        .eq('audit_program_id', programId!)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

function unwrap(data: any) {
  if (!data?.success) throw new Error(data?.error ?? 'Action failed');
  return data;
}

/** Governed lifecycle actions for the programme template family. */
const PROGRAMME_ACTIONS = {
  createVersion: {
    fn: 'ia_create_programme_version',
    args: (v: any) => ({ p_program_id: v.programId, p_change_summary: v.changeSummary ?? null }),
    msg: 'New draft version created',
  },
  clone: {
    fn: 'ia_clone_programme',
    args: (v: any) => ({
      p_program_id: v.programId,
      p_new_name: v.name,
      p_new_code: v.code,
      p_audit_area: v.auditArea ?? null,
    }),
    msg: 'Template cloned',
  },
  approve: {
    fn: 'ia_approve_programme',
    args: (v: any) => ({ p_program_id: v.programId }),
    msg: 'Template approved',
  },
  retire: {
    fn: 'ia_retire_programme',
    args: (v: any) => ({ p_program_id: v.programId, p_reason: v.reason ?? null }),
    msg: 'Template retired',
  },
  setDefault: {
    fn: 'ia_set_default_programme',
    args: (v: any) => ({ p_program_id: v.programId }),
    msg: 'Default template updated',
  },
  deleteDraft: {
    fn: 'ia_delete_programme_draft',
    args: (v: any) => ({ p_program_id: v.programId }),
    msg: 'Draft deleted',
  },
  createFromAudit: {
    fn: 'ia_create_programme_from_engagement',
    args: (v: any) => ({
      p_engagement_id: v.engagementId,
      p_new_name: v.name,
      p_new_code: v.code,
      p_audit_area: v.auditArea ?? null,
    }),
    msg: 'Template created from audit',
  },
} as const;

export type ProgrammeActionKey = keyof typeof PROGRAMME_ACTIONS;

export function useProgrammeTemplateActions() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ action, ...vars }: { action: ProgrammeActionKey } & Record<string, any>) => {
      const def = PROGRAMME_ACTIONS[action];
      const { data, error } = await supabase.rpc(def.fn as any, def.args(vars));
      if (error) throw error;
      return { ...unwrap(data), _msg: def.msg };
    },
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ['ia-template-library'] });
      qc.invalidateQueries({ queryKey: ['ia-programme-usage'] });
      qc.invalidateQueries({ queryKey: ['ia-programme-procedures'] });
      toast({ title: res._msg });
    },
    onError: (e: any) =>
      toast({ title: 'Action failed', description: e.message, variant: 'destructive' }),
  });
}

/** Completed / in-progress audits that can be harvested into a reusable template. */
export function useHarvestableEngagements() {
  return useQuery({
    queryKey: ['ia-harvestable-engagements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ia_engagement_programmes' as any)
        .select('engagement_id, programme_name, status, created_at, ia_audit_engagements(engagement_name, engagement_code, status)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}
