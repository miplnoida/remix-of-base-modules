import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { HelpButton } from './HelpButton';
import type { KBArticle } from '@/hooks/useScreenHelp';

interface Props {
  screenKey: string;
  variant?: 'icon' | 'button';
  className?: string;
}

/**
 * Lightweight contextual-help trigger for Compliance screens.
 * Fetches the published kb_articles entry for module_key='compliance' + screenKey
 * and renders the existing HelpButton sheet. Renders nothing if no help topic exists.
 */
export function ComplianceHelpButton({ screenKey, variant = 'icon', className }: Props) {
  const { data: article } = useQuery({
    queryKey: ['ce-help', screenKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kb_articles')
        .select('*')
        .eq('module_key', 'compliance')
        .eq('screen_key', screenKey)
        .eq('status', 'published')
        .order('sort_order')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as KBArticle | null;
    },
    staleTime: 5 * 60 * 1000,
  });

  return <HelpButton article={article ?? null} variant={variant} className={className} />;
}
