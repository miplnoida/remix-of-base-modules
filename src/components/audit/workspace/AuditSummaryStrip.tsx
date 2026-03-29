import React from 'react';
import { Building2, User, Calendar, Shield, AlertTriangle, CheckCircle, Clock, FileWarning } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDateForDisplay } from '@/lib/format-config';

interface AuditSummaryStripProps {
  department?: string;
  leadAuditor?: string;
  startDate?: string;
  endDate?: string;
  riskRating?: string;
  findingsCount?: number;
  openFindingsCount?: number;
  overdueActions?: number;
  pendingResponses?: number;
  className?: string;
}

function StripItem({ icon: Icon, label, value, variant = 'default' }: {
  icon: any; label: string; value: string | number; variant?: 'default' | 'warning' | 'error' | 'success';
}) {
  const iconColor = {
    default: 'text-muted-foreground',
    warning: 'text-amber-500',
    error: 'text-destructive',
    success: 'text-primary',
  }[variant];

  return (
    <div className="flex items-center gap-2 min-w-0">
      <Icon className={cn('h-3.5 w-3.5 shrink-0', iconColor)} />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
        <p className="text-xs font-semibold truncate">{value || '—'}</p>
      </div>
    </div>
  );
}

export function AuditSummaryStrip({
  department, leadAuditor, startDate, endDate, riskRating,
  findingsCount = 0, openFindingsCount = 0, overdueActions = 0, pendingResponses = 0,
  className
}: AuditSummaryStripProps) {
  return (
    <div className={cn(
      'flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 rounded-lg border bg-card/50',
      className
    )}>
      <StripItem icon={Building2} label="Department" value={department || '—'} />
      <div className="h-6 w-px bg-border hidden sm:block" />
      <StripItem icon={User} label="Lead Auditor" value={leadAuditor || '—'} />
      <div className="h-6 w-px bg-border hidden sm:block" />
      <StripItem icon={Calendar} label="Period" value={
        startDate ? `${formatDateForDisplay(startDate)} – ${endDate ? formatDateForDisplay(endDate) : '...'}` : '—'
      } />
      <div className="h-6 w-px bg-border hidden sm:block" />
      <StripItem icon={Shield} label="Risk" value={riskRating || 'Medium'} variant={
        riskRating === 'Critical' || riskRating === 'High' ? 'error' : riskRating === 'Medium' ? 'warning' : 'default'
      } />
      <div className="h-6 w-px bg-border hidden sm:block" />
      <StripItem icon={FileWarning} label="Findings" value={`${findingsCount} (${openFindingsCount} open)`}
        variant={openFindingsCount > 0 ? 'warning' : 'success'} />
      {overdueActions > 0 && (
        <>
          <div className="h-6 w-px bg-border hidden sm:block" />
          <StripItem icon={AlertTriangle} label="Overdue" value={overdueActions} variant="error" />
        </>
      )}
      {pendingResponses > 0 && (
        <>
          <div className="h-6 w-px bg-border hidden sm:block" />
          <StripItem icon={Clock} label="Pending Responses" value={pendingResponses} variant="warning" />
        </>
      )}
    </div>
  );
}
