/**
 * IA Phase 5 — My Work: the normal auditor's daily front door.
 *
 * Every list is a scoped server-side read model (ia_q_my_audit_work,
 * ia_q_continue_audit, ia_q_my_audits). There is no local task store, no second
 * queue and no client-side scan of Internal Audit data. Destination access is
 * still enforced by the destination screen's own authorization.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlayCircle, AlertTriangle, Eye, Hourglass, CalendarClock, Briefcase,
  ArrowRight, CheckCircle2, ClipboardList,
} from 'lucide-react';
import { PageShell, StatusBadge } from '@/components/common';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateForDisplay } from '@/lib/format-config';
import { useInternalAuditPersona } from '@/hooks/audit/useInternalAuditPersona';
import {
  useIaContinueAudit, useIaMyAudits, useIaMyWorkBuckets,
  type ContinueAuditItem, type MyWorkItem,
} from '@/hooks/audit/useIAMyWork';

function WorkList({
  items, emptyText, testId, onOpen,
}: { items: MyWorkItem[]; emptyText: string; testId: string; onOpen: (link: string) => void }) {
  if (items.length === 0) {
    return (
      <p data-testid={`${testId}-empty`} className="text-xs text-muted-foreground py-4">
        {emptyText}
      </p>
    );
  }
  return (
    <div className="space-y-1.5" data-testid={testId}>
      {items.slice(0, 8).map((item) => (
        <button
          key={`${item.record_id}-${item.required_action}`}
          onClick={() => onOpen(item.link)}
          className="w-full text-left rounded-md border px-3 py-2 hover:bg-muted/60 transition-colors"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium truncate">{item.required_action}</span>
            {item.overdue_days > 0 && (
              <span className="text-[10px] font-semibold text-destructive shrink-0">
                {item.overdue_days}d overdue
              </span>
            )}
          </div>
          <div className="text-[11px] text-muted-foreground truncate">
            {[item.audit, item.reference].filter(Boolean).join(' · ')}
          </div>
          {item.due_date && (
            <div className="text-[10px] text-muted-foreground mt-0.5">
              Due {formatDateForDisplay(item.due_date)}
            </div>
          )}
        </button>
      ))}
      {items.length > 8 && (
        <p className="text-[11px] text-muted-foreground pt-1">+ {items.length - 8} more</p>
      )}
    </div>
  );
}

function ContinueCard({ item, onContinue }: { item: ContinueAuditItem; onContinue: (l: string) => void }) {
  return (
    <Card className="border-primary/30 bg-primary/5" data-testid="continue-audit-card">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold truncate">{item.engagement_name}</span>
              <StatusBadge status={item.stage} />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {[item.engagement_code, item.department_name].filter(Boolean).join(' · ')}
            </p>
          </div>
          <Button size="sm" data-testid="continue-audit-button" onClick={() => onContinue(item.link)}>
            <PlayCircle className="h-4 w-4 mr-1.5" />
            Continue Audit
          </Button>
        </div>
        <div className="rounded-md bg-background/70 border px-3 py-2">
          <p className="text-xs font-medium">{item.work_label}</p>
          {item.work_detail && (
            <p className="text-[11px] text-muted-foreground mt-0.5">{item.work_detail}</p>
          )}
          {item.reason && (
            <p className="text-[10px] text-muted-foreground mt-1 italic">Why: {item.reason}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function MyAuditWork() {
  const navigate = useNavigate();
  const { isAuditTeam, isManagementOnly, isLoading: personaLoading } = useInternalAuditPersona();
  const enabled = !personaLoading && isAuditTeam;

  const { data: work = [], isLoading: workLoading, buckets } = useIaMyWorkBuckets(enabled);
  const { data: resume = [], isLoading: resumeLoading } = useIaContinueAudit(enabled);
  const { data: myAudits = [], isLoading: auditsLoading } = useIaMyAudits(enabled);

  const open = (link: string) => navigate(link);
  const primary = resume[0];
  const otherActive = resume.slice(1);
  const activeAudits = myAudits.filter((a) => !a.is_closed);

  if (personaLoading) {
    return <PageShell title="My Work" subtitle="Loading your Internal Audit work…"><Skeleton className="h-40 w-full" /></PageShell>;
  }

  if (isManagementOnly) {
    return (
      <PageShell title="My Work" subtitle="Internal Audit items that need your attention">
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            You do not have Internal Audit fieldwork assignments. Items requiring a management
            response appear on the audit you are responding to.
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="My Work"
      subtitle="What needs your action today, and where to pick up"
    >
      <div className="space-y-5">
        {/* Continue Audit */}
        <section className="space-y-2">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <PlayCircle className="h-4 w-4 text-primary" /> Continue Audit
          </h2>
          {resumeLoading ? (
            <Skeleton className="h-28 w-full" />
          ) : primary ? (
            <ContinueCard item={primary} onContinue={open} />
          ) : (
            <Card><CardContent className="p-4 text-xs text-muted-foreground">
              You have no active audits in progress. Audits appear here once they are launched.
            </CardContent></Card>
          )}

          {otherActive.length > 0 && (
            <div className="grid gap-2 md:grid-cols-2">
              {otherActive.map((item) => (
                <button
                  key={item.engagement_id}
                  data-testid="continue-audit-secondary"
                  onClick={() => open(item.link)}
                  className="text-left rounded-md border px-3 py-2 hover:bg-muted/60 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium truncate">{item.engagement_name}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {item.stage} · {item.work_label}
                  </p>
                  {item.work_detail && (
                    <p className="text-[10px] text-muted-foreground truncate">{item.work_detail}</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Work buckets */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Needs My Action
                <span className="text-xs font-normal text-muted-foreground">
                  ({buckets.needsMyAction.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {workLoading ? <Skeleton className="h-24 w-full" /> : (
                <WorkList items={buckets.needsMyAction} testId="needs-my-action"
                  emptyText="Nothing is waiting on you right now." onOpen={open} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                Needs Review
                <span className="text-xs font-normal text-muted-foreground">
                  ({buckets.needsReview.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {workLoading ? <Skeleton className="h-24 w-full" /> : (
                <WorkList items={buckets.needsReview} testId="needs-review"
                  emptyText="No work is awaiting your review." onOpen={open} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Hourglass className="h-4 w-4 text-muted-foreground" />
                Waiting On Others
                <span className="text-xs font-normal text-muted-foreground">
                  ({buckets.waitingOnOthers.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {workLoading ? <Skeleton className="h-24 w-full" /> : (
                <WorkList items={buckets.waitingOnOthers} testId="waiting-on-others"
                  emptyText="Nothing is outstanding with management or action owners." onOpen={open} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-primary" />
                Due Soon
                <span className="text-xs font-normal text-muted-foreground">
                  ({buckets.dueSoon.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {workLoading ? <Skeleton className="h-24 w-full" /> : (
                <WorkList items={buckets.dueSoon} testId="due-soon"
                  emptyText="Nothing falls due in the next 7 days." onOpen={open} />
              )}
            </CardContent>
          </Card>
        </div>

        {/* My Audits */}
        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" /> My Audits
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate('/audit/audits')}>
              All audits <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {auditsLoading ? <Skeleton className="h-24 w-full" /> : activeAudits.length === 0 ? (
              <p className="text-xs text-muted-foreground py-3" data-testid="my-audits-empty">
                You have no active audit assignments.
              </p>
            ) : (
              <div className="space-y-2" data-testid="my-audits">
                {activeAudits.map((a) => {
                  const pct = a.procedures_total > 0
                    ? Math.round((a.procedures_done / a.procedures_total) * 100) : 0;
                  const next = resume.find((r) => r.engagement_id === a.engagement_id);
                  return (
                    <button
                      key={a.engagement_id}
                      onClick={() => open(next?.link || `/audit/audits/${a.engagement_id}`)}
                      className="w-full text-left rounded-md border px-3 py-2.5 hover:bg-muted/60 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-xs font-semibold truncate">{a.engagement_name}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-muted-foreground">{a.my_role}</span>
                          <StatusBadge status={a.stage} />
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5">
                        <Progress value={pct} className="h-1.5 flex-1" />
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {a.procedures_total > 0
                            ? `${a.procedures_done}/${a.procedures_total} procedures`
                            : 'Programme not started'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground flex-wrap">
                        {next && <span className="inline-flex items-center gap-1"><ClipboardList className="h-3 w-3" />{next.work_label}</span>}
                        {a.findings_open > 0 && <span>{a.findings_open} finding(s) open</span>}
                        {a.exceptions_open > 0 && <span>{a.exceptions_open} exception(s) to evaluate</span>}
                        {a.actions_overdue > 0 && <span className="text-destructive">{a.actions_overdue} overdue action(s)</span>}
                        {a.planned_end_date && <span>Ends {formatDateForDisplay(a.planned_end_date)}</span>}
                        {a.findings_open === 0 && a.exceptions_open === 0 && a.actions_overdue === 0 && (
                          <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />No blockers</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/audit/action-centre')}>
            Open Action Centre
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate('/audit/dashboard')}>
            Portfolio dashboard
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
