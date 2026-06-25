import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type MatterRow = {
  id: string;
  matter_no: string;
  title: string;
  category: string;
  origin: string;
  status: string;
  stage: string | null;
  priority: string | null;
  assigned_user_code: string | null;
  current_workbasket_id: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
};

export function useMatterTypes() {
  return useQuery({
    queryKey: ['la', 'matter_types'],
    staleTime: 300_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('la_matter_type' as any)
        .select('id, code, display_name, category, requires_dms, sort_order, is_active')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    },
  });
}

export function useWorkbaskets() {
  return useQuery({
    queryKey: ['la', 'workbaskets'],
    staleTime: 300_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('la_workbasket' as any)
        .select('id, code, display_name, is_team, is_active, sort_order')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    },
  });
}

export type MatterFilters = {
  search?: string;
  status?: string;
  category?: string;
  workbasket_id?: string;
};

export function useMatters(filters: MatterFilters = {}) {
  return useQuery({
    queryKey: ['la', 'matters', filters],
    staleTime: 15_000,
    queryFn: async () => {
      let q = supabase
        .from('la_matter' as any)
        .select(
          'id, matter_no, title, category, origin, status, stage, priority, assigned_user_code, current_workbasket_id, due_date, created_at, updated_at'
        )
        .order('updated_at', { ascending: false })
        .range(0, 199);
      if (filters.status) q = q.eq('status', filters.status);
      if (filters.category) q = q.eq('category', filters.category);
      if (filters.workbasket_id) q = q.eq('current_workbasket_id', filters.workbasket_id);
      if (filters.search && filters.search.trim()) {
        const s = filters.search.trim();
        q = q.or(`matter_no.ilike.%${s}%,title.ilike.%${s}%`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as MatterRow[];
    },
  });
}

export function useMatter(id?: string) {
  return useQuery({
    enabled: !!id,
    queryKey: ['la', 'matter', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('la_matter' as any)
        .select('*')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });
}

export function useMatterChildren(matterId?: string) {
  const parties = useQuery({
    enabled: !!matterId,
    queryKey: ['la', 'matter-parties', matterId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('la_matter_party' as any)
        .select('*')
        .eq('matter_id', matterId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    },
  });
  const activity = useQuery({
    enabled: !!matterId,
    queryKey: ['la', 'matter-activity', matterId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('la_matter_activity' as any)
        .select('*')
        .eq('matter_id', matterId!)
        .order('performed_at', { ascending: false })
        .range(0, 99);
      if (error) throw error;
      return (data || []) as any[];
    },
  });
  const documents = useQuery({
    enabled: !!matterId,
    queryKey: ['la', 'matter-documents', matterId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('la_matter_document' as any)
        .select('*')
        .eq('matter_id', matterId!)
        .eq('is_active', true)
        .order('uploaded_at', { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });
  return { parties, activity, documents };
}

export type CreateMatterInput = {
  title: string;
  description?: string | null;
  matter_type_id?: string | null;
  category: string;
  origin: string;
  priority?: string;
  due_date?: string | null;
  current_workbasket_id?: string | null;
  source_module?: string | null;
  source_ref_no?: string | null;
  created_by?: string | null;
};

function genMatterNo() {
  const y = new Date().getFullYear();
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `LA-${y}-${rand}`;
}

export function useCreateMatter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateMatterInput) => {
      const payload = {
        ...input,
        matter_no: genMatterNo(),
        status: 'DRAFT',
        priority: input.priority || 'NORMAL',
      };
      const { data, error } = await supabase
        .from('la_matter' as any)
        .insert(payload as any)
        .select()
        .single();
      if (error) throw error;
      // log activity (fire-and-forget)
      supabase
        .from('la_matter_activity' as any)
        .insert({
          matter_id: (data as any).id,
          activity_type: 'CREATED',
          title: 'Matter created',
          performed_by_user_code: input.created_by ?? null,
        } as any)
        .then(() => {});
      return data as any;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['la', 'matters'] });
    },
  });
}

export function useUpdateMatterStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; status: string; user_code?: string | null }) => {
      const patch: any = { status: args.status, updated_by: args.user_code ?? null };
      if (args.status === 'SUBMITTED') {
        patch.submitted_at = new Date().toISOString();
        patch.submitted_by_user_code = args.user_code ?? null;
      }
      if (args.status === 'ACCEPTED') {
        patch.accepted_at = new Date().toISOString();
        patch.accepted_by_user_code = args.user_code ?? null;
      }
      if (args.status === 'CLOSED') {
        patch.closed_at = new Date().toISOString();
      }
      const { data, error } = await supabase
        .from('la_matter' as any)
        .update(patch)
        .eq('id', args.id)
        .select()
        .single();
      if (error) throw error;
      supabase
        .from('la_matter_activity' as any)
        .insert({
          matter_id: args.id,
          activity_type: 'STATUS_CHANGE',
          title: `Status changed to ${args.status}`,
          performed_by_user_code: args.user_code ?? null,
        } as any)
        .then(() => {});
      return data as any;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['la', 'matters'] });
      qc.invalidateQueries({ queryKey: ['la', 'matter', vars.id] });
      qc.invalidateQueries({ queryKey: ['la', 'matter-activity', vars.id] });
    },
  });
}
