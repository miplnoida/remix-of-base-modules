/**
 * EmployerComplianceHistoryPanel
 * ------------------------------------------------------------
 * Reusable, read-only "full posture" view of an employer's
 * compliance history. Used in:
 *   - Employer 360
 *   - Audit Visit Workspace (History tab)
 *   - Audit Report editor (preview / context)
 *   - Audit Communications panel (insert context)
 *
 * Filter chips let the officer narrow by category. When `inspectionId`
 * (or `findingId`) is provided, an inline "Link to this visit/finding"
 * action is shown next to each item — wired in Phase D.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEmployerCompliancePosture } from '@/hooks/useEmployerCompliancePosture';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Briefcase, AlertTriangle, Wallet, Gavel, ListChecks,
  ClipboardList, FileText, MessageSquareWarning, Link2,
} from 'lucide-react';
import { formatDateForDisplay } from '@/lib/format-config';
import { PriorMatterLinkDialog } from './PriorMatterLinkDialog';
import type { PriorMatterType } from '@/types/employerHistory';

type CategoryKey =
  | 'CASES' | 'VIOLATIONS' | 'ARRANGEMENTS' | 'LEGAL'
  | 'FOLLOW_UPS' | 'INSPECTIONS' | 'REPORTS' | 'DISPUTES';

const CATEGORIES: { key: CategoryKey; label: string; icon: typeof Briefcase }[] = [
  { key: 'CASES', label: 'Cases', icon: Briefcase },
  { key: 'VIOLATIONS', label: 'Violations', icon: AlertTriangle },
  { key: 'ARRANGEMENTS', label: 'Arrangements', icon: Wallet },
  { key: 'LEGAL', label: 'Legal', icon: Gavel },
  { key: 'FOLLOW_UPS', label: 'Follow-ups', icon: ListChecks },
  { key: 'INSPECTIONS', label: 'Inspections', icon: ClipboardList },
  { key: 'REPORTS', label: 'Reports', icon: FileText },
  { key: 'DISPUTES', label: 'Disputes', icon: MessageSquareWarning },
];

const fmtMoney = (n: number | null | undefined) =>
  n == null ? '—' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'XCD', minimumFractionDigits: 2 }).format(Number(n));

const fmtDate = (s: string | null | undefined) => (s ? formatDateForDisplay(s) : '—');

interface PanelProps {
  employerId: string;
  /** When provided, enables "Link to this visit" actions. */
  inspectionId?: string;
  /** When provided, enables "Link to this finding" actions. */
  findingId?: string;
  monthsBack?: number;
  /** Optional starting filter set. Default = all enabled. */
  initialCategories?: CategoryKey[];
  /** Optional handler invoked when an officer clicks "Link". Wired in Phase D. */
  onLinkMatter?: (matter: { type: CategoryKey; id: string; label: string }) => void;
}

const CATEGORY_TO_MATTER: Record<CategoryKey, PriorMatterType> = {
  CASES: 'CASE',
  VIOLATIONS: 'VIOLATION',
  ARRANGEMENTS: 'ARRANGEMENT',
  LEGAL: 'LEGAL',
  FOLLOW_UPS: 'FOLLOW_UP',
  INSPECTIONS: 'PAST_INSPECTION',
  REPORTS: 'PAST_REPORT',
  DISPUTES: 'DISPUTE',
};

export function EmployerComplianceHistoryPanel({
  employerId,
  inspectionId,
  findingId,
  monthsBack = 24,
  initialCategories,
  onLinkMatter,
  onLinked,
}: PanelProps & { onLinked?: () => void }) {
  const navigate = useNavigate();
  const { data, isLoading } = useEmployerCompliancePosture(employerId, monthsBack);
  const [active, setActive] = useState<Set<CategoryKey>>(
    () => new Set(initialCategories ?? CATEGORIES.map(c => c.key)),
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingMatter, setPendingMatter] =
    useState<{ type: PriorMatterType; id: string; label: string } | null>(null);

  const canLink = !!(inspectionId || findingId);
  const linkScopeLabel = findingId ? 'finding' : inspectionId ? 'visit' : null;

  const counts = useMemo(() => ({
    CASES: data?.cases.length ?? 0,
    VIOLATIONS: data?.violations.length ?? 0,
    ARRANGEMENTS: data?.arrangements.length ?? 0,
    LEGAL: data?.legal.length ?? 0,
    FOLLOW_UPS: data?.followUps.length ?? 0,
    INSPECTIONS: data?.pastInspections.length ?? 0,
    REPORTS: data?.pastReports.length ?? 0,
    DISPUTES: data?.disputes.length ?? 0,
  }), [data]);

  const toggle = (k: CategoryKey) => {
    setActive(prev => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  };

  const handleLinkClick = (type: CategoryKey, id: string, label: string) => {
    if (onLinkMatter) {
      onLinkMatter({ type, id, label });
      return;
    }
    setPendingMatter({ type: CATEGORY_TO_MATTER[type], id, label });
    setDialogOpen(true);
  };

  const linkBtn = (type: CategoryKey, id: string, label: string) => (
    canLink ? (
      <Button
        size="sm"
        variant="ghost"
        className="h-7 px-2 text-xs"
        onClick={() => handleLinkClick(type, id, label)}
        title={`Link to this ${linkScopeLabel}`}
      >
        <Link2 className="h-3 w-3 mr-1" />Link
      </Button>
    ) : null
  );

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" />
              Employer Compliance History
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Last {monthsBack} months · read-only context
              {canLink && (
                <span className="ml-2 text-primary">
                  · click <span className="font-medium">Link</span> to attach to this {linkScopeLabel}
                </span>
              )}
            </p>
          </div>
          {data?.ledger.total_outstanding ? (
            <Badge variant="destructive" className="text-xs">
              Outstanding: {fmtMoney(data.ledger.total_outstanding)}
              {data.ledger.overdue_periods > 0 && ` · ${data.ledger.overdue_periods} overdue periods`}
            </Badge>
          ) : null}
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {CATEGORIES.map(({ key, label, icon: Icon }) => {
            const isActive = active.has(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggle(key)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
                }`}
              >
                <Icon className="h-3 w-3" />
                {label}
                <span className={`ml-0.5 ${isActive ? 'opacity-90' : 'opacity-70'}`}>
                  ({counts[key]})
                </span>
              </button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : !data ? (
          <p className="text-sm text-muted-foreground">No history available.</p>
        ) : (
          <>
            {active.has('CASES') && (
              <Section title="Cases" icon={Briefcase} empty={data.cases.length === 0}>
                {data.cases.map(c => (
                  <Row
                    key={c.id}
                    title={c.case_number ?? c.id}
                    subtitle={`${c.case_type ?? '—'} · ${fmtDate(c.created_at)}`}
                    badge={c.status}
                    right={fmtMoney(c.total_amount)}
                    action={linkBtn('CASES', c.id, c.case_number ?? c.id)}
                  />
                ))}
              </Section>
            )}

            {active.has('VIOLATIONS') && (
              <Section title="Violations" icon={AlertTriangle} empty={data.violations.length === 0}>
                {data.violations.map(v => (
                  <Row
                    key={v.id}
                    title={v.violation_number ?? v.id}
                    subtitle={`${v.violation_type_name ?? v.violation_type_code ?? '—'} · ${fmtDate(v.created_at)}`}
                    badge={v.status}
                    severity={v.severity}
                    right={fmtMoney(v.total_amount)}
                    detail={v.summary ?? undefined}
                    action={linkBtn('VIOLATIONS', v.id, v.violation_number ?? v.id)}
                  />
                ))}
              </Section>
            )}

            {active.has('ARRANGEMENTS') && (
              <Section title="Payment Arrangements" icon={Wallet} empty={data.arrangements.length === 0}>
                {data.arrangements.map(a => (
                  <Row
                    key={a.id}
                    title={a.arrangement_number ?? a.id}
                    subtitle={`Start ${fmtDate(a.start_date)} · Next ${fmtDate(a.next_due_date)} · Missed ${a.missed_payments ?? 0}`}
                    badge={a.status}
                    right={`${fmtMoney(a.total_paid)} / ${fmtMoney(a.total_debt)}`}
                    action={
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() =>
                            navigate(
                              `/compliance/enforcement/arrangements?regno=${encodeURIComponent(employerId)}&arr=${encodeURIComponent(a.id)}`,
                            )
                          }
                          title="View arrangement details"
                        >
                          View
                        </Button>
                        {linkBtn('ARRANGEMENTS', a.id, a.arrangement_number ?? a.id)}
                      </div>
                    }
                  />
                ))}
              </Section>
            )}

            {active.has('LEGAL') && (
              <Section title="Legal Proceedings" icon={Gavel} empty={data.legal.length === 0}>
                {data.legal.map(l => (
                  <Row
                    key={l.id}
                    title={l.case_number ?? l.id}
                    subtitle={`${l.court ?? '—'} · Filed ${fmtDate(l.filed_date)}${l.next_hearing ? ` · Next hearing ${fmtDate(l.next_hearing)}` : ''}`}
                    badge={l.stage}
                    detail={l.outcome ?? undefined}
                    action={linkBtn('LEGAL', l.id, l.case_number ?? l.id)}
                  />
                ))}
              </Section>
            )}

            {active.has('FOLLOW_UPS') && (
              <Section title="Follow-up Actions" icon={ListChecks} empty={data.followUps.length === 0}>
                {data.followUps.map(f => (
                  <Row
                    key={f.id}
                    title={f.action_type ?? 'Follow-up'}
                    subtitle={`Due ${fmtDate(f.due_date)}${f.priority ? ` · ${f.priority}` : ''}`}
                    badge={f.status}
                    detail={f.description ?? undefined}
                    action={linkBtn('FOLLOW_UPS', f.id, f.action_type ?? 'Follow-up')}
                  />
                ))}
              </Section>
            )}

            {active.has('INSPECTIONS') && (
              <Section title="Past Inspections" icon={ClipboardList} empty={data.pastInspections.length === 0}>
                {data.pastInspections.map(i => (
                  <Row
                    key={i.id}
                    title={i.inspection_number ?? i.id}
                    subtitle={`${i.inspector_name ?? '—'} · ${fmtDate(i.visit_date)}`}
                    badge={i.status}
                    action={linkBtn('INSPECTIONS', i.id, i.inspection_number ?? i.id)}
                  />
                ))}
              </Section>
            )}

            {active.has('REPORTS') && (
              <Section title="Past Audit Reports" icon={FileText} empty={data.pastReports.length === 0}>
                {data.pastReports.map(r => (
                  <Row
                    key={r.id}
                    title={r.report_number ?? r.id}
                    subtitle={`Generated ${fmtDate(r.generated_at)} · ${r.total_findings ?? 0} findings · ${r.total_violations ?? 0} violations`}
                    badge={r.status}
                    action={linkBtn('REPORTS', r.id, r.report_number ?? r.id)}
                  />
                ))}
              </Section>
            )}

            {active.has('DISPUTES') && (
              <Section title="Recent Disputes" icon={MessageSquareWarning} empty={data.disputes.length === 0}>
                {data.disputes.map(d => (
                  <Row
                    key={d.id}
                    title={`Dispute ${d.id.slice(0, 8)}`}
                    subtitle={fmtDate(d.raised_at)}
                    badge={d.status}
                    detail={d.dispute_reason ?? undefined}
                    action={linkBtn('DISPUTES', d.id, `Dispute ${d.id.slice(0, 8)}`)}
                  />
                ))}
              </Section>
            )}
          </>
        )}
      </CardContent>

      {!onLinkMatter && (
        <PriorMatterLinkDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          employerId={employerId}
          inspectionId={inspectionId}
          findingId={findingId}
          matter={pendingMatter}
          onLinked={onLinked}
        />
      )}
    </Card>
  );
}

// ── Subcomponents ──────────────────────────────────────────────

function Section({
  title, icon: Icon, empty, children,
}: {
  title: string;
  icon: typeof Briefcase;
  empty: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
      </div>
      {empty ? (
        <p className="text-xs text-muted-foreground italic pl-5">No records.</p>
      ) : (
        <div className="space-y-1.5">{children}</div>
      )}
    </div>
  );
}

function Row({
  title, subtitle, badge, severity, right, detail, action,
}: {
  title: string;
  subtitle?: string;
  badge?: string | null;
  severity?: string | null;
  right?: string;
  detail?: string;
  action?: React.ReactNode;
}) {
  const sevColor =
    severity === 'CRITICAL' ? 'destructive' :
    severity === 'HIGH' ? 'destructive' :
    severity === 'MEDIUM' ? 'secondary' : 'outline';
  return (
    <div className="flex items-start justify-between gap-3 px-3 py-2 rounded-md bg-muted/40 hover:bg-muted/60 transition-colors">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium truncate">{title}</span>
          {badge && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{badge}</Badge>}
          {severity && <Badge variant={sevColor as any} className="text-[10px] px-1.5 py-0">{severity}</Badge>}
        </div>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        {detail && <p className="text-xs text-foreground/80 mt-1 line-clamp-2">{detail}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {right && <span className="text-xs font-mono text-muted-foreground">{right}</span>}
        {action}
      </div>
    </div>
  );
}
