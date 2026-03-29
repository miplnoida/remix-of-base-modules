import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, User, FileText, CheckCircle2, Send, Edit } from 'lucide-react';

interface AuditReportVersionTimelineProps {
  reportId?: string | null;
}

// Static timeline for now - can be connected to an audit trail table later
const MOCK_VERSIONS = [
  { version: '1.0', status: 'Draft', date: '2026-03-15', user: 'Auditor', action: 'Created', icon: FileText },
  { version: '1.1', status: 'Draft', date: '2026-03-18', user: 'Auditor', action: 'Updated findings', icon: Edit },
  { version: '2.0', status: 'In Review', date: '2026-03-22', user: 'Auditor', action: 'Submitted for review', icon: Send },
  { version: '2.1', status: 'Approved', date: '2026-03-25', user: 'Manager', action: 'Approved', icon: CheckCircle2 },
];

export function AuditReportVersionTimeline({ reportId }: AuditReportVersionTimelineProps) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Version History</p>
      <div className="space-y-0">
        {MOCK_VERSIONS.map((v, i) => (
          <div key={i} className="flex gap-3 pb-4 relative">
            {/* Timeline connector */}
            {i < MOCK_VERSIONS.length - 1 && (
              <div className="absolute left-[11px] top-6 w-px h-full bg-border" />
            )}
            <div className="shrink-0 mt-0.5">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                <v.icon className="h-3 w-3 text-primary" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold">v{v.version}</span>
                <Badge variant="outline" className="text-[10px] h-4">{v.status}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{v.action}</p>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                <User className="h-2.5 w-2.5" /> {v.user}
                <Clock className="h-2.5 w-2.5 ml-1" /> {v.date}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
