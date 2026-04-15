import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface KBFieldHelp {
  id: string;
  module_key: string;
  screen_key: string;
  component_key: string | null;
  field_key: string;
  field_label: string;
  short_help: string;
  full_help: string | null;
  example_value: string | null;
  source_type: string | null;
  impact_of_change: string | null;
  related_rules: string[] | null;
  related_article_id: string | null;
}

/**
 * Fetches all field help for a screen in one batch, cached for the session.
 * Individual field lookups use the cached map.
 */
export function useFieldHelp(moduleKey: string, screenKey: string) {
  const query = useQuery({
    queryKey: ['kb-field-help', moduleKey, screenKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kb_field_help')
        .select('*')
        .eq('module_key', moduleKey)
        .eq('screen_key', screenKey)
        .eq('status', 'published');
      if (error) throw error;
      return (data ?? []) as KBFieldHelp[];
    },
    staleTime: 10 * 60 * 1000,
  });

  const fieldHelpMap = new Map<string, KBFieldHelp>();
  query.data?.forEach(fh => fieldHelpMap.set(fh.field_key, fh));

  return {
    allFields: query.data ?? [],
    fieldHelpMap,
    getFieldHelp: (fieldKey: string) => fieldHelpMap.get(fieldKey) ?? null,
    isLoading: query.isLoading,
  };
}
