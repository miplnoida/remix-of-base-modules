import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { RiskScoreBadge } from './RiskScoreBadge';

interface RiskHistoryEntry {
  id: string;
  previous_score: number | null;
  new_score: number;
  previous_band: string | null;
  new_band: string;
  calculated_at: string;
  calculated_by: string | null;
}

interface RiskHistoryTimelineProps {
  riskProfileId: string;
}

export function RiskHistoryTimeline({ riskProfileId }: RiskHistoryTimelineProps) {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ['ce_risk_score_history', riskProfileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ce_risk_score_history')
        .select('*')
        .eq('risk_profile_id', riskProfileId)
        .order('calculated_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []) as unknown as RiskHistoryEntry[];
    },
    enabled: !!riskProfileId,
  });

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  if (isLoading) {
    return <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  }

  if (history.length === 0) {
    return <div className="text-sm text-muted-foreground text-center py-4">No risk history available</div>;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Risk Score History</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {history.map((h) => {
          const delta = h.previous_score != null ? h.new_score - h.previous_score : 0;
          const TrendIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
          const trendColor = delta > 0 ? 'text-destructive' : delta < 0 ? 'text-green-600' : 'text-muted-foreground';

          return (
            <div key={h.id} className="flex items-center gap-3 text-sm border-b pb-2 last:border-0">
              <div className="flex-shrink-0 w-2 h-2 rounded-full bg-primary" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {h.previous_band && (
                    <>
                      <RiskScoreBadge riskBand={h.previous_band} score={h.previous_score} size="sm" />
                      <span className="text-muted-foreground">→</span>
                    </>
                  )}
                  <RiskScoreBadge riskBand={h.new_band} score={h.new_score} size="sm" />
                  {delta !== 0 && (
                    <span className={`flex items-center gap-0.5 text-xs font-medium ${trendColor}`}>
                      <TrendIcon className="h-3 w-3" />
                      {delta > 0 ? '+' : ''}{Math.round(delta)}
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {formatDate(h.calculated_at)}
                  {h.calculated_by && ` · ${h.calculated_by}`}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
