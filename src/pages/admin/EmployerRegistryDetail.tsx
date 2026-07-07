import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Building2 } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { useEmployerRegistryRecord, useRequestEmployerChange } from '@/platform/employer-registry/hooks';
import { toast } from 'sonner';

export default function EmployerRegistryDetail() {
  const { employerId = '' } = useParams();
  const { data, isLoading } = useEmployerRegistryRecord(employerId);
  const request = useRequestEmployerChange();

  const submit = (
    code:
      | 'EMPLOYER_STATUS_CHANGE_APPROVAL'
      | 'EMPLOYER_DEACTIVATION_APPROVAL'
      | 'EMPLOYER_SENSITIVE_CORRECTION_APPROVAL',
  ) => {
    request.mutate(
      { workflow_code: code, employer_id: employerId, payload: {}, reason: 'Requested via Employer Registry' },
      {
        onSuccess: () => toast.success('Request submitted for approval'),
        onError: (e: any) => toast.error(e?.message ?? 'Failed to submit request'),
      },
    );
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title={data?.employerName || 'Employer'}
        subtitle={data ? `Employer #${data.employerNumber}` : 'Loading…'}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Administration' },
          { label: 'Employer Registry', href: '/admin/employer-registry' },
          { label: employerId },
        ]}
      />

      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin/employer-registry" className="inline-flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> Back to registry
          </Link>
        </Button>
        {data && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => submit('EMPLOYER_STATUS_CHANGE_APPROVAL')}>
              Request status change
            </Button>
            <Button variant="outline" size="sm" onClick={() => submit('EMPLOYER_SENSITIVE_CORRECTION_APPROVAL')}>
              Request correction
            </Button>
            <Button variant="destructive" size="sm" onClick={() => submit('EMPLOYER_DEACTIVATION_APPROVAL')}>
              Request deactivation
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">Loading employer…</div>
      ) : !data ? (
        <EmptyState title="Employer not found" description={`No record for ${employerId}.`} />
      ) : (
        <Tabs defaultValue="summary" className="space-y-4">
          <TabsList>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="contact">Contact &amp; Address</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
            <TabsTrigger value="advanced">More Details</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Employer Summary</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                <Field label="Employer Name" value={data.employerName} />
                <Field label="Employer Number" value={data.employerNumber} />
                <Field label="Type" value={data.employerType ?? '—'} />
                <Field label="Registered" value={data.registrationDate ?? '—'} />
                <Field label="Office" value={data.officeCode ?? '—'} />
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Status</div>
                  <Badge className="mt-1">{data.employerStatus}</Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contact">
            <Card>
              <CardHeader><CardTitle className="text-base">Contact &amp; Address</CardTitle></CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                <Field label="Phone" value={data.contact?.phone ?? '—'} />
                <Field label="Email" value={data.contact?.email ?? '—'} />
                <Field label="Address" value={data.address?.line1 ?? '—'} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="compliance">
            <Card>
              <CardHeader><CardTitle className="text-base">Compliance &amp; Contribution</CardTitle></CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                <Field label="Compliance Status" value={data.complianceStatus ?? 'UNKNOWN'} />
                <Field label="Contribution Status" value={data.contributionStatus ?? 'UNKNOWN'} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="advanced">
            <Card>
              <CardHeader><CardTitle className="text-base">Migration &amp; Source</CardTitle></CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                <Field label="Source Table" value={data.sourceTable} />
                <Field label="Legacy Mapping Used" value={data.legacyMappingUsed ? 'Yes' : 'No'} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm text-foreground">{value}</div>
    </div>
  );
}
