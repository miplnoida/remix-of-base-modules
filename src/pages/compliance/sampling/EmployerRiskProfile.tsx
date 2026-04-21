import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, AlertTriangle, FileText, Calendar, Loader2, Inbox } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'XCD', minimumFractionDigits: 0 }).format(n || 0);

const getRiskBadgeVariant = (band?: string | null) => {
  switch ((band || '').toLowerCase()) {
    case 'high': case 'critical': return 'destructive' as const;
    case 'medium': return 'default' as const;
    case 'low': return 'secondary' as const;
    default: return 'outline' as const;
  }
};

export default function EmployerRiskProfile() {
  const { employerId } = useParams<{ employerId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  // Risk profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['employer-risk-profile', employerId],
    enabled: !!employerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ce_risk_profiles')
        .select('*')
        .eq('employer_id', employerId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Risk score history
  const { data: scoreHistory = [] } = useQuery({
    queryKey: ['employer-risk-history', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ce_risk_score_history')
        .select('new_score, previous_score, calculated_at, new_band')
        .eq('risk_profile_id', profile!.id)
        .order('calculated_at', { ascending: true })
        .limit(24);
      if (error) throw error;
      return (data || []).map((r: any) => ({
        date: r.calculated_at ? new Date(r.calculated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '',
        score: Number(r.new_score) || 0,
        band: r.new_band,
      }));
    },
  });

  // Past audits / inspections
  const { data: inspections = [], isLoading: inspectionsLoading } = useQuery({
    queryKey: ['employer-inspections', employerId],
    enabled: !!employerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ce_inspections')
        .select('id, inspection_number, inspection_type, scheduled_date, status, findings_summary')
        .eq('employer_id', employerId!)
        .order('scheduled_date', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
  });

  // Arrears summary
  const { data: arrears } = useQuery({
    queryKey: ['employer-arrears', employerId],
    enabled: !!employerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ce_v_employer_arrears_summary')
        .select('*')
        .eq('regno', employerId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Filing status
  const { data: filing } = useQuery({
    queryKey: ['employer-filing', employerId],
    enabled: !!employerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ce_v_employer_filing_status')
        .select('*')
        .eq('regno', employerId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (profileLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!profile) {
    return (
      <div className="container mx-auto p-6">
        <PageHeader
          title="Employer Risk Profile"
          subtitle={`No risk profile on file for ${employerId}`}
          breadcrumbs={[
            { label: 'Compliance', href: '/compliance' },
            { label: 'Risk Profile' },
          ]}
        />
        <Card><CardContent className="py-16 text-center text-muted-foreground">
          <Inbox className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium">No risk profile available for employer {employerId}</p>
          <p className="text-sm mt-1">A risk profile is created when the risk-scoring engine evaluates this employer</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>Go Back</Button>
        </CardContent></Card>
      </div>
    );
  }

  const filingComplianceRate = filing && filing.total_filings_12m
    ? Math.round(((filing.total_filings_12m - (filing.missed_filings_12m || 0)) / filing.total_filings_12m) * 100)
    : null;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title={profile.employer_name || `Employer ${employerId}`}
        subtitle="Risk Profile & Audit History"
        breadcrumbs={[
          { label: 'Compliance', href: '/compliance' },
          { label: 'Employers', href: '/compliance/employers' },
          { label: 'Risk Profile' },
        ]}
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <CardTitle className="text-2xl">{profile.employer_name}</CardTitle>
                <Badge variant={getRiskBadgeVariant(profile.risk_band)}>
                  {profile.risk_band || 'Unrated'} Risk
                </Badge>
              </div>
              <div className="flex gap-4 text-sm text-muted-foreground flex-wrap">
                <span>ID: {profile.employer_id}</span>
                {profile.territory && <><span>•</span><span>Territory: {profile.territory}</span></>}
                {profile.scoring_version && <><span>•</span><span>Model: {profile.scoring_version}</span></>}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Current Risk Score</div>
              <div className="text-4xl font-bold text-destructive">{Number(profile.total_score || 0).toFixed(1)}</div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">Arrears Balance</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{fmtCurrency(Number(arrears?.total_outstanding || 0))}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">Last Audit</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{inspections[0]?.scheduled_date || '—'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">Next Review</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{profile.next_review_date || '—'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">C3 Compliance</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{filingComplianceRate !== null ? `${filingComplianceRate}%` : '—'}</div>
            <p className="text-xs text-muted-foreground mt-1">On-time (last 12 months)</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview"><TrendingUp className="h-4 w-4 mr-2" />Overview</TabsTrigger>
          <TabsTrigger value="audits"><FileText className="h-4 w-4 mr-2" />Audit History</TabsTrigger>
          <TabsTrigger value="scores"><Calendar className="h-4 w-4 mr-2" />Score Components</TabsTrigger>
          <TabsTrigger value="compliance"><AlertTriangle className="h-4 w-4 mr-2" />Filing Behavior</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Risk Score Trend</CardTitle></CardHeader>
            <CardContent>
              {scoreHistory.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  <Inbox className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  No score history recorded yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={scoreHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="score" stroke="hsl(var(--destructive))" strokeWidth={2} name="Risk Score" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audits" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Past Audits & Inspections</CardTitle></CardHeader>
            <CardContent>
              {inspectionsLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : inspections.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  <Inbox className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  No inspections on record
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Number</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Findings</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inspections.map((insp: any) => (
                      <TableRow key={insp.id} className="cursor-pointer" onClick={() => navigate(`/compliance/field/audit/${insp.id}`)}>
                        <TableCell>{insp.scheduled_date || '—'}</TableCell>
                        <TableCell className="font-mono text-xs">{insp.inspection_number}</TableCell>
                        <TableCell>{insp.inspection_type || '—'}</TableCell>
                        <TableCell className="max-w-md truncate text-muted-foreground">{insp.findings_summary || '—'}</TableCell>
                        <TableCell>
                          <Badge variant={insp.status === 'COMPLETED' ? 'default' : 'secondary'}>{insp.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scores" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Risk Score Components</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Component</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow><TableCell>Arrears</TableCell><TableCell className="text-right font-medium">{Number(profile.arrears_score || 0).toFixed(2)}</TableCell></TableRow>
                  <TableRow><TableCell>Violation</TableCell><TableCell className="text-right font-medium">{Number(profile.violation_score || 0).toFixed(2)}</TableCell></TableRow>
                  <TableRow><TableCell>Filing Behavior</TableCell><TableCell className="text-right font-medium">{Number(profile.filing_score || 0).toFixed(2)}</TableCell></TableRow>
                  <TableRow><TableCell>Legal History</TableCell><TableCell className="text-right font-medium">{Number(profile.legal_history_score || 0).toFixed(2)}</TableCell></TableRow>
                  <TableRow><TableCell>Payment Behavior</TableCell><TableCell className="text-right font-medium">{Number(profile.payment_behavior_score || 0).toFixed(2)}</TableCell></TableRow>
                  <TableRow className="border-t-2"><TableCell className="font-semibold">Total Score</TableCell><TableCell className="text-right font-bold text-destructive">{Number(profile.total_score || 0).toFixed(2)}</TableCell></TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>C3 Filing Behavior (Last 12 Months)</CardTitle></CardHeader>
            <CardContent>
              {!filing ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  <Inbox className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  No filing history available
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-3">
                  <div><p className="text-sm text-muted-foreground">Total Filings</p><p className="text-2xl font-bold">{filing.total_filings_12m || 0}</p></div>
                  <div><p className="text-sm text-muted-foreground">Missed Filings</p><p className="text-2xl font-bold text-destructive">{filing.missed_filings_12m || 0}</p></div>
                  <div><p className="text-sm text-muted-foreground">Last Filing</p><p className="text-2xl font-bold">{filing.last_filing_period || '—'}</p></div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
