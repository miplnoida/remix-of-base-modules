import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Clock, User, FileText, CheckCircle2, Send, Edit, AlertCircle } from 'lucide-react';
import { formatDateForDisplay } from '@/lib/format-config';

interface AuditReportVersionTimelineProps {
  reportId?: string | null;
}

const ACTION_ICONS: Record<string, React.ElementType> = {
  create: FileText,
  insert: FileText,
  update: Edit,
  status_change: Send,
  approve: CheckCircle2,
  issue: CheckCircle2,
};

const FALLBACK_VERSIONS = [
  { version: '1.0', status: 'Draft', date: '2026-03-15', user: 'Auditor', action: 'Created', icon: FileText },
  { version: '1.1', status: 'Draft', date: '2026-03-18', user: 'Auditor', action: 'Updated findings', icon: Edit },
  { version: '2.0', status: 'In Review', date: '2026-03-22', user: 'Auditor', action: 'Submitted for review', icon: Send },
  { version: '2.1', status: 'Approved', date: '2026-03-25', user: 'Manager', action: 'Approved', icon: CheckCircle2 },
];

export function AuditReportVersionTimeline({ reportId }: AuditReportVersionTimelineProps) {
  const { data: trailEntries = [], isLoading } = useQuery({
    queryKey: ['audit_report_trail', reportId],
    queryFn: async () => {
      if (!reportId) return [];
      const { data, error } = await supabase
        .from('system_audit_trail')
        .select('*')
        .eq('entity_type', 'ia_audit_reports')
        .eq('entity_id', reportId)
        .order('created_at', { ascending: true })
        .limit(20);
      if (error) return [];
      return data ?? [];
    },
    enabled: !!reportId,
  });

  const hasRealData = trailEntries.length > 0;
  const timelineItems = hasRealData
    ? trailEntries.map((entry: any, i: number) => {
        const IconComp = ACTION_ICONS[entry.action] || Edit;
        return {
          icon: IconComp,
          action: entry.action || 'Updated',
          user: entry.user_name || 'System',
          date: entry.created_at ? formatDateForDisplay(entry.created_at) : '—',
          detail: entry.after_value ? String(entry.after_value).slice(0, 80) : null,
        };
      })
    : FALLBACK_VERSIONS.map((v) => ({
        icon: v.icon,
        action: v.action,
        user: v.user,
        date: v.date,
        detail: `v${v.version} · ${v.status}`,
      }));

  if (isLoading) {
    return (
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Version History</p>
        <p className="text-xs text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Version History</p>
        {!hasRealData && (
          <Badge variant="outline" className="text-[9px] h-4">Sample</Badge>
        )}
      </div>
      <div className="space-y-0">
        {timelineItems.map((item, i) => (
          <div key={i} className="flex gap-3 pb-4 relative">
            {i < timelineItems.length - 1 && (
              <div className="absolute left-[11px] top-6 w-px h-full bg-border" />
            )}
            <div className="shrink-0 mt-0.5">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                <item.icon className="h-3 w-3 text-primary" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold capitalize">{item.action}</p>
              {item.detail && (
                <p className="text-[10px] text-muted-foreground truncate">{item.detail}</p>
              )}
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                <User className="h-2.5 w-2.5" /> {item.user}
                <Clock className="h-2.5 w-2.5 ml-1" /> {item.date}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
