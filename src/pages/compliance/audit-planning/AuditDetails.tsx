import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Calendar, User, Building, FileText, AlertTriangle, Loader2, Inbox } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import ReferToLegalButton from '@/components/legal/lg/ReferToLegalButton';

const SEVERITY_COLORS: Record<string, string> = {
  High: 'destructive',
  Critical: 'destructive',
  Medium: 'default',
  Low: 'secondary',
};

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  COMPLETED: 'default',
  IN_PROGRESS: 'secondary',
  SCHEDULED: 'outline',
  CANCELLED: 'destructive',
};

export default function AuditDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: audit, isLoading } = useQuery({
    queryKey: ['audit-detail', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ce_inspections')
        .select('*')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: findings = [] } = useQuery({
    queryKey: ['audit-findings', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ce_inspection_findings')
        .select('*')
        .eq('inspection_id', id!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!audit) {
    return (
      <div className="container mx-auto p-6">
        <Card><CardContent className="py-16 text-center text-muted-foreground">
          <Inbox className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium">Audit not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />Go Back
          </Button>
        </CardContent></Card>
      </div>
    );
  }

  const severityCounts = {
    High: findings.filter((f: any) => f.severity === 'High' || f.severity === 'Critical').length,
    Medium: findings.filter((f: any) => f.severity === 'Medium').length,
    Low: findings.filter((f: any) => f.severity === 'Low').length,
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title={`Audit ${audit.inspection_number}`}
        subtitle="Detailed audit information and findings"
        breadcrumbs={[
          { label: 'Compliance', href: '/compliance/dashboard' },
          { label: 'Audit Management', href: '/compliance/field/audit-management' },
          { label: audit.inspection_number },
        ]}
        actions={
          <ReferToLegalButton
            module="compliance"
            employerId={audit.employer_id ?? null}
            auditId={audit.id}
            reasonCode="AUDIT_FINDING_RECOVERY"
          />
        }
      />


      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />Audit Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={STATUS_VARIANTS[audit.status] || 'outline'}>{audit.status}</Badge>
            <div className="mt-2 text-sm text-muted-foreground">Scheduled: {audit.scheduled_date || '—'}</div>
            {audit.actual_end && <div className="text-sm text-muted-foreground">Completed: {new Date(audit.actual_end).toLocaleDateString()}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary">{audit.inspection_type || 'Unknown'}</Badge>
            <div className="mt-2 text-sm text-muted-foreground">Territory: {audit.territory || '—'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" />Findings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{findings.length}</div>
            <div className="mt-2 text-sm">
              <span className="text-destructive">{severityCounts.High} High</span>{' • '}
              <span className="text-warning">{severityCounts.Medium} Medium</span>{' • '}
              <span className="text-primary">{severityCounts.Low} Low</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="findings">Findings ({findings.length})</TabsTrigger>
          <TabsTrigger value="evidence">Evidence</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Building className="h-5 w-5" />Employer Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Employer Name</label>
                <div className="text-base font-medium">{audit.employer_name || '—'}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Employer ID</label>
                <div className="text-base">{audit.employer_id}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Territory</label>
                <div className="text-base">{audit.territory || '—'}</div>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-muted-foreground">Location</label>
                <div className="text-base">{audit.location_address || '—'}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" />Inspector Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Name</label>
                <div className="text-base font-medium">{audit.inspector_name || 'Unassigned'}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Inspector ID</label>
                <div className="text-base">{audit.inspector_id || '—'}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Employees Interviewed</label>
                <div className="text-base">{audit.employees_interviewed || 0}</div>
              </div>
            </CardContent>
          </Card>

          {audit.findings_summary && (
            <Card>
              <CardHeader><CardTitle>Findings Summary</CardTitle></CardHeader>
              <CardContent>
                <p className="text-base whitespace-pre-wrap">{audit.findings_summary}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="findings" className="space-y-4">
          {findings.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <Inbox className="h-10 w-10 mx-auto mb-2 opacity-50" />
              No findings recorded for this audit
            </CardContent></Card>
          ) : (
            findings.map((finding: any) => (
              <Card key={finding.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-base">{finding.title || finding.finding_type || 'Finding'}</CardTitle>
                    <Badge variant={(SEVERITY_COLORS[finding.severity] as any) || 'outline'}>{finding.severity}</Badge>
                  </div>
                  {finding.category && <div className="text-xs text-muted-foreground">{finding.category}</div>}
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm whitespace-pre-wrap">{finding.description}</p>
                  {finding.recommended_action && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Recommended Action</label>
                      <p className="text-sm mt-1">{finding.recommended_action}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs">
                    {finding.violation_created && <Badge variant="destructive">Violation Created</Badge>}
                    {finding.follow_up_required && <Badge variant="secondary">Follow-Up Required</Badge>}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="evidence" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Documents Collected</CardTitle></CardHeader>
            <CardContent>
              {(!audit.documents_collected || (audit.documents_collected as any[]).length === 0) ? (
                <p className="text-sm text-muted-foreground">No documents recorded</p>
              ) : (
                <Table>
                  <TableHeader><TableRow><TableHead>Document</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(audit.documents_collected as any[]).map((d: any, i: number) => (
                      <TableRow key={i}><TableCell>{typeof d === 'string' ? d : (d.name || JSON.stringify(d))}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Photos</CardTitle></CardHeader>
            <CardContent>
              {(!audit.photos || (audit.photos as any[]).length === 0) ? (
                <p className="text-sm text-muted-foreground">No photos uploaded</p>
              ) : (
                <p className="text-sm text-muted-foreground">{(audit.photos as any[]).length} photo(s) on file</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
