import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, AlertTriangle, UserPlus, FileText, DollarSign, Shield, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchRecentActivity } from '@/services/dashboardDataService';
import { formatDistanceToNow } from 'date-fns';

const iconMap: Record<string, { icon: LucideIcon; color: string }> = {
  violation: { icon: AlertTriangle, color: 'text-destructive' },
  inspection: { icon: Shield, color: 'text-primary' },
  registration: { icon: UserPlus, color: 'text-primary' },
  payment: { icon: DollarSign, color: 'text-secondary' },
  claim: { icon: FileText, color: 'text-primary' },
};

export function RecentSystemActivity() {
  const { data: activities, isLoading } = useQuery({
    queryKey: ['dashboard_recent_activity'],
    queryFn: fetchRecentActivity,
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <Activity className="h-5 w-5 text-primary" />
          Recent System Activity
        </CardTitle>
        <p className="text-xs text-muted-foreground">Latest events across all modules</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[200px] flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !activities || activities.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
            No recent activity
          </div>
        ) : (
          <div className="space-y-1">
            {activities.map((a, i) => {
              const mapping = iconMap[a.activity_type] ?? iconMap.violation;
              const Icon = mapping.icon;
              const timeAgo = a.occurred_at
                ? formatDistanceToNow(new Date(a.occurred_at), { addSuffix: true })
                : '';
              return (
                <div
                  key={i}
                  className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/60 transition-colors"
                >
                  <div className="mt-0.5">
                    <Icon className={cn('h-4 w-4', mapping.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground leading-snug">{a.action}</p>
                    <p className="text-xs text-muted-foreground leading-snug mt-0.5 truncate">{a.entity}</p>
                  </div>
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap pt-0.5">{timeAgo}</span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
