import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EmployerRelationship {
  id: string;
  parent_employer_id: string;
  child_employer_id: string;
  relationship_type: string;
  effective_from: string;
  effective_to: string | null;
  is_active: boolean;
  consolidate_compliance: boolean;
  consolidate_financials: boolean;
  verification_status: string;
  verified_by: string | null;
  verified_at: string | null;
  source_reference: string | null;
  description: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
}

export interface EmployerGroup {
  id: string;
  group_name: string;
  group_code: string | null;
  description: string | null;
  territory: string | null;
  sector: string | null;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
}

export interface GroupMembership {
  id: string;
  group_id: string;
  employer_id: string;
  role: string;
  effective_from: string;
  effective_to: string | null;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
}

export function useEmployerRelationships(employerId?: string) {
  return useQuery({
    queryKey: ['ce-employer-relationships', employerId],
    queryFn: async () => {
      let query = supabase
        .from('ce_employer_relationships')
        .select('*')
        .order('created_at', { ascending: false });

      if (employerId) {
        query = query.or(`parent_employer_id.eq.${employerId},child_employer_id.eq.${employerId}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as EmployerRelationship[];
    },
    enabled: employerId !== undefined,
  });
}

export function useEmployerHierarchyView(employerId?: string) {
  return useQuery({
    queryKey: ['ce-employer-hierarchy-view', employerId],
    queryFn: async () => {
      let query = supabase
        .from('ce_employer_hierarchy_view')
        .select('*');

      if (employerId) {
        query = query.or(`source_employer_id.eq.${employerId},target_employer_id.eq.${employerId}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: employerId !== undefined,
  });
}

export function useEmployerGroups() {
  return useQuery({
    queryKey: ['ce-employer-groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ce_employer_groups')
        .select('*')
        .order('group_name');
      if (error) throw error;
      return data as EmployerGroup[];
    },
  });
}

export function useEmployerGroupSummary() {
  return useQuery({
    queryKey: ['ce-employer-group-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ce_employer_group_summary_view')
        .select('*');
      if (error) throw error;
      return data;
    },
  });
}

export function useGroupMemberships(groupId?: string) {
  return useQuery({
    queryKey: ['ce-group-memberships', groupId],
    queryFn: async () => {
      let query = supabase
        .from('ce_employer_group_membership')
        .select('*')
        .order('created_at', { ascending: false });

      if (groupId) {
        query = query.eq('group_id', groupId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as GroupMembership[];
    },
    enabled: groupId !== undefined,
  });
}

export function useCreateRelationship() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rel: Partial<EmployerRelationship>) => {
      const { data, error } = await supabase
        .from('ce_employer_relationships')
        .insert(rel as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ce-employer-relationships'] });
      qc.invalidateQueries({ queryKey: ['ce-employer-hierarchy-view'] });
      toast.success('Relationship created');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (group: Partial<EmployerGroup>) => {
      const { data, error } = await supabase
        .from('ce_employer_groups')
        .insert(group as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ce-employer-groups'] });
      qc.invalidateQueries({ queryKey: ['ce-employer-group-summary'] });
      toast.success('Group created');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useAddGroupMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (membership: Partial<GroupMembership>) => {
      const { data, error } = await supabase
        .from('ce_employer_group_membership')
        .insert(membership as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ce-group-memberships'] });
      qc.invalidateQueries({ queryKey: ['ce-employer-group-summary'] });
      toast.success('Member added to group');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
