/**
 * Claim Intake / New Claim Registration — Screen 3 (Enhanced)
 *
 * Business Purpose: Register new benefit claims with full SSN lookup,
 * person profile preview, employment history, contribution summary,
 * auto-loaded evidence checklist, and bank account capture.
 *
 * Tables READ (via adapters): ip_master, ip_employer, cn_wages_credited, er_master, cl_bank_acct
 * Tables WRITE: bn_claim, bn_claim_detail, bn_claim_event, bn_claim_evidence
 *
 * Enhancements over shell:
 *   - Full person profile with address and dependants count
 *   - Employment history panel from ip_employer adapter
 *   - Contribution summary from contribution adapter
 *   - Auto-populate evidence checklist from bn_doc_requirement
 *   - Duplicate claim check (same SSN + product + active status)
 *   - Initial status: REGISTERED → auto event logged
 */
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft, Save, Search, User, CheckCircle2, AlertCircle,
  Briefcase, Building2, DollarSign, FileText, Loader2, AlertTriangle,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import { useBnProducts } from '@/hooks/bn/useBnProduct';
import { useCreateBnClaim, useBnClaims } from '@/hooks/bn/useBnClaim';
import { useBnClaimIntake } from '@/hooks/bn/useBnClaimIntake';
import { useBnPersonLookup, useBnContributionSummary, useBnEmployerLookup } from '@/hooks/bn/useBnIntegration';
import type { BnProduct } from '@/types/bn';
import { BnDetailRow, BnStatusBadge } from '@/components/bn/shared';
import { formatDateForDisplay } from '@/lib/format-config';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';

export default function ClaimRegistration() {
  const navigate = useNavigate();
  const { data: products = [] } = useBnProducts();
  const createClaim = useCreateBnClaim();
  const intake = useBnClaimIntake();

  const activeProducts = products.filter((p: BnProduct) => p.status === 'ACTIVE');

  const [form, setForm] = useState({
    ssn: '',
    product_id: '',
    employer_regno: '',
    source: 'WALK_IN',
    priority: 'NORMAL',
    contact_phone: '',
    contact_email: '',
    bank_account: '',
    bank_routing_number: '',
    remarks: '',
    event_date: '', // date of incident/sickness/etc
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  // ── SSN Lookup ─────────────────────────────────
  const [ssnSearch, setSsnSearch] = useState('');
  const { data: person, isLoading: personLoading } = useBnPersonLookup(ssnSearch);

  // ── Employer Lookup ────────────────────────────
  const [employerSearch, setEmployerSearch] = useState('');
  const { data: employer, isLoading: employerLoading } = useBnEmployerLookup(employerSearch);

  // ── Contribution Summary ───────────────────────
  const contribWindowEnd = new Date().toISOString().slice(0, 10);
  const contribWindowStart = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 3);
    return d.toISOString().slice(0, 10);
  }, []);
  const { data: contributions, isLoading: contribLoading } = useBnContributionSummary(
    ssnSearch || undefined,
    ssnSearch ? contribWindowStart : undefined,
    ssnSearch ? contribWindowEnd : undefined
  );

  // ── Duplicate Check ────────────────────────────
  const { data: existingClaims = [] } = useBnClaims({
    ssn: ssnSearch || undefined,
    limit: 50,
  });

  const duplicateWarning = useMemo(() => {
    if (!form.product_id || !ssnSearch) return null;
    const activeStatuses = ['DRAFT', 'SUBMITTED', 'INTAKE_REVIEW', 'ELIGIBILITY_CHECK', 'EVIDENCE_REVIEW', 'CALCULATION', 'DECISION', 'APPROVED', 'AWARD_SETUP', 'PAYMENT_QUEUE', 'IN_PAYMENT', 'PENDING_INFO'];
    const dup = existingClaims.find(
      (c: any) => c.product_id === form.product_id && activeStatuses.includes(c.status)
    );
    if (dup) {
      return `Active claim ${dup.claim_number || dup.id.slice(0, 8)} already exists for this person and benefit type (Status: ${dup.status})`;
    }
    return null;
  }, [form.product_id, ssnSearch, existingClaims]);

  // ── Auto-fill from person ──────────────────────
  useEffect(() => {
    if (person) {
      setForm(prev => ({
        ...prev,
        contact_phone: prev.contact_phone || person.phone || '',
        contact_email: prev.contact_email || person.email || '',
      }));
    }
  }, [person]);

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
    }
  };

  const handleSsnLookup = () => {
    if (form.ssn.trim()) {
      setSsnSearch(form.ssn.trim());
    }
  };

  const handleEmployerLookup = () => {
    if (form.employer_regno.trim()) {
      setEmployerSearch(form.employer_regno.trim());
    }
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.ssn.trim()) errs.ssn = 'SSN is required';
    if (!form.product_id) errs.product_id = 'Benefit type is required';
    if (!person && ssnSearch) errs.ssn = 'Person not found for this SSN';
    if (!ssnSearch) errs.ssn = 'Please search for the person first';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    setHasAttemptedSubmit(true);
    if (!validate()) {
      toast.error('Please check the form for valid information!', {
        description: Object.values(errors)[0] || 'Validation failed',
        classNames: { toast: '!bg-destructive', title: '!text-white', description: '!text-white !opacity-100' },
      });
      return;
    }

    if (duplicateWarning) {
      toast.error('Duplicate claim warning', {
        description: duplicateWarning,
        classNames: { toast: '!bg-destructive', title: '!text-white', description: '!text-white !opacity-100' },
      });
      return;
    }

    try {
      const selectedProduct = activeProducts.find((p: BnProduct) => p.id === form.product_id);
      const productCode = (selectedProduct as any)?.benefit_code;
      if (!productCode) throw new Error('Selected benefit has no code.');

      const result = await intake.mutateAsync({
        ssn: form.ssn,
        productCode,
        claimDate: form.event_date || new Date().toISOString().slice(0, 10),
        channel: 'STAFF_OFFLINE',
        employerRegno: form.employer_regno || null,
        formPayload: {
          source: form.source,
          priority: form.priority,
          contact_phone: form.contact_phone,
          contact_email: form.contact_email,
          bank_account: form.bank_account,
          bank_routing_number: form.bank_routing_number,
          remarks: form.remarks,
          declaration_accepted: true,
        },
      });
      toast.success(`Claim registered: ${result.claimNumber}`);
      navigate(`/bn/claims/${result.claimId}`);
    } catch (err: any) {
      toast.error('Failed to register claim', { description: err?.message });
    }
  };

  const errorCount = hasAttemptedSubmit ? Object.keys(errors).length : 0;

  return (
    <PermissionWrapper moduleName="bn_claims">
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/bn/claims')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Register New Claim</h1>
            <p className="text-sm text-muted-foreground">Create a new benefit application for an insured person</p>
          </div>
        </div>

        {/* Validation Summary */}
        {errorCount > 0 && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
            <span className="text-sm text-destructive">{errorCount} field(s) need attention</span>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* ── LEFT COLUMN: Lookup & Person Info ────────── */}
          <div className="space-y-4">
            {/* SSN Lookup */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4" /> Claimant Lookup
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>SSN <span className="text-destructive">*</span></Label>
                  <div className="flex gap-2">
                    <Input
                      value={form.ssn}
                      onChange={(e) => updateField('ssn', e.target.value)}
                      placeholder="Enter SSN"
                      maxLength={20}
                      className={errors.ssn ? 'border-destructive' : ''}
                      onKeyDown={(e) => e.key === 'Enter' && handleSsnLookup()}
                    />
                    <Button variant="outline" size="icon" onClick={handleSsnLookup} disabled={personLoading}>
                      {personLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </Button>
                  </div>
                  {errors.ssn && <p className="text-xs text-destructive">{errors.ssn}</p>}
                </div>

                {/* Person Preview */}
                {person && (
                  <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">{person.fullName}</span>
                      <BnStatusBadge status={person.status.toUpperCase()} size="sm" className="ml-auto" />
                    </div>
                    <BnDetailRow label="DOB" value={formatDateForDisplay(person.dateOfBirth)} />
                    <BnDetailRow label="Gender" value={person.gender === 'M' ? 'Male' : person.gender === 'F' ? 'Female' : 'Not-Specified'} />
                    {person.phone && <BnDetailRow label="Phone" value={person.phone} />}
                    {person.email && <BnDetailRow label="Email" value={person.email} />}
                    {person.address && (
                      <BnDetailRow label="Address" value={`${person.address.line1}${person.address.line2 ? ', ' + person.address.line2 : ''}`} />
                    )}
                    <div className="flex items-center gap-1 pt-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-xs text-emerald-600">Person verified</span>
                    </div>
                  </div>
                )}
                {ssnSearch && !personLoading && !person && (
                  <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <span className="text-sm text-destructive">No person found for SSN {ssnSearch}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contribution Summary */}
            {ssnSearch && person && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="h-4 w-4" /> Contribution Summary
                  </CardTitle>
                  <CardDescription>Last 3 years</CardDescription>
                </CardHeader>
                <CardContent>
                  {contribLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : contributions ? (
                    <div className="space-y-2">
                      <BnDetailRow label="Total Weeks" value={contributions.totalWeeks.toString()} />
                      <BnDetailRow label="Total Amount" value={`$${contributions.totalAmount.toLocaleString()}`} />
                      <BnDetailRow label="Avg Weekly Wage" value={`$${contributions.averageWeeklyWage.toFixed(2)}`} />
                      <BnDetailRow label="Period" value={`${formatDateForDisplay(contributions.windowStart)} – ${formatDateForDisplay(contributions.windowEnd)}`} />
                      {contributions.totalWeeks < 26 && (
                        <div className="flex items-center gap-1 pt-1">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                          <span className="text-xs text-amber-600">Below 26-week minimum for most benefits</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No contribution data available</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Payment Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-4 w-4" /> Payment Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Bank Account</Label>
                  <Input value={form.bank_account} onChange={(e) => updateField('bank_account', e.target.value)} placeholder="Account number" />
                </div>
                <div className="space-y-2">
                  <Label>Routing / Branch Code</Label>
                  <Input value={form.bank_routing_number} onChange={(e) => updateField('bank_routing_number', e.target.value)} placeholder="Routing number" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── RIGHT COLUMN: Claim Details ──────────────── */}
          <div className="lg:col-span-2 space-y-4">
            {/* Duplicate Warning */}
            {duplicateWarning && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 p-3 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Duplicate Claim Warning</p>
                  <p className="text-xs text-amber-700 dark:text-amber-300">{duplicateWarning}</p>
                </div>
              </div>
            )}

            {/* Claim Details */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Claim Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Benefit Type <span className="text-destructive">*</span></Label>
                    <Select value={form.product_id} onValueChange={(v) => updateField('product_id', v)}>
                      <SelectTrigger className={errors.product_id ? 'border-destructive' : ''}>
                        <SelectValue placeholder="Select benefit type" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeProducts.map((p: BnProduct) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.benefit_name} ({p.benefit_code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.product_id && <p className="text-xs text-destructive">{errors.product_id}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label>Source</Label>
                    <Select value={form.source} onValueChange={(v) => updateField('source', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="WALK_IN">Walk-in</SelectItem>
                        <SelectItem value="PAPER">Paper Application</SelectItem>
                        <SelectItem value="ONLINE">Online</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select value={form.priority} onValueChange={(v) => updateField('priority', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">Low</SelectItem>
                        <SelectItem value="NORMAL">Normal</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="URGENT">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Event / Incident Date</Label>
                    <Input
                      type="date"
                      value={form.event_date}
                      onChange={(e) => updateField('event_date', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Employer Context */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4" /> Employer Context
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <div className="flex-1 space-y-2">
                    <Label>Employer Registration No.</Label>
                    <div className="flex gap-2">
                      <Input
                        value={form.employer_regno}
                        onChange={(e) => updateField('employer_regno', e.target.value)}
                        placeholder="e.g. ER-001"
                        onKeyDown={(e) => e.key === 'Enter' && handleEmployerLookup()}
                      />
                      <Button variant="outline" size="icon" onClick={handleEmployerLookup} disabled={employerLoading}>
                        {employerLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
                {employer && (
                  <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">{employer.name}</span>
                      <Badge variant="outline" className="ml-auto text-xs">{employer.status}</Badge>
                    </div>
                    {employer.industry && <BnDetailRow label="Industry" value={employer.industry} />}
                    {employer.address && <BnDetailRow label="Address" value={employer.address} />}
                  </div>
                )}
                {employerSearch && !employerLoading && !employer && (
                  <p className="text-xs text-muted-foreground">No employer found for {employerSearch}</p>
                )}
              </CardContent>
            </Card>

            {/* Contact Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Contact Information</CardTitle>
                <CardDescription>Auto-filled from person record if available</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Contact Phone</Label>
                    <Input value={form.contact_phone} onChange={(e) => updateField('contact_phone', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Email</Label>
                    <Input value={form.contact_email} onChange={(e) => updateField('contact_email', e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Remarks */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Remarks</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={form.remarks}
                  onChange={(e) => updateField('remarks', e.target.value)}
                  rows={3}
                  placeholder="Any additional notes about this claim..."
                  maxLength={250}
                />
                <p className="text-xs text-muted-foreground mt-1 text-right">{form.remarks.length}/250</p>
              </CardContent>
            </Card>

            {/* Action Bar */}
            <div className="flex justify-end gap-3 rounded-lg border bg-card p-4 sticky bottom-0">
              <Button variant="outline" onClick={() => navigate('/bn/claims')}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={intake.isPending} className="gap-2">
                {intake.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {intake.isPending ? 'Registering...' : 'Register Claim'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </PermissionWrapper>
  );
}
