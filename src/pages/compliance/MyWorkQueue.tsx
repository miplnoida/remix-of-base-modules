import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Inbox, Loader2, ExternalLink } from 'lucide-react';

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
    const orClause = ids.length
      ? `assigned_to_user_id.in.(${ids.join(',')}),assigned_to_user_id.is.null`
      : `assigned_to_user_id.is.null`;
    const { data, error } = await sb
      .from('ce_violations')
      .select('id, violation_number, employer_name, status, priority, due_date, assigned_to_user_id')
      .in('status', [
        'pending_verification',
        'PENDING_VERIFICATION',
        'verification_pending',
        'awaiting_verification',
        'UNDER_REVIEW',
      ])
      .or(orClause)
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

function fetchAssignedCases(userCode: string | null) {
  return safe(async () => {
    // ce_cases uses assigned_officer_id (varchar(10), holds the inspector/officer code).
    // Fall back to system-wide pending cases when no user code is available.
    let query = sb
      .from('ce_cases')
      .select('id, case_number, employer_name, status, priority, due_date, assigned_officer_id')
      .in('status', ['open', 'OPEN', 'ACTIVE', 'INVESTIGATION', 'in_progress', 'IN_PROGRESS', 'ESCALATED'])
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(200);
    if (userCode) query = query.eq('assigned_officer_id', userCode);
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

function fetchArrangementsAwaitingApproval() {
  return safe(async () => {
    const { data, error } = await sb
      .from('ce_payment_arrangements')
      .select('id, arrangement_number, employer_name, status, next_due_date')
      .in('status', ['DRAFT', 'PENDING_APPROVAL', 'pending_approval', 'AWAITING_APPROVAL', 'PENDING', 'SUBMITTED'])
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
        query: () => fetchAssignedViolations(userId!),
      },
      {
        key: 'verification',
        label: 'Violations Awaiting Verification',
        enabled: canViolations && isComplianceFeatureEnabled('violations.verificationQueue'),
        capability: COMPLIANCE_CAPABILITIES.VIOLATIONS_MANAGE,
        query: () => fetchVerificationViolations(userId!),
      },
      {
        key: 'cases',
        label: 'Assigned Cases',
        enabled: canCases,
        capability: COMPLIANCE_CAPABILITIES.CASES_MANAGE,
        query: () => fetchAssignedCases(userId!),
      },
      {
        key: 'notices',
        label: 'Notices Awaiting Approval',
        enabled: canNotices,
        capability: COMPLIANCE_CAPABILITIES.ENFORCEMENT_NOTICES,
        query: () => fetchNoticesAwaitingApproval(userId!),
        assumption:
          'Assumes ce_notices.approver_user_id (falls back to assigned_to_user_id) identifies the approver.',
      },
      {
        key: 'responses',
        label: 'Employer Responses Awaiting Review',
        enabled: canNotices,
        capability: COMPLIANCE_CAPABILITIES.ENFORCEMENT_NOTICES,
        query: () => fetchEmployerResponses(userId!),
        assumption: 'Assumes ce_employer_responses.reviewer_user_id identifies the reviewer.',
      },
      {
        key: 'arrangements',
        label: 'Payment Arrangements Awaiting Approval',
        enabled: canArrangements,
        capability: COMPLIANCE_CAPABILITIES.ENFORCEMENT_ARRANGEMENTS,
        query: () => fetchArrangementsAwaitingApproval(userId!),
        assumption:
          'Assumes ce_payment_arrangements.approver_user_id (falls back to assigned_to_user_id) identifies the approver.',
      },
      {
        key: 'waivers',
        label: 'Waiver Requests',
        enabled: canArrangements,
        capability: COMPLIANCE_CAPABILITIES.ENFORCEMENT_ARRANGEMENTS,
        query: () => fetchWaiverRequests(userId!),
      },
      {
        key: 'findings',
        label: 'Inspection Findings Awaiting Review',
        enabled: canFieldReport && isComplianceFeatureEnabled('inspections'),
        capability: COMPLIANCE_CAPABILITIES.FIELD_REPORT,
        query: () => fetchInspectionFindings(userId!),
      },
      {
        key: 'legal',
        label: 'Legal Escalation Recommendations',
        enabled: canLegal && isComplianceFeatureEnabled('legal.approvedEscalations'),
        capability: COMPLIANCE_CAPABILITIES.ENFORCEMENT_LEGAL,
        query: () => fetchLegalRecommendations(userId!),
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
