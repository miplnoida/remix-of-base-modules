import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { StatusBadge } from '@/components/common';
import { formatDateForDisplay } from '@/lib/format-config';
import { AlertTriangle, MessageSquare, CheckCircle2, User, CalendarDays, FileText, Link2 } from 'lucide-react';

interface AuditFindingCardProps {
  finding: any;
  index: number;
  responses?: any[];
  actions?: any[];
  compact?: boolean;
}

const RISK_COLORS: Record<string, { border: string; bg: string; text: string; dot: string }> = {
  Critical: { border: 'border-l-red-600', bg: 'bg-red-50 dark:bg-red-950/20', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500' },
  High: { border: 'border-l-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/20', text: 'text-orange-700 dark:text-orange-400', dot: 'bg-orange-500' },
  Medium: { border: 'border-l-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/20', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500' },
  Low: { border: 'border-l-green-500', bg: 'bg-green-50 dark:bg-green-950/20', text: 'text-green-700 dark:text-green-400', dot: 'bg-green-500' },
};

export function AuditFindingCard({ finding, index, responses = [], actions = [], compact = false }: AuditFindingCardProps) {
  const risk = finding.risk_rating || 'Unrated';
  const colors = RISK_COLORS[risk] || { border: 'border-l-gray-400', bg: 'bg-muted/30', text: 'text-muted-foreground', dot: 'bg-gray-400' };

  const linkedResponses = responses.filter((r: any) => r.finding_id === finding.id);
  const linkedActions = actions.filter((a: any) => a.finding_id === finding.id);

  return (
    <Card className={`border-l-4 ${colors.border} overflow-hidden`}>
      {/* Finding Header */}
      <div className={`px-5 py-3 ${colors.bg} border-b`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-muted-foreground bg-background rounded-full h-6 w-6 flex items-center justify-center border">
              {index}
            </span>
            <div>
              <h4 className="font-semibold text-sm">{finding.title || 'Untitled Finding'}</h4>
              <p className="text-xs text-muted-foreground">{finding.finding_code || finding.id?.slice(0, 8)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`${colors.bg} ${colors.text} border text-xs`}>
              <span className={`h-1.5 w-1.5 rounded-full ${colors.dot} mr-1.5`} />
              {risk}
            </Badge>
            {finding.impact_area && (
              <Badge variant="outline" className="text-xs">{finding.impact_area}</Badge>
            )}
          </div>
        </div>
      </div>

      <CardContent className="p-5 space-y-4">
        {/* Observation Details */}
        <div className="grid gap-4 md:grid-cols-2">
          <ObservationField label="Criteria" icon={Target} value={finding.criteria} />
          <ObservationField label="Condition" icon={AlertTriangle} value={finding.condition} />
          <ObservationField label="Cause" icon={FileText} value={finding.cause} />
          <ObservationField label="Effect / Risk Implication" icon={AlertTriangle} value={finding.effect} />
        </div>

        {finding.recommendation && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Recommendation</p>
            <p className="text-sm leading-relaxed bg-blue-50 dark:bg-blue-950/20 rounded-md p-3 border border-blue-100 dark:border-blue-900">
              {finding.recommendation}
            </p>
          </div>
        )}

        {/* Linked Management Responses */}
        {linkedResponses.length > 0 && (
          <div>
            <Separator className="mb-3" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" /> Management Response
            </p>
            {linkedResponses.map((r: any, i: number) => (
              <div key={r.id} className="bg-muted/30 rounded-md p-3 text-sm leading-relaxed border mb-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium">{r.responder_name || 'Management'}</span>
                  <StatusBadge status={r.status || 'Pending'} />
                </div>
                <p>{r.response_text || '—'}</p>
              </div>
            ))}
          </div>
        )}

        {/* Linked Actions */}
        {linkedActions.length > 0 && (
          <div>
            {linkedResponses.length === 0 && <Separator className="mb-3" />}
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" /> Agreed Actions
            </p>
            <div className="space-y-2">
              {linkedActions.map((a: any) => (
                <div key={a.id} className="flex items-start gap-3 bg-muted/30 rounded-md p-3 border text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="leading-relaxed">{a.action_description || '—'}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                      {a.responsible_person && (
                        <span className="flex items-center gap-1"><User className="h-3 w-3" />{a.responsible_person}</span>
                      )}
                      {a.target_date && (
                        <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{formatDateForDisplay(a.target_date)}</span>
                      )}
                      <StatusBadge status={a.status || 'Open'} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Evidence / Working Paper Links */}
        {(finding.evidence_refs || finding.working_paper_ref) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
            <Link2 className="h-3 w-3" />
            {finding.evidence_refs && <span>Evidence: {finding.evidence_refs}</span>}
            {finding.working_paper_ref && <span>Working Paper: {finding.working_paper_ref}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Target(props: any) { return <AlertTriangle {...props} />; }

function ObservationField({ label, icon: Icon, value }: { label: string; icon: React.ElementType; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm leading-relaxed">{value}</p>
    </div>
  );
}
