import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useEngagementFilter() {
  const [searchParams, setSearchParams] = useSearchParams();
  const engagementId = searchParams.get('engagement_id') || undefined;

  const { data: engagement } = useQuery({
    queryKey: ['engagement_filter_info', engagementId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ia_audit_engagements' as any)
        .select('id, engagement_name, engagement_code')
        .eq('id', engagementId!)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!engagementId,
  });

  const clearFilter = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('engagement_id');
    setSearchParams(newParams);
  };

  return { engagementId, engagement, clearFilter };
}

export function EngagementFilterBanner() {
  const navigate = useNavigate();
  const { engagementId, engagement, clearFilter } = useEngagementFilter();

  if (!engagementId) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-primary/10 border border-primary/20">
      <Filter className="h-4 w-4 text-primary shrink-0" />
      <p className="text-sm flex-1">
        Filtered by engagement:{' '}
        <button
          onClick={() => navigate(`/audit/engagements/${engagementId}`)}
          className="font-semibold text-primary hover:underline"
        >
          {engagement?.engagement_name || engagement?.engagement_code || engagementId.slice(0, 8)}
        </button>
      </p>
      <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => navigate(`/audit/engagements/${engagementId}`)}>
        <ArrowLeft className="h-3 w-3 mr-1" />Back to Engagement
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={clearFilter}>
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}
