import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';
import { PermissionButton } from '@/components/ui/permission-button';
import { useViolationTypeOptions } from '@/components/compliance/ViolationFiltersBar';
import { supabase } from '@/integrations/supabase/client';
import { useUserCode } from '@/hooks/useUserCode';
import { caseViolationService } from '@/services/caseViolationService';
import { toast } from 'sonner';
import { resolveMany, buildSnapshot, type ResolvedVariable } from '@/services/compliance/policyResolver';
import { RefreshCw, Settings2, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CompliantEmployerPicker } from '@/components/compliance/CompliantEmployerPicker';

const MODULE = 'manage_compliance';
const FUND_LABELS: Record<string, string> = {
  SS: 'Social Security', LV: 'Levy', EI: 'Employment Injury', SV: 'Severance', PE: 'Pension',
};

function ManualViolationEntryInner() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userCode } = useUserCode();
  const { data: violationTypes = [], isLoading: typesLoading } = useViolationTypeOptions();

  const [entryType, setEntryType] = useState<'employer' | 'scouting'>('employer');
  const [violationTypeId, setViolationTypeId] = useState<string>('');
  const [fundType, setFundType] = useState<string>('');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('Medium');
  const [territory, setTerritory] = useState<'St Kitts' | 'Nevis'>('St Kitts');
  const [periodFrom, setPeriodFrom] = useState('');
  const [assignToMe, setAssignToMe] = useState(true);
  const [dueDate, setDueDate] = useState('');
  const [employerId, setEmployerId] = useState('');
  const [employerName, setEmployerName] = useState('');
  const [candidateBusinessName, setCandidateBusinessName] = useState('');
  const [candidateLocation, setCandidateLocation] = useState('');
  const [candidateActivityType, setCandidateActivityType] = useState('');
  const [estimatedEmployees, setEstimatedEmployees] = useState('');
  const [triggerWorkflow, setTriggerWorkflow] = useState(false);
  const [createCase, setCreateCase] = useState(false);
  const [loading, setLoading] = useState(false);
  // Issue #4 — financial fields when the violation type is payment/contribution
  const [expectedAmount, setExpectedAmount] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [penaltyAmount, setPenaltyAmount] = useState('');
  const [interestAmount, setInterestAmount] = useState('');

  // Policy defaults resolved live from c3_calculation_config via ce_rule_variable_mappings.
  // SNAPSHOT CONTRACT: resolved values are loaded once on mount for display + saved as
  // a frozen snapshot on insert. They are NOT re-resolved when the user later opens the
  // violation, so historical violations stay immutable when Finance changes a rate.
  const POLICY_KEYS = useMemo(
    () => ['grace_period', 'levy_penalty_initial_rate', 'additional_rate_per_month',
           'severance_penalty_rate', 'ss_fine_initial_rate', 'interest_rate'],
    [],
  );
  const [policyDefaults, setPolicyDefaults] = useState<ResolvedVariable[]>([]);
  const [policyLoading, setPolicyLoading] = useState(false);

  const loadPolicyDefaults = async () => {
    setPolicyLoading(true);
    try {
      const list = await resolveMany(POLICY_KEYS);
      setPolicyDefaults(list);
    } catch {
      // Non-blocking — defaults are informational
    } finally {
      setPolicyLoading(false);
    }
  };

  useEffect(() => {
    loadPolicyDefaults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const prefill = (location.state as any)?.prefill;
    if (prefill?.employer_id) {
      setEmployerId(prefill.employer_id);
      setEmployerName(prefill.employer_name || '');
      setEntryType('employer');
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const selectedType: any = useMemo(
    () => violationTypes.find((t: any) => t.id === violationTypeId),
    [violationTypes, violationTypeId],
  );
  const applicableFunds: string[] = selectedType?.applicable_funds || [];
  // Issue #4 — Categories that should expose amount fields. Payment-related
  // violations need expected / paid / penalty / interest so the violation
  // carries a meaningful total, just like the auto-detector populates.
  const hasFinancialFields = useMemo(() => {
    const cat = (selectedType?.category || '').toUpperCase();
    return ['PAYMENT', 'CONTRIBUTION', 'DECLARATION'].includes(cat);
  }, [selectedType]);

  useEffect(() => {
    // Reset fund when violation type changes if not applicable
    if (applicableFunds.length > 0 && !applicableFunds.includes(fundType)) {
      setFundType(applicableFunds[0]);
    }
  }, [violationTypeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Derived shortfall for payment-style violations
  const shortfall = useMemo(() => {
    const expected = parseFloat(expectedAmount) || 0;
    const paid = parseFloat(paidAmount) || 0;
    return Math.max(0, expected - paid);
  }, [expectedAmount, paidAmount]);
  const computedTotal = useMemo(() => {
    return shortfall + (parseFloat(penaltyAmount) || 0) + (parseFloat(interestAmount) || 0);
  }, [shortfall, penaltyAmount, interestAmount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!violationTypeId) {
      toast.error('Please select a violation type');
      return;
    }
    if (entryType === 'employer' && !employerId) {
      toast.error('Please enter an Employer ID');
      return;
    }
    if (entryType === 'scouting' && !candidateBusinessName) {
      toast.error('Please enter Business Name');
      return;
    }
    if (applicableFunds.length > 0 && !fundType) {
      toast.error('Please select a fund');
      return;
    }

    try {
      setLoading(true);
      const violationNumber = `VIO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(16).slice(2, 10).toUpperCase()}`;

      // Use the name already captured by the picker; fall back to a single
      // round-trip if the user came in via prefill without a name.
      let resolvedEmployerName: string | undefined = employerName;
      if (entryType === 'employer' && employerId && !resolvedEmployerName) {
        const { data: emp } = await supabase
          .from('er_master').select('name').eq('regno', employerId).maybeSingle();
        resolvedEmployerName = emp?.name ?? undefined;
      }

      // Issue #4 — Persist amount fields for payment/contribution types.
      const principal = hasFinancialFields ? shortfall : 0;
      const penalty = hasFinancialFields ? (parseFloat(penaltyAmount) || 0) : 0;
      const interest = hasFinancialFields ? (parseFloat(interestAmount) || 0) : 0;
      const total = hasFinancialFields ? computedTotal : 0;

      const performer = userCode || 'UNKNOWN';
      const { data: inserted, error } = await supabase
        .from('ce_violations')
        .insert({
          violation_number: violationNumber,
          employer_id: entryType === 'employer' ? employerId : null,
          employer_name: resolvedEmployerName ?? candidateBusinessName,
          territory,
          violation_type_id: violationTypeId,
          fund_type: fundType || null,
          severity: selectedType?.severity_default ?? null,
          status: 'OPEN',
          priority,
          summary,
          description,
          period_from: periodFrom || null,
          principal_amount: principal,
          penalty_amount: penalty,
          interest_amount: interest,
          total_amount: total,
          is_unlinked: entryType === 'scouting',
          candidate_business_name: entryType === 'scouting' ? candidateBusinessName : null,
          candidate_location: entryType === 'scouting' ? candidateLocation : null,
          candidate_activity_type: entryType === 'scouting' ? candidateActivityType : null,
          estimated_employees: entryType === 'scouting' ? (parseInt(estimatedEmployees) || null) : null,
          assigned_to_user_id: assignToMe ? performer : null,
          due_date: dueDate || null,
          discovered_date: new Date().toISOString().slice(0, 10),
          discovered_by: performer,
          source_type: 'MANUAL',
          created_by: performer,
          // Freeze a snapshot of policy parameters at creation time.
          // Re-resolves are NOT performed on edit/reopen — historical violations
          // never change when Finance later updates c3_calculation_config.
          parameters_snapshot: policyDefaults.length > 0
            ? {
                ...buildSnapshot(policyDefaults),
                // Also freeze the user-entered amounts so historical reports
                // can reconstruct how the total was derived.
                amounts: hasFinancialFields ? {
                  expected: parseFloat(expectedAmount) || 0,
                  paid: parseFloat(paidAmount) || 0,
                  shortfall: principal,
                  penalty,
                  interest,
                  total,
                } : null,
              }
            : null,
        } as any)
        .select('*')
        .single();

      if (error) throw error;

      // Persist evidence notes through the violation notes service so it's auditable
      if (evidenceNotes.trim()) {
        await supabase.from('ce_violation_history').insert({
          violation_id: inserted.id,
          action: 'EVIDENCE_NOTE',
          to_value: 'OPEN',
          notes: evidenceNotes.trim(),
          performed_by: performer,
        } as any);
      }

      // Optional workflow trigger (placeholder hook — respects configuration)
      if (triggerWorkflow) {
        await supabase.from('ce_violation_history').insert({
          violation_id: inserted.id,
          action: 'WORKFLOW_REQUESTED',
          to_value: 'PENDING',
          notes: 'Workflow trigger requested at manual entry',
          performed_by: performer,
        } as any);
      }

      // Optional case attach/create
      if (createCase && entryType === 'employer' && employerId) {
        try {
          await caseViolationService.findOrCreateCaseForEscalation(
            {
              id: inserted.id,
              violation_number: inserted.violation_number,
              employer_id: employerId,
              employer_name: employerName,
              territory,
              priority,
              total_amount: 0,
            },
            performer,
          );
        } catch (caseErr) {
          console.warn('Case attach failed', caseErr);
        }
      }

      toast.success('Violation created successfully');
      navigate(`/compliance/violations/${inserted.id}`);
    } catch (error: any) {
      toast.error('Failed to create violation', { description: error?.message });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Manual Violation Entry"
        subtitle="Create a violation manually from field observations or desk review"
        breadcrumbs={[
          { label: 'Compliance', href: '/compliance' },
          { label: 'Violations', href: '/compliance/violations' },
          { label: 'Manual Entry' },
        ]}
      />

      <Card>
        <CardHeader><CardTitle>Violation Entry Type</CardTitle></CardHeader>
        <CardContent>
          <Tabs value={entryType} onValueChange={(value: any) => setEntryType(value)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="employer">Registered Employer</TabsTrigger>
              <TabsTrigger value="scouting">Scouting / Unregistered</TabsTrigger>
            </TabsList>

            <form onSubmit={handleSubmit} className="mt-6 space-y-6">
              <TabsContent value="employer" className="space-y-4">
                <div className="space-y-2">
                  <Label>Employer ID *</Label>
                  <Input value={employerId} onChange={(e) => setEmployerId(e.target.value)} placeholder="EMP-2024-001" />
                </div>
              </TabsContent>

              <TabsContent value="scouting" className="space-y-4">
                <div className="space-y-2">
                  <Label>Business Name *</Label>
                  <Input value={candidateBusinessName} onChange={(e) => setCandidateBusinessName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Location *</Label>
                  <Input value={candidateLocation} onChange={(e) => setCandidateLocation(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Activity Type</Label>
                    <Input value={candidateActivityType} onChange={(e) => setCandidateActivityType(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Estimated Employees</Label>
                    <Input type="number" value={estimatedEmployees} onChange={(e) => setEstimatedEmployees(e.target.value)} min="0" />
                  </div>
                </div>
              </TabsContent>

              <div className="space-y-4 pt-4 border-t">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Territory *</Label>
                    <Select value={territory} onValueChange={(v: any) => setTerritory(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="St Kitts">St Kitts</SelectItem>
                        <SelectItem value="Nevis">Nevis</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Violation Type *</Label>
                    <Select value={violationTypeId} onValueChange={setViolationTypeId} disabled={typesLoading}>
                      <SelectTrigger><SelectValue placeholder={typesLoading ? 'Loading...' : 'Select type'} /></SelectTrigger>
                      <SelectContent>
                        {violationTypes.map((t: any) => (
                          <SelectItem key={t.id} value={t.id}>{t.code} — {t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {applicableFunds.length > 0 && (
                  <div className="space-y-2">
                    <Label>Applicable Fund *</Label>
                    <Select value={fundType} onValueChange={setFundType}>
                      <SelectTrigger><SelectValue placeholder="Select fund" /></SelectTrigger>
                      <SelectContent>
                        {applicableFunds.map((f) => (
                          <SelectItem key={f} value={f}>{FUND_LABELS[f] || f}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Period (YYYY-MM)</Label>
                    <Input type="month" value={periodFrom} onChange={(e) => setPeriodFrom(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Due Date (Optional)</Label>
                    <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Summary *</Label>
                  <Input value={summary} onChange={(e) => setSummary(e.target.value)} required />
                </div>

                <div className="space-y-2">
                  <Label>Detailed Description</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
                </div>

                <div className="space-y-2">
                  <Label>Evidence Notes</Label>
                  <Textarea
                    value={evidenceNotes}
                    onChange={(e) => setEvidenceNotes(e.target.value)}
                    placeholder="Describe supporting evidence, document references, photos, witnesses…"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Priority *</Label>
                  <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Policy Defaults — live from C3 Configuration, frozen on Save */}
                <div className="rounded-lg border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-900/10 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Settings2 className="h-4 w-4 text-amber-600" />
                      <span className="text-sm font-medium text-amber-800 dark:text-amber-300">Policy Defaults (C3 Configuration)</span>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={loadPolicyDefaults} disabled={policyLoading} className="h-7">
                      <RefreshCw className={`h-3 w-3 mr-1 ${policyLoading ? 'animate-spin' : ''}`} />
                      Reload defaults
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    These values are pulled live from C3 Configuration. They are frozen into this violation on Save — later changes to C3 Configuration will NOT alter this record.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {policyDefaults.map(r => (
                      <Badge key={r.variable_key} variant="outline" className="text-[10px] bg-background font-normal">
                        {r.display_name}: <span className="font-mono ml-1">{r.unresolved ? '—' : r.value}</span>
                      </Badge>
                    ))}
                    {!policyLoading && policyDefaults.length === 0 && (
                      <span className="text-[11px] text-muted-foreground italic">No policy defaults available</span>
                    )}
                  </div>
                </div>


                <div className="space-y-2 pt-2 border-t">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="assign-me" checked={assignToMe} onCheckedChange={(c) => setAssignToMe(c as boolean)} />
                    <label htmlFor="assign-me" className="text-sm font-medium">Assign to me</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="trigger-wf" checked={triggerWorkflow} onCheckedChange={(c) => setTriggerWorkflow(c as boolean)} />
                    <label htmlFor="trigger-wf" className="text-sm font-medium">Trigger workflow if configured</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="create-case" checked={createCase} onCheckedChange={(c) => setCreateCase(c as boolean)} disabled={entryType !== 'employer'} />
                    <label htmlFor="create-case" className="text-sm font-medium">Create or attach to a compliance case</label>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button type="button" variant="outline" onClick={() => navigate('/compliance/violations')}>
                  Cancel
                </Button>
                <PermissionButton
                  moduleName={MODULE}
                  actionName="create"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create Violation'}
                </PermissionButton>
              </div>
            </form>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ManualViolationEntry() {
  return (
    <PermissionWrapper moduleName={MODULE}>
      <ManualViolationEntryInner />
    </PermissionWrapper>
  );
}
