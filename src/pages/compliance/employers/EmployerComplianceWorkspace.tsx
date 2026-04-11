import React, { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ArrowLeft, Building2, Shield, AlertTriangle, FileText, DollarSign,
  Scale, TrendingUp, Phone, Mail, MapPin, Search, Activity,
  Flag, Clock, Gavel, HandCoins, Eye, Plus, BarChart3, RefreshCw
} from 'lucide-react';
import {
  useEmployerComplianceProfile,
  useEmployerComplianceFlags,
  useEmployerStatusHistory,
  useEmployerViolations,
  useEmployerCases,
  useEmployerLedgerRecent,
} from '@/hooks/compliance/useEmployerComplianceProfile';
import { formatDateForDisplay } from '@/lib/format-config';

// ─── Helpers ──────────────────────────────────────────────
const statusColor = (s: string | null) => {
  switch (s) {
    case 'compliant': return 'bg-emerald-500/15 text-emerald-700 border-emerald-300';
    case 'non_compliant': return 'bg-destructive/15 text-destructive border-destructive/30';
    case 'under_review': return 'bg-amber-500/15 text-amber-700 border-amber-300';
    case 'suspended': return 'bg-red-600/15 text-red-700 border-red-400';
    case 'exempt': return 'bg-blue-500/15 text-blue-700 border-blue-300';
    default: return 'bg-muted text-muted-foreground border-border';
  }
};
const riskBandColor = (b: string | null) => {
  switch (b?.toLowerCase()) {
    case 'critical': return 'bg-red-600/15 text-red-700';
    case 'high': return 'bg-orange-500/15 text-orange-700';
    case 'medium': return 'bg-amber-500/15 text-amber-700';
    case 'low': return 'bg-emerald-500/15 text-emerald-700';
    default: return 'bg-muted text-muted-foreground';
  }
};
const fmt = (n: number | null | undefined) =>
  n != null ? `$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '$0.00';

// ─── Main Component ───────────────────────────────────────
const EmployerComplianceWorkspace = () => {
  const { id: employerId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [localEmployerId, setLocalEmployerId] = useState(employerId || '');

  const resolvedId = employerId || localEmployerId;
  const [isRecomputing, setIsRecomputing] = useState(false);

  const { data: profile, isLoading, refetch } = useEmployerComplianceProfile(resolvedId || undefined);
  const { data: flags } = useEmployerComplianceFlags(resolvedId || undefined);
  const { data: statusHistory } = useEmployerStatusHistory(resolvedId || undefined);
  const { data: violations } = useEmployerViolations(resolvedId || undefined);
  const { data: cases } = useEmployerCases(resolvedId || undefined);
  const { data: ledger } = useEmployerLedgerRecent(resolvedId || undefined);

  const handleRecompute = useCallback(async () => {
    if (!resolvedId) return;
    setIsRecomputing(true);
    try {
      const { error: e1 } = await supabase.rpc('ce_recompute_employer_compliance' as any, {
        p_employer_id: resolvedId, p_triggered_by: 'ADMIN_UI'
      });
      if (e1) throw e1;
      const { error: e2 } = await supabase.rpc('ce_recompute_employer_risk' as any, {
        p_employer_id: resolvedId, p_triggered_by: 'ADMIN_UI'
      });
      if (e2) throw e2;
      toast.success('Compliance and risk scores recomputed successfully');
      refetch();
    } catch (err: any) {
      toast.error('Recompute failed', { description: err.message });
    } finally {
      setIsRecomputing(false);
    }
  }, [resolvedId, refetch]);

  // ─── Search bar (when no employer in URL) ─────────
  if (!employerId && !localEmployerId) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Employer Compliance Workspace</h1>
            <p className="text-muted-foreground text-sm">Search for an employer to view their compliance profile</p>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-3 max-w-lg">
              <Input
                placeholder="Enter employer registration number..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && searchTerm.trim()) setLocalEmployerId(searchTerm.trim()); }}
              />
              <Button onClick={() => { if (searchTerm.trim()) setLocalEmployerId(searchTerm.trim()); }}>
                <Search className="h-4 w-4 mr-2" /> Search
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-3 text-muted-foreground">Loading employer compliance profile...</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-6 p-6">
        <Button variant="ghost" onClick={() => { setLocalEmployerId(''); navigate(-1); }}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            No employer found with registration number: <strong>{resolvedId}</strong>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
          <Building2 className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">{profile.employer_name}</h1>
            <p className="text-muted-foreground text-sm">
              Reg: {profile.employer_id} · Territory: {profile.territory || 'N/A'} · Office: {profile.office_code || 'N/A'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={statusColor(profile.compliance_status)}>
            {(profile.compliance_status || 'unknown').replace(/_/g, ' ').toUpperCase()}
          </Badge>
          <Badge className={riskBandColor(profile.risk_band)}>
            {profile.risk_band || 'Unscored'}
          </Badge>
          <Button variant="outline" size="sm" onClick={handleRecompute} disabled={isRecomputing}>
            <Activity className={`h-3.5 w-3.5 mr-1 ${isRecomputing ? 'animate-spin' : ''}`} /> {isRecomputing ? 'Recomputing...' : 'Recompute'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <KpiCard icon={DollarSign} label="Outstanding" value={fmt(profile.outstanding_balance)} color={profile.outstanding_balance > 0 ? 'text-destructive' : 'text-emerald-600'} />
        <KpiCard icon={TrendingUp} label="Risk Score" value={profile.risk_score?.toFixed(1) || '—'} color="text-foreground" />
        <KpiCard icon={AlertTriangle} label="Violations" value={String(profile.active_violation_count)} color={profile.active_violation_count > 0 ? 'text-amber-600' : 'text-muted-foreground'} />
        <KpiCard icon={FileText} label="Cases" value={String(profile.active_case_count)} color={profile.active_case_count > 0 ? 'text-orange-600' : 'text-muted-foreground'} />
        <KpiCard icon={Flag} label="Flags" value={String(profile.active_flags_count)} color={profile.active_flags_count > 0 ? 'text-red-600' : 'text-muted-foreground'} />
        <KpiCard icon={Building2} label="Related" value={String(profile.related_employers_count)} color="text-muted-foreground" />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="overview"><Shield className="h-3.5 w-3.5 mr-1" />Overview</TabsTrigger>
          <TabsTrigger value="financial"><DollarSign className="h-3.5 w-3.5 mr-1" />Financial</TabsTrigger>
          <TabsTrigger value="enforcement"><Gavel className="h-3.5 w-3.5 mr-1" />Enforcement</TabsTrigger>
          <TabsTrigger value="risk"><BarChart3 className="h-3.5 w-3.5 mr-1" />Risk</TabsTrigger>
          <TabsTrigger value="contact"><Phone className="h-3.5 w-3.5 mr-1" />Contact</TabsTrigger>
          <TabsTrigger value="history"><Clock className="h-3.5 w-3.5 mr-1" />History</TabsTrigger>
        </TabsList>

        {/* ── Overview Tab ─────────────────────── */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Employer Identity (Read-Only from protected source) */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4" /> Employer Identity
                  <Badge variant="outline" className="text-[10px] ml-auto">Source: er_master (read-only)</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Name" value={profile.employer_name} />
                <Row label="Registration No." value={profile.employer_id} />
                <Row label="Master Status" value={profile.master_status || 'N/A'} />
                <Row label="Sector" value={profile.sector_code || 'N/A'} />
                <Row label="Territory / Parish" value={profile.territory || 'N/A'} />
                <Row label="Office" value={profile.office_code || 'N/A'} />
                <Row label="Inspector" value={profile.inspector_code || 'N/A'} />
                <Separator className="my-2" />
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" /> {profile.phone || 'N/A'}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" /> {profile.email || 'N/A'}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" /> {[profile.hq_addr1, profile.hq_addr2].filter(Boolean).join(', ') || 'N/A'}
                </div>
              </CardContent>
            </Card>

            {/* Compliance Summary (from extension tables) */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4" /> Compliance Summary
                  <Badge variant="outline" className="text-[10px] ml-auto">Source: ce_* tables</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Compliance Status" value={
                  <Badge className={statusColor(profile.compliance_status)}>
                    {(profile.compliance_status || 'unknown').replace(/_/g, ' ')}
                  </Badge>
                } />
                <Row label="Effective From" value={profile.compliance_effective_from ? formatDateForDisplay(profile.compliance_effective_from) : 'N/A'} />
                <Row label="Assigned Officer" value={profile.assigned_officer_id || 'Unassigned'} />
                <Row label="Review Due" value={profile.review_due_date ? formatDateForDisplay(profile.review_due_date) : 'N/A'} />
                <Separator className="my-2" />
                <Row label="Outstanding Balance" value={<span className={profile.outstanding_balance > 0 ? 'text-destructive font-semibold' : 'text-emerald-600'}>{fmt(profile.outstanding_balance)}</span>} />
                <Row label="Open Violations" value={String(profile.active_violation_count)} />
                <Row label="Open Cases" value={String(profile.active_case_count)} />
                <Row label="Active Flags" value={
                  <span>
                    {profile.active_flags_count}
                    {(profile.critical_flags ?? 0) > 0 && (
                      <span className="text-destructive ml-1">({profile.critical_flags} critical)</span>
                    )}
                  </span>
                } />
              </CardContent>
            </Card>
          </div>

          {/* Active Flags */}
          {flags && flags.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Flag className="h-4 w-4" /> Active Compliance Flags
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {flags.map((f: any) => (
                    <TooltipProvider key={f.id}>
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge className={f.severity === 'critical' ? 'bg-red-600/15 text-red-700' : f.severity === 'warning' ? 'bg-amber-500/15 text-amber-700' : 'bg-blue-500/15 text-blue-700'}>
                            {f.flag_label}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">{f.flag_category} · Raised: {formatDateForDisplay(f.raised_at)}</p>
                          {f.notes && <p className="text-xs text-muted-foreground">{f.notes}</p>}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
              <CardDescription className="text-xs">Actions operate on compliance extension tables only — employer master data is not modified.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => navigate(`/compliance/violations/manual-entry?employer=${resolvedId}`)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Create Violation
                </Button>
                <Button size="sm" variant="outline" onClick={() => navigate(`/compliance/cases?employer=${resolvedId}`)}>
                  <FileText className="h-3.5 w-3.5 mr-1" /> Open Case
                </Button>
                <Button size="sm" variant="outline" onClick={() => navigate(`/compliance/notices?employer=${resolvedId}`)}>
                  <Mail className="h-3.5 w-3.5 mr-1" /> Issue Notice
                </Button>
                <Button size="sm" variant="outline" onClick={() => navigate(`/compliance/arrangements?employer=${resolvedId}`)}>
                  <HandCoins className="h-3.5 w-3.5 mr-1" /> Start Arrangement
                </Button>
                <Button size="sm" variant="outline" onClick={() => navigate(`/compliance/employer-statements/${resolvedId}/financial`)}>
                  <Eye className="h-3.5 w-3.5 mr-1" /> View Ledger
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Financial Tab ────────────────────── */}
        <TabsContent value="financial" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Total Debits</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold text-destructive">{fmt(profile.total_debits)}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Total Credits</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold text-emerald-600">{fmt(profile.total_credits)}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Outstanding Balance</CardTitle></CardHeader>
              <CardContent><p className={`text-2xl font-bold ${profile.outstanding_balance > 0 ? 'text-destructive' : 'text-emerald-600'}`}>{fmt(profile.outstanding_balance)}</p></CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Recent Ledger Entries</CardTitle>
                <Button size="sm" variant="outline" onClick={() => navigate(`/compliance/employer-statements/${resolvedId}/financial`)}>
                  <Eye className="h-3.5 w-3.5 mr-1" /> Full Statement
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Fund</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledger && ledger.length > 0 ? ledger.map((entry: any) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-xs">{entry.posted_at ? formatDateForDisplay(entry.posted_at) : '—'}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{entry.entry_type}</Badge></TableCell>
                      <TableCell className="text-xs">{entry.period || '—'}</TableCell>
                      <TableCell className="text-xs">{entry.fund_type || '—'}</TableCell>
                      <TableCell className="text-right text-xs text-destructive">{entry.debit_amount > 0 ? fmt(entry.debit_amount) : ''}</TableCell>
                      <TableCell className="text-right text-xs text-emerald-600">{entry.credit_amount > 0 ? fmt(entry.credit_amount) : ''}</TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">{entry.description || '—'}</TableCell>
                    </TableRow>
                  )) : (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No ledger entries found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Enforcement Tab ──────────────────── */}
        <TabsContent value="enforcement" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Violations */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> Violations ({violations?.length || 0})
                  </CardTitle>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/compliance/violations/manual-entry?employer=${resolvedId}`)}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> New
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {violations && violations.length > 0 ? violations.map((v: any) => (
                    <div key={v.id} className="flex items-center justify-between p-2 rounded-md border bg-card hover:bg-accent/50 cursor-pointer"
                      onClick={() => navigate(`/compliance/violations/${v.id}`)}>
                      <div>
                        <p className="text-sm font-medium">{v.violation_number}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[220px]">{v.summary || 'No summary'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{v.status}</Badge>
                        {v.total_amount > 0 && <span className="text-xs text-destructive font-medium">{fmt(v.total_amount)}</span>}
                      </div>
                    </div>
                  )) : (
                    <p className="text-center text-muted-foreground text-sm py-4">No violations</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Cases */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" /> Cases ({cases?.length || 0})
                  </CardTitle>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/compliance/cases?employer=${resolvedId}`)}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> New
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {cases && cases.length > 0 ? cases.map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between p-2 rounded-md border bg-card hover:bg-accent/50">
                      <div>
                        <p className="text-sm font-medium">{c.case_number}</p>
                        <p className="text-xs text-muted-foreground">{c.case_type} · {c.priority}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{c.status}</Badge>
                        {c.total_amount > 0 && <span className="text-xs text-destructive font-medium">{fmt(c.total_amount)}</span>}
                      </div>
                    </div>
                  )) : (
                    <p className="text-center text-muted-foreground text-sm py-4">No cases</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Risk Tab ─────────────────────────── */}
        <TabsContent value="risk" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Risk Score Breakdown</CardTitle>
                <CardDescription className="text-xs">Source: ce_risk_profiles (read-only from workspace)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-bold">{profile.risk_score?.toFixed(1) || '—'}</span>
                  <Badge className={`${riskBandColor(profile.risk_band)} text-sm px-3 py-1`}>{profile.risk_band || 'Unscored'}</Badge>
                </div>
                <Separator />
                <RiskFactor label="Arrears" score={profile.arrears_score} weight={25} />
                <RiskFactor label="Violations" score={profile.violation_score} weight={25} />
                <RiskFactor label="Filing" score={profile.filing_score} weight={20} />
                <RiskFactor label="Payment Behavior" score={profile.payment_behavior_score} weight={20} />
                <RiskFactor label="Legal History" score={profile.legal_history_score} weight={10} />
                <Separator />
                <Row label="Last Calculated" value={profile.risk_last_calculated ? formatDateForDisplay(profile.risk_last_calculated) : 'Never'} />
                <Row label="Next Review" value={profile.risk_next_review ? formatDateForDisplay(profile.risk_next_review) : 'N/A'} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Risk Indicators</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Indicator label="Outstanding Balance" value={fmt(profile.outstanding_balance)} warn={profile.outstanding_balance > 50000} />
                <Indicator label="Open Violations" value={String(profile.active_violation_count)} warn={profile.active_violation_count > 0} />
                <Indicator label="Open Cases" value={String(profile.active_case_count)} warn={profile.active_case_count > 0} />
                <Indicator label="Active Flags" value={String(profile.active_flags_count)} warn={profile.active_flags_count > 0} />
                <Indicator label="Critical Flags" value={String(profile.critical_flags || 0)} warn={(profile.critical_flags ?? 0) > 0} />
                <Indicator label="Related Employers" value={String(profile.related_employers_count)} warn={false} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Contact Tab ──────────────────────── */}
        <TabsContent value="contact" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4" /> Registered Contact
                  <Badge variant="outline" className="text-[10px] ml-auto">Source: er_master (read-only)</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Phone" value={profile.phone || 'N/A'} />
                <Row label="Email" value={profile.email || 'N/A'} />
                <Row label="Address" value={[profile.hq_addr1, profile.hq_addr2].filter(Boolean).join(', ') || 'N/A'} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4" /> Notice Delivery Preferences
                  <Badge variant="outline" className="text-[10px] ml-auto">Source: ce_employer_contact_preferences</Badge>
                </CardTitle>
                <CardDescription className="text-xs">Editable compliance-specific contact and delivery settings</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Contact preferences can be managed from the compliance settings panel.</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── History Tab ──────────────────────── */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" /> Compliance Status History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {statusHistory && statusHistory.length > 0 ? statusHistory.map((h: any) => (
                  <div key={h.id} className="flex items-start gap-3 p-3 rounded-md border bg-card">
                    <div className="mt-1 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {h.previous_status && (
                          <>
                            <Badge variant="outline" className="text-[10px]">{h.previous_status}</Badge>
                            <span className="text-xs text-muted-foreground">→</span>
                          </>
                        )}
                        <Badge className={statusColor(h.new_status) + ' text-[10px]'}>{h.new_status.replace(/_/g, ' ')}</Badge>
                        <span className="text-xs text-muted-foreground ml-auto">{formatDateForDisplay(h.changed_at)}</span>
                      </div>
                      {h.reason_detail && <p className="text-xs text-muted-foreground mt-1">{h.reason_detail}</p>}
                      <p className="text-[10px] text-muted-foreground mt-0.5">By: {h.changed_by}</p>
                    </div>
                  </div>
                )) : (
                  <p className="text-center text-muted-foreground text-sm py-6">No status history recorded</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// ─── Sub-components ───────────────────────────────────────
const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex justify-between items-center">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium text-right">{value}</span>
  </div>
);

const KpiCard = ({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) => (
  <Card>
    <CardContent className="p-3 flex items-center gap-3">
      <Icon className={`h-5 w-5 ${color} flex-shrink-0`} />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-lg font-bold ${color}`}>{value}</p>
      </div>
    </CardContent>
  </Card>
);

const RiskFactor = ({ label, score, weight }: { label: string; score: number | null; weight: number }) => (
  <div className="space-y-1">
    <div className="flex justify-between text-xs">
      <span>{label} ({weight}%)</span>
      <span className="font-medium">{score?.toFixed(1) || '0.0'}</span>
    </div>
    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
      <div className="h-full bg-primary/70 rounded-full transition-all" style={{ width: `${Math.min((score || 0), 100)}%` }} />
    </div>
  </div>
);

const Indicator = ({ label, value, warn }: { label: string; value: string; warn: boolean }) => (
  <div className="flex justify-between items-center p-2 rounded-md border">
    <span className="text-sm">{label}</span>
    <span className={`font-medium ${warn ? 'text-destructive' : 'text-muted-foreground'}`}>{value}</span>
  </div>
);

export default EmployerComplianceWorkspace;
