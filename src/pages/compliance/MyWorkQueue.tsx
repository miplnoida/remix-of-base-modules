import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Inbox, Loader2, ExternalLink, CalendarClock } from 'lucide-react';
import { inspectionNominationService } from '@/services/inspectionNominationService';

import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useUserCode } from '@/hooks/useUserCode';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { isComplianceFeatureEnabled } from '@/lib/compliance/featureToggles';
import { useHasCapability } from '@/hooks/useHasCapability';
import { COMPLIANCE_CAPABILITIES, type ComplianceCapability } from '@/lib/compliance/capabilities';

const MODULE_NAME = 'ce_my_work_queue';

interface WorkItem {
  id: string;
  reference?: string | null;
  employer?: string | null;
  status?: string | null;
  priority?: string | null;
  dueDate?: string | null;
  link?: string | null;
}

interface SectionDef {
  key: string;
  label: string;
  enabled: boolean;
  /** Capability required to see this tab. `null` = always visible. */
  capability: ComplianceCapability | null;
  query: () => Promise<WorkItem[]>;
  /** Assumption note shown when section is empty, only if column mapping was uncertain. */
  assumption?: string;
}

// ----- Shielded fetchers -----------------------------------------------------

const sb: any = supabase;

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

// Build a list of identifiers (UUID + user_code) used across ce_* tables where the
// assignee column is varchar and may hold either form.
function assigneeIds(userId: string | null, userCode: string | null): string[] {
  return [userId, userCode].filter((v): v is string => !!v && v.length > 0);
}

function fetchAssignedViolations(userId: string | null, userCode: string | null) {
  return safe(async () => {
    const ids = assigneeIds(userId, userCode);
    if (ids.length === 0) return [] as WorkItem[];
    const { data, error } = await sb
      .from('ce_violations')
      .select('id, violation_number, employer_name, status, priority, due_date')
      .in('assigned_to_user_id', ids)
      .in('status', ['open', 'pending', 'in_progress', 'investigating', 'OPEN', 'IN_PROGRESS', 'ESCALATED'])
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(200);
    if (error) return [] as WorkItem[];
    return (data ?? []).map((r: any): WorkItem => ({
      id: r.id,
      reference: r.violation_number ?? r.id,
      employer: r.employer_name,
      status: r.status,
      priority: r.priority,
      dueDate: r.due_date,
      link: `/compliance/violations/${r.id}`,
    }));
  }, [] as WorkItem[]);
}

function fetchVerificationViolations(userId: string | null, userCode: string | null) {
  return safe(async () => {
    const ids = assigneeIds(userId, userCode);
    // "Awaiting verification" = status UNDER_REVIEW with no verification
    // decision yet (CONFIRMED / REJECTED / SENT_BACK removes it from the
    // queue). Officer scope: rows assigned to the user OR unassigned pool.
    let query = sb
      .from('ce_violations')
      .select('id, violation_number, employer_name, status, priority, due_date, assigned_to_user_id, verification_decision')
      .eq('status', 'UNDER_REVIEW')
      .is('verification_decision', null);
    if (ids.length) {
      query = query.or(`assigned_to_user_id.in.(${ids.join(',')}),assigned_to_user_id.is.null`);
    } else {
      query = query.is('assigned_to_user_id', null);
    }
    const { data, error } = await query
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(200);
    if (error) return [] as WorkItem[];
    return (data ?? []).map((r: any): WorkItem => ({
      id: r.id,
      reference: r.violation_number ?? r.id,
      employer: r.employer_name,
      status: r.status,
      priority: r.priority,
      dueDate: r.due_date,
      link: `/compliance/violations/${r.id}`,
    }));
  }, [] as WorkItem[]);
}


function fetchAssignedCases(userId: string | null, userCode: string | null) {
  return safe(async () => {
    // ce_cases.assigned_officer_id is mixed-shape across legacy + new
    // assignment paths: it may hold a ce_inspectors.id (UUID), an
    // inspector_code (e.g. "CI-02"), or a legacy code (e.g. "INS-002").
    // Resolve every identifier the current user maps to.
    const ids = new Set<string>();
    if (userCode) ids.add(userCode);
    if (userId) {
      const { data: insp } = await sb
        .from('ce_inspectors')
        .select('id, inspector_code, legacy_inspector_code')
        .eq('profile_id', userId);
      (insp || []).forEach((r: any) => {
        if (r.id) ids.add(r.id);
        if (r.inspector_code) ids.add(r.inspector_code);
        if (r.legacy_inspector_code) ids.add(r.legacy_inspector_code);
      });
    }

    let query = sb
      .from('ce_cases')
      .select('id, case_number, employer_name, status, priority, due_date, assigned_officer_id')
      .in('status', ['open', 'OPEN', 'ACTIVE', 'INVESTIGATION', 'in_progress', 'IN_PROGRESS', 'ESCALATED'])
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(200);
    if (ids.size > 0) query = query.in('assigned_officer_id', Array.from(ids));
    const { data, error } = await query;
    if (error) return [] as WorkItem[];
    return (data ?? []).map((r: any): WorkItem => ({
      id: r.id,
      reference: r.case_number ?? r.id,
      employer: r.employer_name,
      status: r.status,
      priority: r.priority,
      dueDate: r.due_date,
      link: `/compliance/cases/${r.id}`,
    }));
  }, [] as WorkItem[]);
}


function fetchNoticesAwaitingApproval() {
  return safe(async () => {
    // ce_notices has no approver column — surface system-wide notices awaiting action.
    const { data, error } = await sb
      .from('ce_notices')
      .select('id, notice_number, employer_name, status, due_response_date')
      .in('status', ['DRAFT', 'PENDING_APPROVAL', 'pending_approval', 'AWAITING_APPROVAL', 'PENDING'])
      .order('due_response_date', { ascending: true, nullsFirst: false })
      .limit(200);
    if (error) return [] as WorkItem[];
    return (data ?? []).map((r: any): WorkItem => ({
      id: r.id,
      reference: r.notice_number ?? r.id,
      employer: r.employer_name,
      status: r.status,
      priority: null,
      dueDate: r.due_response_date,
      link: `/compliance/enforcement/notices`,
    }));
  }, [] as WorkItem[]);
}

function fetchEmployerResponses() {
  // No ce_employer_responses table in current schema; return empty list gracefully.
  return Promise.resolve([] as WorkItem[]);
}

function fetchArrangementsAwaitingApproval(userId: string | null, userCode: string | null) {
  return safe(async () => {
    if (!userId) return [] as WorkItem[];

    // 1) Resolve every identifier the current user might own on ce_cases.assigned_officer_id
    //    (UUID + inspector_code + legacy_inspector_code). Same pattern as AssignedCases.
    const { data: inspectorRows } = await sb
      .from('ce_inspectors')
      .select('id, inspector_code, legacy_inspector_code')
      .eq('profile_id', userId);
    const officerIds = new Set<string>();
    (inspectorRows ?? []).forEach((r: any) => {
      if (r.id) officerIds.add(r.id);
      if (r.inspector_code) officerIds.add(r.inspector_code);
      if (r.legacy_inspector_code) officerIds.add(r.legacy_inspector_code);
    });
    if (userCode) officerIds.add(userCode);
    if (officerIds.size === 0) return [] as WorkItem[];

    // 2) Cases assigned to this officer.
    const { data: cases } = await sb
      .from('ce_cases')
      .select('id')
      .in('assigned_officer_id', Array.from(officerIds));
    const caseIds = (cases ?? []).map((c: any) => c.id).filter(Boolean);
    if (caseIds.length === 0) return [] as WorkItem[];

    // 3) Arrangements linked to those cases in a genuine awaiting-approval state.
    //    DRAFT is intentionally excluded — a draft is not yet submitted for approval.
    const { data, error } = await sb
      .from('ce_payment_arrangements')
      .select('id, arrangement_number, employer_name, status, next_due_date, case_id')
      .in('case_id', caseIds)
      .in('status', ['PENDING_APPROVAL', 'pending_approval', 'AWAITING_APPROVAL', 'awaiting_approval', 'SUBMITTED', 'submitted', 'PENDING', 'pending'])
      .order('next_due_date', { ascending: true, nullsFirst: false })
      .limit(200);
    if (error) return [] as WorkItem[];
    return (data ?? []).map((r: any): WorkItem => ({
      id: r.id,
      reference: r.arrangement_number ?? r.id,
      employer: r.employer_name,
      status: r.status,
      priority: null,
      dueDate: r.next_due_date,
      link: `/compliance/enforcement/arrangements`,
    }));
  }, [] as WorkItem[]);
}

function fetchWaiverRequests() {
  return safe(async () => {
    const { data, error } = await sb
      .from('ce_waivers')
      .select('id, waiver_number, employer_id, status, requested_at')
      .or('status.ilike.Pending%,status.eq.PENDING,status.eq.PENDING_APPROVAL,status.eq.pending_decision')
      .order('requested_at', { ascending: false, nullsFirst: false })
      .limit(200);
    if (error) return [] as WorkItem[];
    return (data ?? []).map((r: any): WorkItem => ({
      id: r.id,
      reference: r.waiver_number ?? r.id,
      employer: r.employer_id,
      status: r.status,
      priority: null,
      dueDate: r.requested_at,
      link: `/compliance/enforcement/waivers`,
    }));
  }, [] as WorkItem[]);
}

function fetchInspectionFindings() {
  return safe(async () => {
    // ce_inspection_findings has no review-status column; surface recent findings
    // without a linked violation as "awaiting review".
    const { data, error } = await sb
      .from('ce_inspection_findings')
      .select('id, finding_number, employer_name, severity, created_at, violation_id')
      .is('violation_id', null)
      .order('created_at', { ascending: false, nullsFirst: false })
      .limit(200);
    if (error) return [] as WorkItem[];
    return (data ?? []).map((r: any): WorkItem => ({
      id: r.id,
      reference: r.finding_number ?? r.id,
      employer: r.employer_name,
      status: 'Awaiting Review',
      priority: r.severity,
      dueDate: r.created_at,
      link: `/compliance/field/findings`,
    }));
  }, [] as WorkItem[]);
}

function fetchLegalRecommendations() {
  return safe(async () => {
    const { data, error } = await sb
      .from('ce_legal_referrals')
      .select('id, referral_number, employer_name, status, submitted_date')
      .in('status', ['DRAFT', 'PENDING', 'pending', 'SUBMITTED', 'submitted', 'IN_REVIEW', 'in_review', 'AWAITING_APPROVAL'])
      .order('submitted_date', { ascending: false, nullsFirst: false })
      .limit(200);
    if (error) return [] as WorkItem[];
    return (data ?? []).map((r: any): WorkItem => ({
      id: r.id,
      reference: r.referral_number ?? r.id,
      employer: r.employer_name,
      status: r.status,
      priority: null,
      dueDate: r.submitted_date,
      link: `/compliance/enforcement/recommendation-queue`,
    }));
  }, [] as WorkItem[]);
}

function fetchWorkflowTasks(userCode: string | null) {
  return safe(async () => {
    if (!userCode) return [] as WorkItem[];
    const { data, error } = await sb
      .from('workflow_tasks')
      .select('id, task_reference, subject_reference, status, priority, due_date')
      .eq('assigned_to', userCode)
      .in('status', ['open', 'pending', 'assigned', 'OPEN', 'PENDING'])
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(200);
    if (error) return [] as WorkItem[];
    return (data ?? []).map((r: any): WorkItem => ({
      id: r.id,
      reference: r.task_reference ?? r.id,
      employer: r.subject_reference,
      status: r.status,
      priority: r.priority,
      dueDate: r.due_date,
      link: `/workflow/tasks/${r.id}`,
    }));
  }, [] as WorkItem[]);
}

// ----- UI --------------------------------------------------------------------

function priorityTone(p?: string | null): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (!p) return 'outline';
  const v = p.toLowerCase();
  if (v.includes('critical') || v.includes('high')) return 'destructive';
  if (v.includes('medium')) return 'default';
  return 'secondary';
}

function SectionTable({
  items,
  isLoading,
  isError,
  emptyText,
}: {
  items: WorkItem[];
  isLoading: boolean;
  isError: boolean;
  emptyText: string;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...
      </div>
    );
  }
  if (isError) {
    return (
      <div className="py-10 text-center text-sm text-destructive">
        Could not load this section. Please refresh and try again.
      </div>
    );
  }
  if (!items.length) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">{emptyText}</div>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Reference</TableHead>
          <TableHead>Employer</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead>Due Date</TableHead>
          <TableHead className="w-24 text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((it) => (
          <TableRow key={it.id}>
            <TableCell className="font-medium">{it.reference || '—'}</TableCell>
            <TableCell>{it.employer || '—'}</TableCell>
            <TableCell>
              {it.status ? <Badge variant="outline">{it.status}</Badge> : '—'}
            </TableCell>
            <TableCell>
              {it.priority ? (
                <Badge variant={priorityTone(it.priority)}>{it.priority}</Badge>
              ) : (
                '—'
              )}
            </TableCell>
            <TableCell>{it.dueDate ? new Date(it.dueDate).toLocaleDateString() : '—'}</TableCell>
            <TableCell className="text-right">
              {it.link ? (
                <Link
                  to={it.link}
                  className="inline-flex items-center gap-1 text-primary hover:underline text-sm"
                >
                  Open <ExternalLink className="h-3 w-3" />
                </Link>
              ) : (
                '—'
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function useSection(key: string, userId: string | null, fetcher: () => Promise<WorkItem[]>) {
  return useQuery({
    queryKey: ['my-work-queue', key, userId],
    queryFn: fetcher,
    enabled: !!userId,
    staleTime: 60_000,
  });
}

function MyWorkQueueContent() {
  const { user, isAuthReady, isAuthenticated } = useSupabaseAuth() as any;
  const { userCode } = useUserCode();
  const userId: string | null = user?.id ?? null;
  const ready = isAuthReady && isAuthenticated && !!userId;

  // Capability gates — called unconditionally to keep hook order stable.
  const canViolations = useHasCapability(COMPLIANCE_CAPABILITIES.VIOLATIONS_MANAGE);
  const canCases = useHasCapability(COMPLIANCE_CAPABILITIES.CASES_MANAGE);
  const canNotices = useHasCapability(COMPLIANCE_CAPABILITIES.ENFORCEMENT_NOTICES);
  const canArrangements = useHasCapability(COMPLIANCE_CAPABILITIES.ENFORCEMENT_ARRANGEMENTS);
  const canLegal = useHasCapability(COMPLIANCE_CAPABILITIES.ENFORCEMENT_LEGAL);
  const canFieldReport = useHasCapability(COMPLIANCE_CAPABILITIES.FIELD_REPORT);

  const sections: SectionDef[] = useMemo(
    () => [
      {
        key: 'violations',
        label: 'Assigned Violations',
        enabled: canViolations,
        capability: COMPLIANCE_CAPABILITIES.VIOLATIONS_MANAGE,
        query: () => fetchAssignedViolations(userId, userCode),
      },
      {
        key: 'verification',
        label: 'Violations Awaiting Verification',
        enabled: canViolations && isComplianceFeatureEnabled('violations.verificationQueue'),
        capability: COMPLIANCE_CAPABILITIES.VIOLATIONS_MANAGE,
        query: () => fetchVerificationViolations(userId, userCode),
      },
      {
        key: 'cases',
        label: 'Assigned Cases',
        enabled: canCases,
        capability: COMPLIANCE_CAPABILITIES.CASES_MANAGE,
        query: () => fetchAssignedCases(userId, userCode),
      },
      {
        key: 'notices',
        label: 'Notices Awaiting Approval',
        enabled: canNotices,
        capability: COMPLIANCE_CAPABILITIES.ENFORCEMENT_NOTICES,
        query: () => fetchNoticesAwaitingApproval(),
        assumption:
          'ce_notices has no approver column; showing system-wide notices in DRAFT/PENDING_APPROVAL.',
      },
      {
        key: 'responses',
        label: 'Employer Responses Awaiting Review',
        enabled: canNotices,
        capability: COMPLIANCE_CAPABILITIES.ENFORCEMENT_NOTICES,
        query: () => fetchEmployerResponses(),
        assumption: 'No ce_employer_responses table in current schema.',
      },
      {
        key: 'arrangements',
        label: 'Payment Arrangements Awaiting Approval',
        enabled: canArrangements,
        capability: COMPLIANCE_CAPABILITIES.ENFORCEMENT_ARRANGEMENTS,
        query: () => fetchArrangementsAwaitingApproval(userId, userCode),
        assumption:
          'Shows only payment arrangements linked to cases assigned to you and in PENDING_APPROVAL / AWAITING_APPROVAL / SUBMITTED status.',
      },
      {
        key: 'waivers',
        label: 'Waiver Requests',
        enabled: canArrangements,
        capability: COMPLIANCE_CAPABILITIES.ENFORCEMENT_ARRANGEMENTS,
        query: () => fetchWaiverRequests(),
      },
      {
        key: 'findings',
        label: 'Inspection Findings Awaiting Review',
        enabled: canFieldReport && isComplianceFeatureEnabled('inspections'),
        capability: COMPLIANCE_CAPABILITIES.FIELD_REPORT,
        query: () => fetchInspectionFindings(),
      },
      {
        key: 'legal',
        label: 'Legal Escalation Recommendations',
        enabled: canLegal && isComplianceFeatureEnabled('legal.approvedEscalations'),
        capability: COMPLIANCE_CAPABILITIES.ENFORCEMENT_LEGAL,
        query: () => fetchLegalRecommendations(),
      },
      {
        key: 'tasks',
        label: 'Workflow Tasks',
        enabled: true,
        capability: null,
        query: () => fetchWorkflowTasks(userCode),
      },
    ],
    [userId, userCode, canViolations, canCases, canNotices, canArrangements, canLegal, canFieldReport],
  );

  const enabled = sections.filter((s) => s.enabled);

  // Hook order must be stable — call hooks for the fixed list.
  const queries = enabled.map((s) => useSection(s.key, ready ? userId : null, s.query));


  if (isAuthReady && !isAuthenticated) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Please sign in to view your work queue.
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalCount = queries.reduce((acc, q) => acc + (q.data?.length ?? 0), 0);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Inbox className="h-6 w-6 text-primary" /> My Work Queue
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Compliance items currently assigned to you across violations, cases, notices,
            inspections, and workflow tasks.
          </p>
        </div>
        <Badge variant="secondary" className="text-base px-3 py-1">
          {totalCount} item{totalCount === 1 ? '' : 's'}
        </Badge>
      </div>

      <PendingPlanningStrip officerUserCode={userCode} />

      {enabled.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Your role does not grant access to any work queue tabs. Contact your Compliance
            administrator if you believe this is incorrect.
          </CardContent>
        </Card>
      ) : (
      <Tabs defaultValue={enabled[0]?.key ?? 'violations'} className="space-y-4">

        <TabsList className="flex-wrap">
          {enabled.map((s, idx) => {
            const count = queries[idx].data?.length ?? 0;
            return (
              <TabsTrigger key={s.key} value={s.key} className="gap-2">
                {s.label}
                <Badge variant="outline" className="ml-1">
                  {count}
                </Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {enabled.map((s, idx) => {
          const q = queries[idx];
          return (
            <TabsContent key={s.key} value={s.key}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{s.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <SectionTable
                    items={q.data ?? []}
                    isLoading={q.isLoading}
                    isError={q.isError}
                    emptyText="No assigned items"
                  />
                  {s.assumption && (q.data?.length ?? 0) === 0 && !q.isLoading && (
                    <p className="mt-2 text-xs text-muted-foreground italic">{s.assumption}</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
      )}
    </div>
  );
}

export default function MyWorkQueue() {
  return (
    <PermissionWrapper moduleName={MODULE_NAME}>
      <MyWorkQueueContent />
    </PermissionWrapper>
  );
}
