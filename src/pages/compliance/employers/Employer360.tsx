import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Building2, FileText, Bell, ClipboardCheck, Shield, Clock, DollarSign,
  Users, AlertTriangle, Loader2, Eye, TrendingUp, Scale, ArrowLeft,
} from 'lucide-react';
import {
  fetchEmployerMaster, fetchEmployerFiling, fetchEmployerArrears, fetchEmployerPayments,
  fetchEmployerLegal, fetchEmployerWorkforce, fetchEmployerRisk, fetchEmployerViolations,
  fetchEmployerNotices, fetchEmployerFollowUps, fetchEmployerTimeline,
} from '@/services/employer360Service';

const RISK_BAND_COLORS: Record<string, string> = {
  LOW: 'bg-green-500/15 text-green-700',
  MEDIUM: 'bg-yellow-500/15 text-yellow-700',
  HIGH: 'bg-orange-500/15 text-orange-700',
  CRITICAL: 'bg-destructive/15 text-destructive',
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-primary/10 text-primary',
  UNDER_REVIEW: 'bg-yellow-500/15 text-yellow-700',
  ESCALATED: 'bg-destructive/10 text-destructive',
  RESOLVED: 'bg-green-500/15 text-green-700',
  CLOSED: 'bg-muted text-muted-foreground',
};

const EVENT_CATEGORY_COLORS: Record<string, string> = {
  VIOLATION: 'bg-destructive/10 text-destructive',
  NOTICE: 'bg-blue-500/15 text-blue-700',
  FOLLOW_UP: 'bg-orange-500/15 text-orange-700',
  RISK: 'bg-purple-500/15 text-purple-700',
};

const formatDate = (val: string | null) => {
  if (!val) return '—';
  try { return new Date(val).toLocaleDateString('en-GB'); } catch { return val; }
};

const formatCurrency = (amt: number | null) => {
  if (amt == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'XCD', minimumFractionDigits: 2 }).format(amt);
};

export default function Employer360() {
  const { employerId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  const { data: master, isLoading: loadingMaster } = useQuery({
    queryKey: ['employer360_master', employerId],
    queryFn: () => fetchEmployerMaster(employerId!),
    enabled: !!employerId,
  });

  const { data: filing } = useQuery({
    queryKey: ['employer360_filing', employerId],
    queryFn: () => fetchEmployerFiling(employerId!),
    enabled: !!employerId,
  });

  const { data: arrears } = useQuery({
    queryKey: ['employer360_arrears', employerId],
    queryFn: () => fetchEmployerArrears(employerId!),
    enabled: !!employerId,
  });

  const { data: payments } = useQuery({
    queryKey: ['employer360_payments', employerId],
    queryFn: () => fetchEmployerPayments(employerId!),
    enabled: !!employerId,
  });

  const { data: legal } = useQuery({
    queryKey: ['employer360_legal', employerId],
    queryFn: () => fetchEmployerLegal(employerId!),
    enabled: !!employerId,
  });

  const { data: workforce } = useQuery({
    queryKey: ['employer360_workforce', employerId],
    queryFn: () => fetchEmployerWorkforce(employerId!),
    enabled: !!employerId,
  });

  const { data: risk } = useQuery({
    queryKey: ['employer360_risk', employerId],
    queryFn: () => fetchEmployerRisk(employerId!),
    enabled: !!employerId,
  });

  const { data: violations = [] } = useQuery({
    queryKey: ['employer360_violations', employerId],
    queryFn: () => fetchEmployerViolations(employerId!),
    enabled: !!employerId,
  });

  const { data: notices = [] } = useQuery({
    queryKey: ['employer360_notices', employerId],
    queryFn: () => fetchEmployerNotices(employerId!),
    enabled: !!employerId,
  });

  const { data: followUps = [] } = useQuery({
    queryKey: ['employer360_followups', employerId],
    queryFn: () => fetchEmployerFollowUps(employerId!),
    enabled: !!employerId,
  });

  const { data: timeline = [] } = useQuery({
    queryKey: ['employer360_timeline', employerId],
    queryFn: () => fetchEmployerTimeline(employerId!),
    enabled: !!employerId,
  });

  if (loadingMaster) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!master) {
    return (
      <div className="container mx-auto p-6 text-center">
        <h2 className="text-2xl font-bold text-foreground">Employer not found</h2>
        <p className="text-muted-foreground mt-2">No employer record found for ID: {employerId}</p>
        <Button onClick={() => navigate(-1)} className="mt-4"><ArrowLeft className="h-4 w-4 mr-2" />Go Back</Button>
      </div>
    );
  }

  const activeViolations = violations.filter((v: any) => !['RESOLVED', 'CLOSED', 'CANCELLED'].includes(v.status));
  const riskBand = risk?.override_band || risk?.risk_band || 'N/A';

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title={`Employer 360: ${master.employer_name}`}
        subtitle={`Registration: ${employerId} | Office: ${master.office_code || '—'} | Status: ${master.status || '—'}`}
        breadcrumbs={[
          { label: 'Compliance', href: '/compliance' },
          { label: 'Employer 360' },
        ]}
      />

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-xs text-muted-foreground">Risk Band</div>
            <Badge className={`mt-1 ${RISK_BAND_COLORS[riskBand] || 'bg-muted text-muted-foreground'}`}>{riskBand}</Badge>
            {risk?.total_score != null && <div className="text-lg font-bold mt-1">{risk.total_score.toFixed(1)}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-xs text-muted-foreground">Active Violations</div>
            <div className="text-2xl font-bold text-foreground">{activeViolations.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-xs text-muted-foreground">Outstanding</div>
            <div className="text-lg font-bold text-destructive">{formatCurrency(arrears?.total_outstanding ?? null)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-xs text-muted-foreground">Missed Filings</div>
            <div className="text-2xl font-bold text-foreground">{filing?.missed_filings_12m ?? '—'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-xs text-muted-foreground">Workforce</div>
            <div className="text-lg font-bold text-foreground">{workforce?.registered_total ?? '—'}</div>
            {workforce?.employee_delta != null && workforce.employee_delta !== 0 && (
              <div className={`text-xs ${workforce.employee_delta > 0 ? 'text-green-600' : 'text-destructive'}`}>
                Δ {workforce.employee_delta > 0 ? '+' : ''}{workforce.employee_delta}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-xs text-muted-foreground">Legal Actions</div>
            <div className="text-2xl font-bold text-foreground">{(legal?.active_suit_count ?? 0) + (legal?.active_escalation_count ?? 0)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7">
          <TabsTrigger value="overview"><Building2 className="h-4 w-4 mr-1" />Overview</TabsTrigger>
          <TabsTrigger value="violations"><AlertTriangle className="h-4 w-4 mr-1" />Violations ({violations.length})</TabsTrigger>
          <TabsTrigger value="notices"><Bell className="h-4 w-4 mr-1" />Notices ({notices.length})</TabsTrigger>
          <TabsTrigger value="followups"><ClipboardCheck className="h-4 w-4 mr-1" />Follow-Ups ({followUps.length})</TabsTrigger>
          <TabsTrigger value="risk"><Shield className="h-4 w-4 mr-1" />Risk</TabsTrigger>
          <TabsTrigger value="financial"><DollarSign className="h-4 w-4 mr-1" />Financial</TabsTrigger>
          <TabsTrigger value="timeline"><Clock className="h-4 w-4 mr-1" />Timeline</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-sm">Registration Details</CardTitle></CardHeader>
              <CardContent className="grid gap-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Registration #</span><span className="font-medium">{employerId}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span className="font-medium">{master.employer_name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge variant="outline">{master.status || '—'}</Badge></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Office</span><span className="font-medium">{master.office_code || '—'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Village</span><span className="font-medium">{master.village_code || '—'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Registered</span><span className="font-medium">{formatDate(master.registration_date)}</span></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Workforce</CardTitle></CardHeader>
              <CardContent className="grid gap-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Males (registered)</span><span className="font-medium">{workforce?.registered_males ?? master.males_employed ?? '—'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Females (registered)</span><span className="font-medium">{workforce?.registered_females ?? master.females_employed ?? '—'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Total (registered)</span><span className="font-bold">{workforce?.registered_total ?? '—'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Last Reported (C3)</span><span className="font-medium">{workforce?.last_reported_employees ?? '—'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Last Report Period</span><span className="font-medium">{formatDate(workforce?.last_reported_period ?? null)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Delta</span>
                  <span className={`font-bold ${(workforce?.employee_delta ?? 0) < 0 ? 'text-destructive' : ''}`}>
                    {workforce?.employee_delta != null ? (workforce.employee_delta > 0 ? '+' : '') + workforce.employee_delta : '—'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-sm">Filing Status (12 months)</CardTitle></CardHeader>
              <CardContent className="grid gap-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Total Filings</span><span className="font-medium">{filing?.total_filings_12m ?? '—'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Missed Filings</span><span className={`font-bold ${(filing?.missed_filings_12m ?? 0) > 0 ? 'text-destructive' : ''}`}>{filing?.missed_filings_12m ?? '—'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Last Filed</span><span className="font-medium">{formatDate(filing?.last_filing_date ?? null)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Current?</span><Badge variant={filing?.is_current ? 'default' : 'destructive'}>{filing?.is_current ? 'Yes' : 'No'}</Badge></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Legal Status</CardTitle></CardHeader>
              <CardContent className="grid gap-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Active Suits</span><span className="font-bold">{legal?.active_suit_count ?? 0}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Active Escalations</span><span className="font-bold">{legal?.active_escalation_count ?? 0}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Latest Stage</span><span className="font-medium">{legal?.latest_stage || '—'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Has Active Legal?</span><Badge variant={legal?.has_active_legal ? 'destructive' : 'default'}>{legal?.has_active_legal ? 'Yes' : 'No'}</Badge></div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Violations Tab */}
        <TabsContent value="violations">
          <Card>
            <CardHeader><CardTitle>Violations ({violations.length})</CardTitle></CardHeader>
            <CardContent>
              {violations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No violations on record</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Violation #</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {violations.map((v: any) => (
                      <TableRow key={v.id}>
                        <TableCell className="font-mono text-xs">{v.violation_number}</TableCell>
                        <TableCell className="text-xs">{v.ce_violation_types?.name || '—'}</TableCell>
                        <TableCell><Badge className={`text-xs ${STATUS_COLORS[v.status] || ''}`}>{v.status?.replace(/_/g, ' ')}</Badge></TableCell>
                        <TableCell className="text-xs">{v.priority}</TableCell>
                        <TableCell className="text-xs">{formatCurrency(Number(v.total_amount) || 0)}</TableCell>
                        <TableCell className="text-xs">{formatDate(v.created_at)}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" onClick={() => navigate(`/compliance/violations/${v.id}`)}><Eye className="h-3.5 w-3.5" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notices Tab */}
        <TabsContent value="notices">
          <Card>
            <CardHeader><CardTitle>Notices ({notices.length})</CardTitle></CardHeader>
            <CardContent>
              {notices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No notices issued</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Notice #</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Delivery</TableHead>
                      <TableHead>Sent</TableHead>
                      <TableHead>Response</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notices.map((n: any) => (
                      <TableRow key={n.id}>
                        <TableCell className="font-mono text-xs">{n.notice_number}</TableCell>
                        <TableCell className="text-xs">{(n.notice_type || '').replace(/_/g, ' ')}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{n.status}</Badge></TableCell>
                        <TableCell className="text-xs">{(n.delivery_method || '').replace(/_/g, ' ')}</TableCell>
                        <TableCell className="text-xs">{formatDate(n.sent_at)}</TableCell>
                        <TableCell>{n.response_received ? <Badge className="bg-green-500/15 text-green-700 text-[10px]">Yes</Badge> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Follow-Ups Tab */}
        <TabsContent value="followups">
          <Card>
            <CardHeader><CardTitle>Follow-Up Actions ({followUps.length})</CardTitle></CardHeader>
            <CardContent>
              {followUps.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No follow-up actions</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Outcome</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {followUps.map((fa: any) => (
                      <TableRow key={fa.id}>
                        <TableCell className="text-xs">{(fa.action_type || '').replace(/_/g, ' ')}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{fa.status}</Badge></TableCell>
                        <TableCell className="text-xs">{fa.priority}</TableCell>
                        <TableCell className="text-xs">{formatDate(fa.due_date)}</TableCell>
                        <TableCell className="text-xs">{fa.assigned_to_name || '—'}</TableCell>
                        <TableCell className="text-xs max-w-xs truncate">{fa.outcome || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Risk Tab */}
        <TabsContent value="risk" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />Risk Profile</CardTitle></CardHeader>
            <CardContent>
              {!risk ? (
                <div className="text-center py-8 text-muted-foreground">No risk profile calculated</div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-4xl font-bold">{risk.total_score?.toFixed(1) ?? '—'}</div>
                      <Badge className={`mt-1 ${RISK_BAND_COLORS[risk.override_band || risk.risk_band || ''] || ''}`}>
                        {risk.override_band || risk.risk_band || '—'}
                      </Badge>
                      {risk.override_band && <div className="text-[10px] text-muted-foreground mt-1">Override: {risk.override_reason}</div>}
                    </div>
                    <div className="flex-1 grid grid-cols-5 gap-3">
                      {[
                        { label: 'Arrears', score: risk.arrears_score },
                        { label: 'Violations', score: risk.violation_score },
                        { label: 'Filing', score: risk.filing_score },
                        { label: 'Payments', score: risk.payment_behavior_score },
                        { label: 'Legal', score: risk.legal_history_score },
                      ].map(dim => (
                        <div key={dim.label} className="text-center p-2 bg-muted/50 rounded-lg">
                          <div className="text-lg font-bold">{dim.score?.toFixed(1) ?? '—'}</div>
                          <div className="text-[10px] text-muted-foreground">{dim.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">Last calculated: {formatDate(risk.last_calculated_at)}</div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financial Tab */}
        <TabsContent value="financial" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-sm">Arrears Summary</CardTitle></CardHeader>
              <CardContent className="grid gap-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Current Arrears</span><span className="font-bold text-destructive">{formatCurrency(arrears?.current_arrears ?? null)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Penalties</span><span className="font-medium">{formatCurrency(arrears?.current_penalty ?? null)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Total Outstanding</span><span className="font-bold text-lg text-destructive">{formatCurrency(arrears?.total_outstanding ?? null)}</span></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Payment Activity (12 months)</CardTitle></CardHeader>
              <CardContent className="grid gap-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Total Payments</span><span className="font-medium">{payments?.total_payments_12m ?? '—'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Total Amount</span><span className="font-medium">{formatCurrency(payments?.total_amount_12m ?? null)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Last Payment</span><span className="font-medium">{formatDate(payments?.last_payment_date ?? null)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Recent Payment?</span><Badge variant={payments?.has_recent_payment ? 'default' : 'destructive'}>{payments?.has_recent_payment ? 'Yes' : 'No'}</Badge></div>
              </CardContent>
            </Card>
          </div>
          <Button variant="outline" onClick={() => navigate(`/compliance/employer-statement/${employerId}`)}>
            <DollarSign className="h-4 w-4 mr-2" />View Full Financial Statement
          </Button>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" />Activity Timeline</CardTitle></CardHeader>
            <CardContent>
              {timeline.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No activity recorded</div>
              ) : (
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                  <div className="space-y-4">
                    {timeline.map((event, idx) => (
                      <div key={`${event.reference_id}-${idx}`} className="relative pl-10">
                        <div className="absolute left-2.5 top-1.5 w-3 h-3 rounded-full border-2 border-background bg-primary" />
                        <div className="p-3 border border-border rounded-lg bg-card">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <Badge className={`text-[10px] ${EVENT_CATEGORY_COLORS[event.event_category] || ''}`}>
                                {event.event_category}
                              </Badge>
                              {event.status && (
                                <Badge variant="outline" className="text-[10px]">{event.status}</Badge>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">{formatDate(event.event_date)}</span>
                          </div>
                          <p className="text-sm font-medium text-foreground">{event.title}</p>
                          {event.description && <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
