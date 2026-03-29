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

const RISK_COLORS: Record<string, { border: string; bg: string; text: string; dot: string; headerBg: string }> = {
  Critical: { border: 'border-l-red-600', bg: 'bg-red-50 dark:bg-red-950/20', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500', headerBg: 'bg-red-50/80 dark:bg-red-950/30' },
  High: { border: 'border-l-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/20', text: 'text-orange-700 dark:text-orange-400', dot: 'bg-orange-500', headerBg: 'bg-orange-50/80 dark:bg-orange-950/30' },
  Medium: { border: 'border-l-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/20', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500', headerBg: 'bg-amber-50/80 dark:bg-amber-950/30' },
  Low: { border: 'border-l-green-500', bg: 'bg-green-50 dark:bg-green-950/20', text: 'text-green-700 dark:text-green-400', dot: 'bg-green-500', headerBg: 'bg-green-50/80 dark:bg-green-950/30' },
};

export function AuditFindingCard({ finding, index, responses = [], actions = [], compact = false }: AuditFindingCardProps) {
  const risk = finding.risk_rating || 'Unrated';
  const colors = RISK_COLORS[risk] || { border: 'border-l-gray-400', bg: 'bg-muted/30', text: 'text-muted-foreground', dot: 'bg-gray-400', headerBg: 'bg-muted/30' };

  const linkedResponses = responses.filter((r: any) => r.finding_id === finding.id);
  const linkedActions = actions.filter((a: any) => a.finding_id === finding.id);

  return (
    <Card className={`border-l-4 ${colors.border} overflow-hidden print:shadow-none print:border`}>
      {/* Finding Header */}
      <div className={`px-5 py-3 ${colors.headerBg} border-b`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-primary-foreground bg-primary rounded-full h-7 w-7 flex items-center justify-center shrink-0 shadow-sm">
              {index}
            </span>
            <div>
              <h4 className="font-semibold text-sm leading-tight">{finding.title || 'Untitled Finding'}</h4>
              <p className="text-xs text-muted-foreground mt-0.5">{finding.finding_code || finding.id?.slice(0, 8)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge className={`${colors.bg} ${colors.text} border text-xs`}>
              <span className={`h-1.5 w-1.5 rounded-full ${colors.dot} mr-1.5 inline-block`} />
              {risk}
            </Badge>
            {finding.impact_area && (
              <Badge variant="outline" className="text-xs">{finding.impact_area}</Badge>
            )}
            {finding.status && (
              <StatusBadge status={finding.status} />
            )}
          </div>
        </div>
      </div>

      <CardContent className="p-5 space-y-5">
        {/* Observation Details - Structured 2x2 Grid */}
        {(finding.criteria || finding.condition || finding.cause || finding.effect) && (
          <div className="grid gap-px md:grid-cols-2 bg-border rounded-lg overflow-hidden">
            <ObservationCell label="Criteria" sublabel="What should be" value={finding.criteria} />
            <ObservationCell label="Condition" sublabel="What was found" value={finding.condition} />
            <ObservationCell label="Cause" sublabel="Why it happened" value={finding.cause} />
            <ObservationCell label="Effect / Risk" sublabel="What could result" value={finding.effect} />
          </div>
        )}

        {/* Recommendation Callout */}
        {finding.recommendation && (
          <div className="rounded-lg border-2 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 p-4">
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Recommendation
            </p>
            <p className="text-sm leading-relaxed">{finding.recommendation}</p>
          </div>
        )}

        {/* Management Responses */}
        {linkedResponses.length > 0 && (
          <div>
            <Separator className="mb-4" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" /> Management Response{linkedResponses.length > 1 ? 's' : ''}
            </p>
            <div className="space-y-2">
              {linkedResponses.map((r: any) => (
                <div key={r.id} className="rounded-lg border bg-muted/20 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs font-semibold">{r.responder_name || 'Management'}</span>
                    </div>
                    <StatusBadge status={r.status || 'Pending'} />
                  </div>
                  <p className="text-sm leading-relaxed">{r.response_text || '—'}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Agreed Actions - Mini Table */}
        {linkedActions.length > 0 && (
          <div>
            {linkedResponses.length === 0 && <Separator className="mb-4" />}
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" /> Agreed Action{linkedActions.length > 1 ? 's' : ''}
            </p>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 text-xs text-muted-foreground">
                    <th className="text-left p-2.5 font-medium">Action</th>
                    <th className="text-left p-2.5 font-medium w-28">Owner</th>
                    <th className="text-left p-2.5 font-medium w-24">Due Date</th>
                    <th className="text-left p-2.5 font-medium w-20">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {linkedActions.map((a: any, i: number) => (
                    <tr key={a.id} className={`border-t ${i % 2 === 1 ? 'bg-muted/20' : ''}`}>
                      <td className="p-2.5">{a.action_description || '—'}</td>
                      <td className="p-2.5">
                        <span className="flex items-center gap-1 text-xs">
                          <User className="h-3 w-3 text-muted-foreground" />
                          {a.responsible_person || '—'}
                        </span>
                      </td>
                      <td className="p-2.5">
                        <span className="flex items-center gap-1 text-xs">
                          <CalendarDays className="h-3 w-3 text-muted-foreground" />
                          {a.target_date ? formatDateForDisplay(a.target_date) : '—'}
                        </span>
                      </td>
                      <td className="p-2.5">
                        <StatusBadge status={a.status || 'Open'} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Evidence / Working Paper References */}
        {(finding.evidence_refs || finding.working_paper_ref) && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground pt-2 border-t">
            <Link2 className="h-3 w-3 shrink-0" />
            {finding.evidence_refs && <span>Evidence: {finding.evidence_refs}</span>}
            {finding.working_paper_ref && <span>Working Paper: {finding.working_paper_ref}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ObservationCell({ label, sublabel, value }: { label: string; sublabel: string; value?: string }) {
  return (
    <div className="bg-background p-4">
      <p className="text-xs font-semibold uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-[10px] text-muted-foreground mb-2">{sublabel}</p>
      <p className="text-sm leading-relaxed">{value || <span className="text-muted-foreground italic">Not specified</span>}</p>
    </div>
  );
}
