import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface KBArticle {
  id: string;
  module_key: string;
  submodule_key: string | null;
  screen_key: string | null;
  article_type: string;
  title: string;
  summary: string | null;
  content: string;
  audience: string | null;
  tags: string[] | null;
  version: number;
  sort_order: number;
  updated_at: string;
  updated_by: string | null;
}

export interface KBFAQ {
  id: string;
  module_key: string;
  screen_key: string | null;
  question: string;
  answer: string;
  tags: string[] | null;
  audience: string | null;
  related_field_key: string | null;
  sort_order: number;
}

export interface KBProcessGuide {
  id: string;
  module_key: string;
  process_name: string;
  trigger_description: string | null;
  steps: any[];
  roles_involved: string[] | null;
  expected_outcome: string | null;
  estimated_duration: string | null;
  prerequisites: string[] | null;
  sort_order: number;
}

export function useScreenHelp(moduleKey: string, screenKey: string) {
  const articlesQuery = useQuery({
    queryKey: ['kb-articles', moduleKey, screenKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kb_articles')
        .select('*')
        .eq('module_key', moduleKey)
        .eq('screen_key', screenKey)
        .eq('status', 'published')
        .order('sort_order');
      if (error) throw error;
      return (data ?? []) as KBArticle[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const faqsQuery = useQuery({
    queryKey: ['kb-faqs', moduleKey, screenKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kb_faqs')
        .select('*')
        .eq('module_key', moduleKey)
        .eq('screen_key', screenKey)
        .eq('status', 'published')
        .order('sort_order');
      if (error) throw error;
      return (data ?? []) as KBFAQ[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const guidesQuery = useQuery({
    queryKey: ['kb-guides', moduleKey, screenKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kb_process_guides')
        .select('*')
        .eq('module_key', moduleKey)
        .eq('status', 'published')
        .order('sort_order');
      if (error) throw error;
      return (data ?? []) as KBProcessGuide[];
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    articles: articlesQuery.data ?? [],
    article: articlesQuery.data?.[0] ?? null,
    faqs: faqsQuery.data ?? [],
    processGuides: guidesQuery.data ?? [],
    isLoading: articlesQuery.isLoading || faqsQuery.isLoading || guidesQuery.isLoading,
  };
}

export function useModuleHelp(moduleKey: string) {
  return useQuery({
    queryKey: ['kb-module-overview', moduleKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kb_articles')
        .select('*')
        .eq('module_key', moduleKey)
        .eq('article_type', 'module_overview')
        .eq('status', 'published')
        .maybeSingle();
      if (error) throw error;
      return data as KBArticle | null;
    },
    staleTime: 10 * 60 * 1000,
  });
}
