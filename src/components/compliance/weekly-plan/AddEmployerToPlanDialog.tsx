// ============================================
// AddEmployerToPlanDialog
// Three controlled paths for adding an employer to the weekly plan:
//   • Recommended  — pulled from system intelligence (read-only list)
//   • Direct       — operator searches Employer Master and adds
//   • Exception    — controlled override with category + reason note + approval
// ============================================
import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sparkles,
  Building2,
  ShieldAlert,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  CalendarPlus,
  Info,
  Phone,
  Mail,
  Layers,
} from 'lucide-react';

import { EmployerMasterSearch, type EmployerMasterRecord } from './EmployerMasterSearch';
import { EmployerIntelligencePanel } from './EmployerIntelligencePanel';
import { DayOfWeek } from '@/hooks/useWeeklyPlanBuilder';
import {
  EXCEPTION_CATEGORIES,
  ExceptionCategory,
  isApprovalRequired,
  isNoteRequired,
  useEmployerRecentVisits,
  useEmployerSelectionOrchestrator,
  validateEmployerForPlan,
} from '@/hooks/compliance/useEmployerSelectionOrchestrator';
import {
  PlanCandidate,
  PlanItemPriority,
  PlanVisitType,
  WeeklyPlanItem,
} from '@/types/weeklyPlan';

const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  weekDays: { name: DayOfWeek; date: string }[];
  planId: string | null | undefined;
  userCode: string | null | undefined;
  existingItems: WeeklyPlanItem[];
  /** From useWeeklyPlanBuilder.addManualItem */
  addItem: (item: any) => Promise<unknown>;
  /** Recommended list (already-scored candidates). */
  recommended: PlanCandidate[];
  addedSourceIds: Set<string | null>;
  /** Used by the "Recommended" tab to insert a candidate the same way the rest of the builder does. */
  onAddRecommended: (candidate: PlanCandidate, day: DayOfWeek) => Promise<void> | void;
  defaultTab?: 'recommended' | 'direct' | 'exception';
}

export function AddEmployerToPlanDialog({
  open,
  onOpenChange,
  weekDays,
  planId,
  userCode,
  existingItems,
  addItem,
  recommended,
  addedSourceIds,
  onAddRecommended,
  defaultTab = 'recommended',
}: Props) {
  const [tab, setTab] = useState<'recommended' | 'direct' | 'exception'>(defaultTab);

  const orchestrator = useEmployerSelectionOrchestrator({
    planId,
    weekDays,
    userCode,
    addItem,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5 text-primary" />
            Add Employer to Weekly Plan
          </DialogTitle>
          <DialogDescription>
            Three controlled paths — every selection is validated against Employer Master and
            recorded in the audit trail.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={v => setTab(v as any)} className="mt-2">
          <TabsList>
            <TabsTrigger value="recommended" className="gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> Recommended
              <Badge variant="secondary" className="ml-1 text-[10px]">
                {recommended.filter(c => !addedSourceIds.has(c.source_id)).length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="direct" className="gap-1.5">
              <Building2 className="h-3.5 w-3.5" /> Direct Selection
            </TabsTrigger>
            <TabsTrigger value="exception" className="gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5" /> Exception
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recommended">
            <RecommendedTab
              recommended={recommended}
              addedSourceIds={addedSourceIds}
              onAdd={async (c, d) => {
                await onAddRecommended(c, d);
                await orchestrator.recordRecommendedAudit({
                  employer: { regno: c.employer_id || null, name: c.employer_name || null },
                });
              }}
            />
          </TabsContent>

          <TabsContent value="direct">
            <DirectTab
              existingItems={existingItems}
              onAdd={async params => {
                await orchestrator.addDirectEmployer(params);
                onOpenChange(false);
              }}
            />
          </TabsContent>

          <TabsContent value="exception">
            <ExceptionTab
              existingItems={existingItems}
              onAdd={async params => {
                await orchestrator.addExceptionEmployer(params);
                onOpenChange(false);
              }}
            />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------- Recommended tab ----------------
function RecommendedTab({
  recommended,
  addedSourceIds,
  onAdd,
}: {
  recommended: PlanCandidate[];
  addedSourceIds: Set<string | null>;
  onAdd: (c: PlanCandidate, d: DayOfWeek) => Promise<void> | void;
}) {
  const [query, setQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');

  const available = useMemo(
    () =>
      recommended
        .filter(c => !addedSourceIds.has(c.source_id))
        .sort((a, b) => (b.recommendation_score ?? 0) - (a.recommendation_score ?? 0)),
    [recommended, addedSourceIds],
  );

  const sources = useMemo(() => {
    const set = new Set<string>();
    available.forEach(c => c.source_type && set.add(c.source_type));
    return Array.from(set).sort();
  }, [available]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return available.filter(c => {
      if (priorityFilter !== 'ALL' && c.priority !== priorityFilter) return false;
      if (sourceFilter !== 'ALL' && c.source_type !== sourceFilter) return false;
      if (!q) return true;
      const hay = [
        c.employer_name,
        c.employer_id,
        c.source_ref,
        c.territory,
        c.description,
        c.source_type,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [available, query, priorityFilter, sourceFilter]);

  if (available.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-success" />
        All recommended employers have already been added to the plan.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by employer name, ID, sector, territory…"
            className="pl-8 h-9"
          />
        </div>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="h-9 w-full sm:w-[140px]"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All priorities</SelectItem>
            <SelectItem value="CRITICAL">Critical</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="LOW">Low</SelectItem>
          </SelectContent>
        </Select>
        {sources.length > 1 && (
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="h-9 w-full sm:w-[160px]"><SelectValue placeholder="Source" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All sources</SelectItem>
              {sources.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>
          Showing <strong>{filtered.length}</strong> of <strong>{available.length}</strong> recommended employers
          {filtered.length !== available.length && ' (after filters)'}
        </span>
        {(query || priorityFilter !== 'ALL' || sourceFilter !== 'ALL') && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[11px]"
            onClick={() => { setQuery(''); setPriorityFilter('ALL'); setSourceFilter('ALL'); }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground border rounded-md">
          No recommended employers match your filters.
        </div>
      ) : (
        <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
          {filtered.map(c => (
            <div key={c.source_id || c.source_ref} className="border rounded-md p-3 bg-card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">{c.employer_name || c.source_ref}</span>
                    {c.employer_id && (
                      <span className="font-mono text-[11px] text-muted-foreground">{c.employer_id}</span>
                    )}
                    {c.priority && (
                      <Badge variant="outline" className="text-[10px]">{c.priority}</Badge>
                    )}
                    {typeof c.recommendation_score === 'number' && (
                      <Badge variant="secondary" className="text-[10px]">score {c.recommendation_score}</Badge>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                    {c.source_type && <span>Source: {c.source_type}</span>}
                    {c.territory && <span>· {c.territory}</span>}
                    {c.due_date && <span>· Due {new Date(c.due_date).toLocaleDateString()}</span>}
                  </div>
                  {c.description && (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{c.description}</p>
                  )}
                </div>
                <DayPicker onPick={d => onAdd(c, d)} label="Add" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------- Direct tab ----------------
function DirectTab({
  existingItems,
  onAdd,
}: {
  existingItems: WeeklyPlanItem[];
  onAdd: (params: {
    employer: EmployerMasterRecord;
    day: DayOfWeek;
    visitType: string;
    priority: string;
    purpose: string;
  }) => Promise<void> | void;
}) {
  const [employer, setEmployer] = useState<EmployerMasterRecord | null>(null);
  const [day, setDay] = useState<DayOfWeek>('Monday');
  const [visitType, setVisitType] = useState<string>(PlanVisitType.AUDIT);
  const [priority, setPriority] = useState<string>(PlanItemPriority.MEDIUM);
  const [purpose, setPurpose] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const recent = useEmployerRecentVisits(employer?.regno ?? null);
  const validation = useMemo(
    () => (employer ? validateEmployerForPlan(employer, existingItems, recent.data) : null),
    [employer, existingItems, recent.data],
  );

  const blocked = !!validation?.blocking.length;
  const canSubmit = !!employer && !blocked && !submitting;

  const handleAdd = async () => {
    if (!employer || !canSubmit) return;
    setSubmitting(true);
    try {
      await onAdd({ employer, day, visitType, priority, purpose });
      setEmployer(null);
      setPurpose('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <EmployerMasterSearch
        selected={employer}
        onSelect={setEmployer}
        placeholder="Search employer name, registration number, sector, phone or email…"
      />

      {employer && (
        <>
          <EmployerCard employer={employer} validation={validation} recentCount={recent.data?.length ?? 0} />
          <EmployerIntelligencePanel employerId={employer.regno} validation={validation} />
        </>
      )}

      <div className="grid grid-cols-3 gap-3">
        <Field label="Day">
          <Select value={day} onValueChange={v => setDay(v as DayOfWeek)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Visit Type">
          <Select value={visitType} onValueChange={setVisitType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={PlanVisitType.AUDIT}>Audit</SelectItem>
              <SelectItem value={PlanVisitType.RISK_BASED_AUDIT}>Risk-based Audit</SelectItem>
              <SelectItem value={PlanVisitType.INSPECTION}>Inspection</SelectItem>
              <SelectItem value={PlanVisitType.C3_FOLLOW_UP}>C3 Follow-up</SelectItem>
              <SelectItem value={PlanVisitType.PAYMENT_FOLLOW_UP}>Payment Follow-up</SelectItem>
              <SelectItem value={PlanVisitType.COMPLAINT_INVESTIGATION}>Complaint Investigation</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Priority">
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={PlanItemPriority.CRITICAL}>Critical</SelectItem>
              <SelectItem value={PlanItemPriority.HIGH}>High</SelectItem>
              <SelectItem value={PlanItemPriority.MEDIUM}>Medium</SelectItem>
              <SelectItem value={PlanItemPriority.LOW}>Low</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field label="Purpose / Notes (optional)">
        <Textarea
          value={purpose}
          onChange={e => setPurpose(e.target.value)}
          placeholder="What is this visit intended to cover?"
          rows={2}
        />
      </Field>

      <div className="flex justify-end">
        <Button onClick={handleAdd} disabled={!canSubmit}>
          {submitting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
          <CalendarPlus className="h-4 w-4 mr-1.5" />
          Add to Plan
        </Button>
      </div>
    </div>
  );
}

// ---------------- Exception tab ----------------
function ExceptionTab({
  existingItems,
  onAdd,
}: {
  existingItems: WeeklyPlanItem[];
  onAdd: (params: {
    employer: EmployerMasterRecord;
    day: DayOfWeek;
    category: ExceptionCategory;
    reasonNote: string;
    visitType: string;
    priority: string;
    purpose: string;
  }) => Promise<void> | void;
}) {
  const [employer, setEmployer] = useState<EmployerMasterRecord | null>(null);
  const [day, setDay] = useState<DayOfWeek>('Monday');
  const [visitType, setVisitType] = useState<string>(PlanVisitType.AUDIT);
  const [priority, setPriority] = useState<string>(PlanItemPriority.HIGH);
  const [category, setCategory] = useState<ExceptionCategory>('COMPLAINT_BASED');
  const [reasonNote, setReasonNote] = useState('');
  const [purpose, setPurpose] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const recent = useEmployerRecentVisits(employer?.regno ?? null);
  const validation = useMemo(
    () => (employer ? validateEmployerForPlan(employer, existingItems, recent.data) : null),
    [employer, existingItems, recent.data],
  );

  const noteRequired = isNoteRequired(category);
  const approvalRequired = isApprovalRequired(category);
  const blocked = !!validation?.blocking.length;
  const canSubmit =
    !!employer
    && !blocked
    && !submitting
    && (!noteRequired || reasonNote.trim().length > 0);

  const handleAdd = async () => {
    if (!employer || !canSubmit) return;
    setSubmitting(true);
    try {
      await onAdd({ employer, day, visitType, priority, category, reasonNote, purpose });
      setEmployer(null);
      setReasonNote('');
      setPurpose('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs">
          Exceptions are <strong>controlled overrides</strong> — they bypass recommendation rules
          but still go through validation, audit logging, and (where required) approval.
          Free-text employer entry is not allowed.
        </AlertDescription>
      </Alert>

      <EmployerMasterSearch
        selected={employer}
        onSelect={setEmployer}
        placeholder="Search Employer Master to begin exception…"
      />

      {employer && (
        <>
          <EmployerCard employer={employer} validation={validation} recentCount={recent.data?.length ?? 0} />
          <EmployerIntelligencePanel employerId={employer.regno} validation={validation} />
        </>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Exception Category" required>
          <Select value={category} onValueChange={v => setCategory(v as ExceptionCategory)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {EXCEPTION_CATEGORIES.map(c => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Day">
          <Select value={day} onValueChange={v => setDay(v as DayOfWeek)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field label={`Reason / Override Note${noteRequired ? ' (required)' : ' (optional)'}`} required={noteRequired}>
        <Textarea
          value={reasonNote}
          onChange={e => setReasonNote(e.target.value)}
          placeholder="Briefly justify why this employer is being added outside the recommendation rules"
          rows={3}
          className={noteRequired && !reasonNote.trim() ? 'border-destructive focus-visible:ring-destructive' : ''}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Visit Type">
          <Select value={visitType} onValueChange={setVisitType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={PlanVisitType.AUDIT}>Audit</SelectItem>
              <SelectItem value={PlanVisitType.RISK_BASED_AUDIT}>Risk-based Audit</SelectItem>
              <SelectItem value={PlanVisitType.INSPECTION}>Inspection</SelectItem>
              <SelectItem value={PlanVisitType.COMPLAINT_INVESTIGATION}>Complaint Investigation</SelectItem>
              <SelectItem value={PlanVisitType.C3_FOLLOW_UP}>C3 Follow-up</SelectItem>
              <SelectItem value={PlanVisitType.PAYMENT_FOLLOW_UP}>Payment Follow-up</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Priority">
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={PlanItemPriority.CRITICAL}>Critical</SelectItem>
              <SelectItem value={PlanItemPriority.HIGH}>High</SelectItem>
              <SelectItem value={PlanItemPriority.MEDIUM}>Medium</SelectItem>
              <SelectItem value={PlanItemPriority.LOW}>Low</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field label="Operational Purpose (optional)">
        <Textarea
          value={purpose}
          onChange={e => setPurpose(e.target.value)}
          placeholder="What is this visit meant to accomplish?"
          rows={2}
        />
      </Field>

      {approvalRequired && (
        <Alert className="border-warning/30 bg-warning/10">
          <ShieldAlert className="h-4 w-4 text-warning" />
          <AlertDescription className="text-xs">
            This category requires <strong>supervisor approval</strong> before the exception can be
            executed. The item will be added with status <em>Pending Approval</em>.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end">
        <Button onClick={handleAdd} disabled={!canSubmit} variant={approvalRequired ? 'default' : 'default'}>
          {submitting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
          <ShieldAlert className="h-4 w-4 mr-1.5" />
          {approvalRequired ? 'Submit Exception for Approval' : 'Add Exception to Plan'}
        </Button>
      </div>
    </div>
  );
}

// ---------------- Helpers ----------------
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}

function DayPicker({ onPick, label }: { onPick: (d: DayOfWeek) => void | Promise<void>; label: string }) {
  const [day, setDay] = useState<DayOfWeek>('Monday');
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <Select value={day} onValueChange={v => setDay(v as DayOfWeek)}>
        <SelectTrigger className="h-8 w-[110px] text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          {DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
        </SelectContent>
      </Select>
      <Button
        size="sm"
        className="h-8 gap-1"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try { await onPick(day); } finally { setBusy(false); }
        }}
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CalendarPlus className="h-3.5 w-3.5" />}
        {label}
      </Button>
    </div>
  );
}

function EmployerCard({
  employer,
  validation,
  recentCount,
}: {
  employer: EmployerMasterRecord;
  validation: ReturnType<typeof validateEmployerForPlan> | null;
  recentCount: number;
}) {
  return (
    <div className="rounded-md border bg-muted/30 p-3 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium truncate">{employer.name || employer.trade_name || '—'}</span>
            <span className="font-mono text-[11px] text-muted-foreground">{employer.regno}</span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
            {employer.sector_code && <span className="flex items-center gap-1"><Layers className="h-3 w-3" />Sector {employer.sector_code}</span>}
            {employer.activity_type && <span>{employer.activity_type}</span>}
            {employer.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{employer.phone}</span>}
            {employer.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{employer.email}</span>}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Audit history on file: <span className="font-medium text-foreground">{recentCount}</span> visit
            {recentCount === 1 ? '' : 's'}
            {validation?.recentlyAuditedDays !== null && validation?.recentlyAuditedDays !== undefined && (
              <> · last completed visit ~{validation.recentlyAuditedDays}d ago</>
            )}
          </div>
        </div>
      </div>

      {validation?.blocking.map(b => (
        <Alert key={b} variant="destructive" className="py-2">
          <AlertTriangle className="h-3.5 w-3.5" />
          <AlertDescription className="text-xs">{b}</AlertDescription>
        </Alert>
      ))}
      {validation?.warnings.map(w => (
        <Alert key={w} className="py-2 border-warning/30 bg-warning/10">
          <AlertTriangle className="h-3.5 w-3.5 text-warning" />
          <AlertDescription className="text-xs">{w}</AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
