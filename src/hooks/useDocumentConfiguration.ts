import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserCode } from '@/hooks/useUserCode';
import { toast } from 'sonner';

// ── Types ──
export interface DocCategory {
  id: string;
  module_id: string;
  category_name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
}

export interface DocConfig {
  id: string;
  category_id: string;
  document_name: string;
  description?: string | null;
  is_required: boolean;
  allowed_extensions: string[];
  max_file_size_mb: number;
  supportive_docs_rule: 'all_required' | 'any_one_required';
  requires_supportive_doc: boolean;
  supportive_doc_description: string | null;
  supportive_allowed_extensions: string[] | null;
  supportive_max_file_size_mb: number | null;
  allow_alternate_doc: boolean;
  alternate_doc_name: string | null;
  alternate_allowed_extensions: string[] | null;
  alternate_max_file_size_mb: number | null;
  alternate_requires_supportive: boolean;
  alternate_supportive_description: string | null;
  alternate_supportive_allowed_extensions: string[] | null;
  alternate_supportive_max_file_size_mb: number | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
}

export interface ChildDoc {
  id: string;
  parent_config_id: string;
  parent_alternate_id: string | null;
  doc_type: 'supportive' | 'alternate';
  document_name: string;
  description: string | null;
  is_required: boolean;
  allowed_extensions: string[];
  max_file_size_mb: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
}

// ── Fetch categories for a module ──
export function useDocCategories(moduleId: string | null) {
  return useQuery({
    queryKey: ['doc-categories', moduleId],
    queryFn: async () => {
      if (!moduleId) return [];
      const { data, error } = await supabase
        .from('module_doc_categories')
        .select('*')
        .eq('module_id', moduleId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as DocCategory[];
    },
    enabled: !!moduleId,
  });
}

// ── Fetch documents for a category ──
export function useDocConfigs(categoryId: string | null) {
  return useQuery({
    queryKey: ['doc-configs', categoryId],
    queryFn: async () => {
      if (!categoryId) return [];
      const { data, error } = await supabase
        .from('module_doc_configs')
        .select('*')
        .eq('category_id', categoryId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as DocConfig[];
    },
    enabled: !!categoryId,
  });
}

// ── Fetch all documents for all categories of a module (bulk) ──
export function useAllDocConfigsForModule(moduleId: string | null) {
  return useQuery({
    queryKey: ['doc-configs-all', moduleId],
    queryFn: async () => {
      if (!moduleId) return [];
      const { data: categories } = await supabase
        .from('module_doc_categories')
        .select('id')
        .eq('module_id', moduleId);
      if (!categories || categories.length === 0) return [];
      const catIds = categories.map(c => c.id);
      const { data, error } = await supabase
        .from('module_doc_configs')
        .select('*')
        .in('category_id', catIds)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as DocConfig[];
    },
    enabled: !!moduleId,
  });
}

// ── Fetch child docs for a config ──
export function useChildDocs(configId: string | null) {
  return useQuery({
    queryKey: ['child-docs', configId],
    queryFn: async () => {
      if (!configId) return [];
      const { data, error } = await supabase
        .from('module_doc_child_docs')
        .select('*')
        .eq('parent_config_id', configId)
        .order('doc_type', { ascending: true })
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as ChildDoc[];
    },
    enabled: !!configId,
  });
}

// ── Fetch all child docs for a module (bulk) ──
export function useAllChildDocsForModule(moduleId: string | null) {
  return useQuery({
    queryKey: ['child-docs-all', moduleId],
    queryFn: async () => {
      if (!moduleId) return [];
      const { data: categories } = await supabase
        .from('module_doc_categories')
        .select('id')
        .eq('module_id', moduleId);
      if (!categories || categories.length === 0) return [];
      const catIds = categories.map(c => c.id);
      const { data: configs } = await supabase
        .from('module_doc_configs')
        .select('id')
        .in('category_id', catIds);
      if (!configs || configs.length === 0) return [];
      const configIds = configs.map(c => c.id);
      const { data, error } = await supabase
        .from('module_doc_child_docs')
        .select('*')
        .in('parent_config_id', configIds)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as ChildDoc[];
    },
    enabled: !!moduleId,
  });
}

// ── Category Mutations ──
export function useCategoryMutations(moduleId: string | null) {
  const qc = useQueryClient();
  const { userCode } = useUserCode();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['doc-categories', moduleId] });
    qc.invalidateQueries({ queryKey: ['doc-configs-all', moduleId] });
    qc.invalidateQueries({ queryKey: ['child-docs-all', moduleId] });
  };

  const createCategory = useMutation({
    mutationKey: ['Admin', 'document_config', 'create'],
    mutationFn: async (payload: { category_name: string; description?: string; sort_order?: number }) => {
      if (!moduleId) throw new Error('Module not selected');
      const { data, error } = await supabase
        .from('module_doc_categories')
        .insert({
          module_id: moduleId,
          category_name: payload.category_name,
          description: payload.description || null,
          sort_order: payload.sort_order || 0,
          created_by: userCode || 'SYSTEM',
          updated_by: userCode || 'SYSTEM',
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { invalidate(); toast.success('Category created'); },
    onError: (e: Error) => {
      const msg = e.message?.includes('duplicate') ? 'Category name already exists for this module' : e.message;
      toast.error(msg);
    },
  });

  const updateCategory = useMutation({
    mutationKey: ['Admin', 'document_config', 'delete'],
    mutationFn: async (payload: { id: string; category_name?: string; description?: string; sort_order?: number; is_active?: boolean }) => {
      const { id, ...rest } = payload;
      const { data, error } = await supabase
        .from('module_doc_categories')
        .update({ ...rest, updated_by: userCode || 'SYSTEM', updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { invalidate(); toast.success('Category updated'); },
    onError: (e: Error) => {
      const msg = e.message?.includes('duplicate') ? 'Category name already exists for this module' : e.message;
      toast.error(msg);
    },
  });

  const deleteCategory = useMutation({
    mutationKey: ['Admin', 'document_config', 'delete'],
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('module_doc_categories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Category deleted'); },
    onError: (e: Error) => toast.error(e.message),
  });

  return { createCategory, updateCategory, deleteCategory };
}

// ── Document Mutations ──
export function useDocConfigMutations(moduleId: string | null) {
  const qc = useQueryClient();
  const { userCode } = useUserCode();

  const invalidate = (categoryId?: string) => {
    if (categoryId) qc.invalidateQueries({ queryKey: ['doc-configs', categoryId] });
    qc.invalidateQueries({ queryKey: ['doc-configs-all', moduleId] });
  };

  const createDoc = useMutation({
    mutationKey: ['Admin', 'document_config', 'create'],
    mutationFn: async (payload: Omit<DocConfig, 'id' | 'created_at' | 'created_by' | 'updated_at' | 'updated_by'>) => {
      const { data, error } = await supabase
        .from('module_doc_configs')
        .insert({
          ...payload,
          created_by: userCode || 'SYSTEM',
          updated_by: userCode || 'SYSTEM',
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, v) => { invalidate(v.category_id); toast.success('Document added'); },
    onError: (e: Error) => {
      const msg = e.message?.includes('duplicate') ? 'Document name already exists in this category' : e.message;
      toast.error(msg);
    },
  });

  const updateDoc = useMutation({
    mutationKey: ['Admin', 'document_config', 'delete'],
    mutationFn: async (payload: Partial<DocConfig> & { id: string }) => {
      const { id, ...rest } = payload;
      const { data, error } = await supabase
        .from('module_doc_configs')
        .update({ ...rest, updated_by: userCode || 'SYSTEM', updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, v) => { invalidate(v.category_id); toast.success('Document updated'); },
    onError: (e: Error) => {
      const msg = e.message?.includes('duplicate') ? 'Document name already exists in this category' : e.message;
      toast.error(msg);
    },
  });

  const deleteDoc = useMutation({
    mutationKey: ['Admin', 'document_config', 'delete'],
    mutationFn: async (params: { id: string; category_id: string }) => {
      const { error } = await supabase.from('module_doc_configs').delete().eq('id', params.id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => { invalidate(v.category_id); toast.success('Document deleted'); },
    onError: (e: Error) => toast.error(e.message),
  });

  return { createDoc, updateDoc, deleteDoc };
}

// ── Child Document Mutations ──
export function useChildDocMutations(moduleId: string | null) {
  const qc = useQueryClient();
  const { userCode } = useUserCode();

  const invalidate = (configId?: string) => {
    if (configId) qc.invalidateQueries({ queryKey: ['child-docs', configId] });
    qc.invalidateQueries({ queryKey: ['child-docs-all', moduleId] });
  };

  const createChildDoc = useMutation({
    mutationKey: ['Admin', 'document_config', 'create'],
    mutationFn: async (payload: Omit<ChildDoc, 'id' | 'created_at' | 'created_by' | 'updated_at' | 'updated_by'>) => {
      const { data, error } = await supabase
        .from('module_doc_child_docs')
        .insert({
          ...payload,
          created_by: userCode || 'SYSTEM',
          updated_by: userCode || 'SYSTEM',
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, v) => { invalidate(v.parent_config_id); toast.success('Child document added'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateChildDoc = useMutation({
    mutationKey: ['Admin', 'document_config', 'create'],
    mutationFn: async (payload: Partial<ChildDoc> & { id: string; parent_config_id: string }) => {
      const { id, parent_config_id, ...rest } = payload;
      const { data, error } = await supabase
        .from('module_doc_child_docs')
        .update({ ...rest, updated_by: userCode || 'SYSTEM', updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, v) => { invalidate(v.parent_config_id); toast.success('Child document updated'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteChildDoc = useMutation({
    mutationKey: ['Admin', 'document_config', 'update'],
    mutationFn: async (params: { id: string; parent_config_id: string }) => {
      const { error } = await supabase.from('module_doc_child_docs').delete().eq('id', params.id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => { invalidate(v.parent_config_id); toast.success('Child document deleted'); },
    onError: (e: Error) => toast.error(e.message),
  });

  return { createChildDoc, updateChildDoc, deleteChildDoc };
}
