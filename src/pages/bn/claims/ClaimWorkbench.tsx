import { useUserCode } from '@/hooks/useUserCode';
/**
 * BN Claim Workbench — Full Enterprise Claim Processing Screen
 * 
 * Business Purpose:
 *   Allow users to create, edit, review, verify, process, suspend, close,
 *   and reopen claims within the existing benefit module.
 * 
 * How It Extends the Existing System:
 *   - Replaces the existing Claim360 view with a full workbench
 *   - Preserves bn_claim as the orchestration layer
 *   - Future: cl_head + cl_detail_* as the compatibility base
 *   - Future: cl_cheques for outbound payments (NEVER cn_payment)
 *   - Reuses workflow_instances, notification_templates
 * 
 * Sections:
 *   1. Claim Header (bn_claim core fields)
 *   2. Contributor/Claimant (ip_master read-only + claim contact editable)
 *   3. Employer Context (er_master lookup)
 *   4. Benefit Type / Product (bn_product)
 *   5. Period & Event Details (in benefit detail)
 *   6. Benefit-Specific Detail (bn_claim_detail.detail_json → future cl_detail_*)
 *   7. Evidence/Documents (bn_claim_evidence)
 *   8. Notes & Worklog (bn_claim_note)
 *   9. Linked Claims (bn_claim same SSN)
 *  10. Status History (bn_claim_event)
 *  11. Action Bar (transitions per claim status + role)
 * 
 * Route: /bn/claims/:id
 */
import React, { useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  ArrowLeft, FileText, Calculator, CheckCircle2,
  User, Building2, Stethoscope, MessageSquare,
  GitBranch, History, Shield, BarChart3,
} from 'lucide-react';

// Existing hooks
import { useBnClaim, useUpdateBnClaim, useBnClaimEvents, useBnClaimNotes, useAddBnClaimNote, useBnClaimEligibility, useBnClaimCalculations } from '@/hooks/bn/useBnClaim';
import { useBnPersonLookup, useBnEmployerLookup } from '@/hooks/bn/useBnIntegration';

// New workbench hooks
import { useBnLinkedClaims, useBnClaimStatusHistory, useBnClaimDetailJson, useUpsertBnClaimDetail, useExecuteClaimAction } from '@/hooks/bn/useBnClaimWorkbench';
import { useBnClaimWorkspace } from '@/hooks/bn/useBnClaimIntake';
import { getAvailableTransitions } from '@/services/bn/claimWorkbenchService';
import type { ClaimTransition } from '@/services/bn/claimWorkbenchService';

// Existing components
import { BnStatusBadge, BnStatCard, BnEmptyState } from '@/components/bn/shared';
import { BN_CLAIM_STATUS_LABELS } from '@/types/bn';
import { formatDateForDisplay } from '@/lib/format-config';
import { EvidenceChecklist } from '@/components/bn/evidence/EvidenceChecklist';
import { EvidenceAuditTimeline } from '@/components/bn/evidence/EvidenceAuditTimeline';
import { ClaimDecisionPanel } from '@/components/bn/claim/ClaimDecisionPanel';
import { ClaimDecisionTimeline } from '@/components/bn/claim/ClaimDecisionTimeline';
import { ClaimantProfileTab } from '@/components/bn/claim/ClaimantProfileTab';
import { ContributionsWagesTab } from '@/components/bn/claim/ContributionsWagesTab';
import { WorkflowAuditTab } from '@/components/bn/claim/WorkflowAuditTab';

// New workbench sections
import { ClaimHeaderSection } from '@/components/bn/workbench/ClaimHeaderSection';
import { ContributorSection } from '@/components/bn/workbench/ContributorSection';
import { EmployerSection } from '@/components/bn/workbench/EmployerSection';
import { BenefitDetailSection } from '@/components/bn/workbench/BenefitDetailSection';
import { NotesWorklogSection } from '@/components/bn/workbench/NotesWorklogSection';
import { LinkedClaimsPanel } from '@/components/bn/workbench/LinkedClaimsPanel';
import { StatusHistorySection } from '@/components/bn/workbench/StatusHistorySection';
import { ClaimActionBar } from '@/components/bn/workbench/ClaimActionBar';
import LegacyClaim360View from '@/components/bn/claim/LegacyClaim360View';
import { ClaimSnapshotsPanel } from '@/components/bn/claims/ClaimSnapshotsPanel';
import { ApplicationDetailsPanel, WorkflowTasksPanel, PaymentsPanel, channelLabel } from '@/components/bn/workbench/ClaimWorkspacePanels';
import { ClaimWorkbenchTabBoundary } from '@/components/bn/workbench/ClaimWorkbenchTabBoundary';
import { Badge } from '@/components/ui/badge';
import { CreditCard, ListChecks, Inbox } from 'lucide-react';
import { filterEditablePayload } from '@/lib/bn/fieldOwnership';


const EDITABLE_STATUSES = ['DRAFT', 'SUBMITTED', 'INTAKE_REVIEW', 'PENDING_INFO'];

export default function ClaimWorkbench() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Unified Claim 360: if the route id is a legacy synthetic id
  // (`legacy:CLAIMNUMBER:SEQ`), render the read-only legacy view
  // instead of the BN workbench. Source routing is decided here so
  // the rest of the workbench code keeps assuming a modern bn_claim.
  if (id && id.startsWith('legacy:')) {
    const [, claimNumber, seqStr] = id.split(':');
    const claimSeq = Number(seqStr);
    if (claimNumber && Number.isFinite(claimSeq)) {
      return <LegacyClaim360View claimNumber={claimNumber} claimSeq={claimSeq} />;
    }
  }



  // ── Core Data ──────────────────────────────────────────────────
  const { data: claim, isLoading } = useBnClaim(id);
  const { data: events = [] } = useBnClaimEvents(id);

  const { data: notes = [] } = useBnClaimNotes(id);
  const { data: eligibility = [] } = useBnClaimEligibility(id);
  const { data: calculations = [] } = useBnClaimCalculations(id);

  // ── Workbench Data ─────────────────────────────────────────────
  const { data: detailJson } = useBnClaimDetailJson(id);
  const { data: workspaceBundle } = useBnClaimWorkspace(id);
  const { data: linkedClaims = [], isLoading: linkedLoading } = useBnLinkedClaims(id, claim?.ssn);
  const { data: statusHistory = [], isLoading: historyLoading } = useBnClaimStatusHistory(id);

  // ── Lookups ────────────────────────────────────────────────────
  const { data: person, isLoading: personLoading } = useBnPersonLookup(claim?.ssn);
  const [employerRegNo, setEmployerRegNo] = useState<string>('');
  const [employerSearchTrigger, setEmployerSearchTrigger] = useState('');
  const { data: employer, isLoading: employerLoading } = useBnEmployerLookup(employerSearchTrigger);

  // ── Local edits ────────────────────────────────────────────────
  const [localUpdates, setLocalUpdates] = useState<Record<string, any>>({});
  const [localDetail, setLocalDetail] = useState<Record<string, any> | null>(null);

  // ── Mutations ──────────────────────────────────────────────────
  const updateClaim = useUpdateBnClaim();
  const addNote = useAddBnClaimNote();
  const upsertDetail = useUpsertBnClaimDetail();
  const executeAction = useExecuteClaimAction();

  // ── Derived State ──────────────────────────────────────────────
  const userRoles = ['Admin']; // TODO: get from auth context
  const { userCode: _uc } = useUserCode(); const userCode = _uc ?? '';

  const product = (claim as any)?.bn_product;
  const currentStatus = localUpdates.status || claim?.status || 'DRAFT';
  const isEditable = EDITABLE_STATUSES.includes(currentStatus);
  const hasUnsavedChanges = Object.keys(localUpdates).length > 0 || localDetail !== null;

  const availableTransitions = useMemo(() =>
    getAvailableTransitions(currentStatus, userRoles),
    [currentStatus, userRoles]
  );

  // Initialize employer search from claim
  React.useEffect(() => {
    if (claim?.employer_regno && !employerRegNo) {
      setEmployerRegNo(claim.employer_regno);
      setEmployerSearchTrigger(claim.employer_regno);
    }
  }, [claim?.employer_regno]);

  // ── Handlers ───────────────────────────────────────────────────
  const handleClaimUpdate = useCallback((field: string, value: any) => {
    setLocalUpdates(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleDetailChange = useCallback((key: string, value: any) => {
    setLocalDetail(prev => ({
      ...(prev || detailJson || {}),
      [key]: value,
    }));
  }, [detailJson]);

  const handleSave = async () => {
    try {
      if (Object.keys(localUpdates).length > 0 && id) {
        await updateClaim.mutateAsync({
          id,
          updates: { ...localUpdates, modified_by: userCode },
        });
      }
      if (localDetail && id) {
        // Filter so only STAFF_REVIEW / SUPERVISOR_DECISION fields the user
        // is allowed to write reach the DB. Citizen-submitted and
        // system-derived fields are dropped silently.
        const editable = filterEditablePayload(
          product?.category || 'SHORT_TERM',
          localDetail,
          claim?.status || '',
          userRoles,
        );
        // Merge into existing detailJson so we don't blow away prior staff edits.
        const persistJson = { ...(detailJson || {}), ...editable };
        if (Object.keys(editable).length > 0) {
          await upsertDetail.mutateAsync({
            claimId: id,
            detailJson: persistJson,
            userCode,
          });
        }
      }
      setLocalUpdates({});
      setLocalDetail(null);
      toast.success('Claim saved successfully');
    } catch (err: any) {
      toast.error('Save failed', { description: err?.message });
    }
  };

  const handleExecuteAction = async (transition: ClaimTransition, narrative?: string, reasonCode?: string) => {
    if (!id || !claim) return;

    // Save pending changes first
    if (hasUnsavedChanges) await handleSave();

    const result = await executeAction.mutateAsync({
      claimId: id,
      action: transition.action,
      fromStatus: claim.status,
      toStatus: transition.toStatus,
      userCode,
      narrative,
      reasonCode,
    });

    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error('Action failed', { description: result.message });
    }
  };

  const handleAddNote = async (note: { subject: string; body: string; is_internal: boolean }) => {
    if (!id) return;
    try {
      await addNote.mutateAsync({
        claim_id: id,
        subject: note.subject || undefined,
        body: note.body,
        is_internal: note.is_internal,
        entered_by: userCode,
      });
      toast.success('Note added');
    } catch (err: any) {
      toast.error('Failed to add note', { description: err?.message });
    }
  };

  // ── Guards ─────────────────────────────────────────────────────
  if (isLoading) return <BnEmptyState type="loading" title="Loading claim..." />;
  if (!claim) return <BnEmptyState type="error" title="Claim not found" description="The requested claim does not exist." />;

  const mergedClaim = { ...claim, ...localUpdates };
  // Merge precedence: local edits > saved detail_json > benefit_facts captured at intake
  const facts = (workspaceBundle?.application?.raw_application_json as any)?.benefit_facts ?? {};
  // Map intake form keys → workbench field keys so values entered during intake show up
  const factsAliased: Record<string, any> = {
    ...facts,
    incapacity_date: facts.incapacity_date ?? facts.illness_start_date ?? facts.injury_date ?? facts.onset_date,
    expected_return_date: facts.expected_return_date,
    retirement_date: facts.retirement_date ?? facts.last_worked_date,
    injury_date: facts.injury_date ?? facts.accident_date,
    date_of_death: facts.date_of_death ?? facts.deceased_date,
  };
  const mergedDetail = { ...factsAliased, ...(detailJson || {}), ...(localDetail || {}) };


  return (
    <div className="space-y-4 p-6">
      {/* Back + Title */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/bn/claims')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Claim Workbench — {claim.claim_number || claim.id.slice(0, 8)}
            </h1>
            <BnStatusBadge
              status={currentStatus}
              label={BN_CLAIM_STATUS_LABELS[currentStatus as keyof typeof BN_CLAIM_STATUS_LABELS] || currentStatus}
              dot
            />
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
            <span>{product?.benefit_name || 'Unknown Benefit'}</span>
            <span>•</span><span>SSN: {claim.ssn}</span>
            <span>•</span><span>Filed: {formatDateForDisplay(claim.claim_date)}</span>
            <span>•</span>
            <Badge variant="secondary" className="font-normal">
              Channel: {channelLabel((claim as any).application_channel ?? (claim as any).source)}
            </Badge>
            {claim.legacy_claim_ref && (
              <Badge variant="outline" className="font-normal">Legacy ref: {claim.legacy_claim_ref}</Badge>
            )}
          </p>
        </div>
      </div>

      {/* 11. Action Bar (sticky at top) */}
      <ClaimActionBar
        claimId={claim.id}
        currentStatus={currentStatus}
        availableTransitions={availableTransitions}
        onSave={handleSave}
        onExecuteAction={handleExecuteAction}
        isSaving={updateClaim.isPending || upsertDetail.isPending}
        isExecuting={executeAction.isPending}
        hasUnsavedChanges={hasUnsavedChanges}
      />

      {/* Decision Panel */}
      <ClaimDecisionPanel claimId={claim.id} userRoles={userRoles} productCategory={product?.category} />

      {/* Summary Strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <BnStatCard title="Claimant" value={claim.ssn} icon={User} subtitle={product?.benefit_name} />
        <BnStatCard
          title="Eligibility"
          value={eligibility.length > 0 ? (eligibility[0].overall_result ? 'Passed' : 'Failed') : 'Pending'}
          icon={CheckCircle2}
        />
        <BnStatCard
          title="Calculated Rate"
          value={calculations.length > 0 ? `$${(calculations[0].weekly_rate || 0).toFixed(2)}/wk` : 'Pending'}
          icon={Calculator}
        />
        <BnStatCard title="Events" value={events.length} icon={History} subtitle={`${notes.length} notes`} />
      </div>

      {/* Main Content — Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto bg-muted/50 p-1 flex-wrap h-auto gap-1">
          <TabsTrigger value="overview" className="gap-1.5"><FileText className="h-3.5 w-3.5" /> Overview</TabsTrigger>
          <TabsTrigger value="claimant" className="gap-1.5"><User className="h-3.5 w-3.5" /> Claimant</TabsTrigger>
          <TabsTrigger value="contributions" className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> Contributions</TabsTrigger>
          <TabsTrigger value="details" className="gap-1.5"><Stethoscope className="h-3.5 w-3.5" /> Benefit Details</TabsTrigger>
          <TabsTrigger value="eligibility" className="gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> Eligibility</TabsTrigger>
          <TabsTrigger value="calculation" className="gap-1.5"><Calculator className="h-3.5 w-3.5" /> Calculation</TabsTrigger>
          <TabsTrigger value="documents" className="gap-1.5"><FileText className="h-3.5 w-3.5" /> Documents</TabsTrigger>
          <TabsTrigger value="decisions" className="gap-1.5"><Shield className="h-3.5 w-3.5" /> Decisions</TabsTrigger>
          <TabsTrigger value="notes" className="gap-1.5"><MessageSquare className="h-3.5 w-3.5" /> Notes</TabsTrigger>
          <TabsTrigger value="linked" className="gap-1.5"><GitBranch className="h-3.5 w-3.5" /> Linked</TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5"><History className="h-3.5 w-3.5" /> History</TabsTrigger>
          <TabsTrigger value="workflow" className="gap-1.5"><GitBranch className="h-3.5 w-3.5" /> Workflow</TabsTrigger>
          <TabsTrigger value="tasks" className="gap-1.5"><ListChecks className="h-3.5 w-3.5" /> Tasks</TabsTrigger>
          <TabsTrigger value="application" className="gap-1.5"><Inbox className="h-3.5 w-3.5" /> Application</TabsTrigger>
          <TabsTrigger value="payments" className="gap-1.5"><CreditCard className="h-3.5 w-3.5" /> Payments</TabsTrigger>
          <TabsTrigger value="snapshots" className="gap-1.5"><FileText className="h-3.5 w-3.5" /> Snapshots</TabsTrigger>
        </TabsList>

        <TabsContent value="application" className="mt-6">
          <ClaimWorkbenchTabBoundary tabName="Application">
            <ApplicationDetailsPanel claimId={claim.id} productVersionId={(claim as any).product_version_id} />
          </ClaimWorkbenchTabBoundary>
        </TabsContent>

        <TabsContent value="tasks" className="mt-6">
          <ClaimWorkbenchTabBoundary tabName="Tasks">
            <WorkflowTasksPanel claimId={claim.id} workflowInstanceId={claim.workflow_instance_id} />
          </ClaimWorkbenchTabBoundary>
        </TabsContent>

        <TabsContent value="payments" className="mt-6">
          <ClaimWorkbenchTabBoundary tabName="Payments">
            <PaymentsPanel claimId={claim.id} />
          </ClaimWorkbenchTabBoundary>
        </TabsContent>

        <TabsContent value="snapshots" className="mt-6">
          <ClaimWorkbenchTabBoundary tabName="Snapshots">
            <ClaimSnapshotsPanel claimId={claim.id} />
          </ClaimWorkbenchTabBoundary>
        </TabsContent>


        {/* OVERVIEW — Sections 1, 2, 3 */}
        <TabsContent value="overview" className="mt-6 space-y-4">
          <ClaimHeaderSection
            claim={mergedClaim}
            isEditable={isEditable}
            onUpdate={handleClaimUpdate}
            userRoles={userRoles}
          />
          <ContributorSection
            person={person}
            isLoading={personLoading}
            claimContactPhone={mergedClaim.contact_phone}
            claimContactEmail={mergedClaim.contact_email}
            bankAccount={mergedClaim.bank_account}
            bankRoutingNumber={mergedClaim.bank_routing_number}
            isEditable={isEditable}
            onUpdate={handleClaimUpdate}
          />
          <EmployerSection
            employerRegNo={localUpdates.employer_regno ?? claim.employer_regno}
            employer={employer}
            employerLoading={employerLoading}
            isEditable={isEditable && EDITABLE_STATUSES.slice(0, 2).includes(currentStatus)}
            onRegNoChange={(v) => {
              handleClaimUpdate('employer_regno', v);
              setEmployerRegNo(v);
            }}
            onLookup={() => setEmployerSearchTrigger(employerRegNo)}
          />
        </TabsContent>

        {/* CLAIMANT — Full profile */}
        <TabsContent value="claimant" className="mt-6">
          <ClaimWorkbenchTabBoundary tabName="Claimant">
            <ClaimantProfileTab ssn={claim.ssn} />
          </ClaimWorkbenchTabBoundary>
        </TabsContent>

        {/* CONTRIBUTIONS */}
        <TabsContent value="contributions" className="mt-6">
          <ClaimWorkbenchTabBoundary tabName="Contributions">
            <ContributionsWagesTab ssn={claim.ssn} />
          </ClaimWorkbenchTabBoundary>
        </TabsContent>

        {/* BENEFIT DETAILS — Section 6 */}
        <TabsContent value="details" className="mt-6">
          <ClaimWorkbenchTabBoundary tabName="Benefit Details">
            <BenefitDetailSection
              category={product?.category || 'SHORT_TERM'}
              detailJson={mergedDetail}
              claimStatus={claim.status}
              roles={userRoles}
              onDetailChange={handleDetailChange}
            />
          </ClaimWorkbenchTabBoundary>
        </TabsContent>

        {/* ELIGIBILITY */}
        <TabsContent value="eligibility" className="mt-6">
          <ClaimWorkbenchTabBoundary tabName="Eligibility">
          {eligibility.length === 0 ? (
            <BnEmptyState type="empty" title="No eligibility checks" description="Run an eligibility check from the action bar." />
          ) : (
            <div className="space-y-4">
              {eligibility.map((check: any) => (
                <div key={check.id} className="rounded-lg border p-4 bg-card">
                  <div className="flex items-center justify-between">
                    <BnStatusBadge status={check.overall_result ? 'APPROVED' : 'DENIED'} label={check.overall_result ? 'ELIGIBLE' : 'NOT ELIGIBLE'} />
                    <span className="text-sm text-muted-foreground">{formatDateForDisplay(check.check_date)}</span>
                  </div>
                  {check.override_applied && (
                    <p className="mt-2 text-sm text-destructive">Override by {check.override_by}: {check.override_reason}</p>
                  )}
                  {Array.isArray(check.rule_results) && check.rule_results.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {check.rule_results.map((r: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <span className={r.passed ? 'text-emerald-600' : 'text-destructive'}>{r.passed ? '✓' : '✗'}</span>
                          <span>{r.rule_name}: {r.message}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          </ClaimWorkbenchTabBoundary>
        </TabsContent>

        {/* CALCULATION */}
        <TabsContent value="calculation" className="mt-6">
          <ClaimWorkbenchTabBoundary tabName="Calculation">
          {calculations.length === 0 ? (
            <BnEmptyState type="empty" title="No calculations" description="Run a calculation from the action bar." />
          ) : (
            <div className="space-y-4">
              {calculations.map((calc: any) => (
                <div key={calc.id} className="rounded-lg border p-4 bg-card">
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    {calc.weekly_rate != null && (
                      <div><p className="text-sm text-muted-foreground">Weekly Rate</p><p className="text-xl font-bold">${calc.weekly_rate.toFixed(2)}</p></div>
                    )}
                    {calc.monthly_rate != null && (
                      <div><p className="text-sm text-muted-foreground">Monthly Rate</p><p className="text-xl font-bold">${calc.monthly_rate.toFixed(2)}</p></div>
                    )}
                    {calc.lump_sum != null && (
                      <div><p className="text-sm text-muted-foreground">Lump Sum</p><p className="text-xl font-bold">${calc.lump_sum.toFixed(2)}</p></div>
                    )}
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">Calculated: {formatDateForDisplay(calc.calc_date)}</p>
                </div>
              ))}
            </div>
          )}
          </ClaimWorkbenchTabBoundary>
        </TabsContent>

        {/* DOCUMENTS — Section 7 */}
        <TabsContent value="documents" className="mt-6 space-y-6">
          <ClaimWorkbenchTabBoundary tabName="Documents">
            <EvidenceChecklist claimId={claim.id} userRoles={userRoles} />
            <EvidenceAuditTimeline claimId={claim.id} />
          </ClaimWorkbenchTabBoundary>
        </TabsContent>

        {/* DECISIONS */}
        <TabsContent value="decisions" className="mt-6">
          <ClaimWorkbenchTabBoundary tabName="Decisions">
            <ClaimDecisionTimeline claimId={claim.id} />
          </ClaimWorkbenchTabBoundary>
        </TabsContent>

        {/* NOTES — Section 8 */}
        <TabsContent value="notes" className="mt-6">
          <ClaimWorkbenchTabBoundary tabName="Notes">
            <NotesWorklogSection
              notes={notes as any[]}
              isLoading={false}
              userRoles={userRoles}
              onAddNote={handleAddNote}
              isAdding={addNote.isPending}
            />
          </ClaimWorkbenchTabBoundary>
        </TabsContent>

        {/* LINKED CLAIMS — Section 9 */}
        <TabsContent value="linked" className="mt-6">
          <ClaimWorkbenchTabBoundary tabName="Linked">
            <LinkedClaimsPanel linkedClaims={linkedClaims} isLoading={linkedLoading} />
          </ClaimWorkbenchTabBoundary>
        </TabsContent>

        {/* STATUS HISTORY — Section 10 */}
        <TabsContent value="history" className="mt-6">
          <ClaimWorkbenchTabBoundary tabName="History">
            <StatusHistorySection history={statusHistory} isLoading={historyLoading} />
          </ClaimWorkbenchTabBoundary>
        </TabsContent>

        {/* WORKFLOW */}
        <TabsContent value="workflow" className="mt-6">
          <ClaimWorkbenchTabBoundary tabName="Workflow">
            <WorkflowAuditTab claimId={claim.id} />
          </ClaimWorkbenchTabBoundary>
        </TabsContent>

      </Tabs>
    </div>
  );
}
