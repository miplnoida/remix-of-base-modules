/**
 * Award 360 — Unified pensioner award view.
 * Tabs: Overview, Pensioner, Claim, Product, Beneficiaries, Schedule, Payments,
 *       Life Certs, Medical Reviews, Suspensions, Overpayments, Communications, Audit.
 */
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useBnAwardDetail } from '@/hooks/bn/useBnAwards';
import { formatDateForDisplay } from '@/lib/format-config';

const Field: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="grid grid-cols-2 gap-2 py-1 text-sm">
    <div className="text-muted-foreground">{label}</div>
    <div className="font-medium">{value ?? '—'}</div>
  </div>
);

function SimpleTable({ rows, columns, empty }: { rows: any[]; columns: { key: string; label: string; render?: (r: any) => React.ReactNode }[]; empty: string }) {
  if (!rows?.length) return <p className="text-sm text-muted-foreground py-6 text-center">{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>{columns.map(c => <TableHead key={c.key}>{c.label}</TableHead>)}</TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={r.id ?? i}>
              {columns.map(c => <TableCell key={c.key}>{c.render ? c.render(r) : (r[c.key] ?? '—')}</TableCell>)}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

const dt = (v?: string | null) => (v ? formatDateForDisplay(v) : '—');

export default function Award360() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = useBnAwardDetail(id);

  if (isLoading) return <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin inline" /></div>;
  if (error || !data) return <div className="p-8 text-center text-destructive">Unable to load award</div>;

  const a = data.award;
  const pName = data.pensioner ? [data.pensioner.firstname, data.pensioner.middle_name, data.pensioner.surname].filter(Boolean).join(' ') : '—';

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/bn/awards')}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
        <div className="flex-1">
          <h1 className="t-page-title">Award {a.award_number ?? a.id.slice(0, 8)}</h1>
          <p className="t-page-subtitle mt-1">{pName} · {a.benefit_code} · {a.award_type}</p>
        </div>
        <Badge variant={a.status === 'ACTIVE' ? 'default' : 'secondary'}>{a.status}</Badge>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pensioner">Pensioner</TabsTrigger>
          <TabsTrigger value="claim">Claim</TabsTrigger>
          <TabsTrigger value="product">Product</TabsTrigger>
          <TabsTrigger value="beneficiaries">Beneficiaries</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="lifecert">Life Certs</TabsTrigger>
          <TabsTrigger value="medical">Medical</TabsTrigger>
          <TabsTrigger value="suspensions">Suspensions</TabsTrigger>
          <TabsTrigger value="overpay">Overpayments</TabsTrigger>
          <TabsTrigger value="comms">Communications</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card><CardHeader><CardTitle className="text-base">Award Header</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <Field label="Award Number" value={a.award_number} />
              <Field label="Benefit Code" value={a.benefit_code} />
              <Field label="Award Type" value={a.award_type} />
              <Field label="Status" value={a.status} />
              <Field label="Start Date" value={dt(a.start_date)} />
              <Field label="End Date" value={dt(a.end_date)} />
              <Field label="Base Amount" value={a.base_amount} />
              <Field label="Currency" value={a.currency} />
              <Field label="Frequency" value={a.frequency} />
              <Field label="Next Review" value={dt(a.next_review_date)} />
              <Field label="Notes" value={a.notes} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pensioner">
          <Card><CardHeader><CardTitle className="text-base">Pensioner / Payee</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <Field label="Name" value={pName} />
              <Field label="SSN" value={a.ssn} />
              <Field label="DOB" value={dt(data.pensioner?.dob)} />
              <Field label="Sex" value={data.pensioner?.sex} />
              <Field label="Mobile" value={data.pensioner?.mobile ?? data.pensioner?.phone} />
              <Field label="Email" value={data.pensioner?.email_addr ?? data.pensioner?.contact_email} />
              <Field label="Address" value={[data.pensioner?.resident_addr1, data.pensioner?.resident_addr2].filter(Boolean).join(', ')} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="claim">
          <Card><CardHeader><CardTitle className="text-base">Original Claim</CardTitle></CardHeader>
            <CardContent>
              {data.claim ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                  <Field label="Claim Number" value={data.claim.claim_number} />
                  <Field label="Status" value={data.claim.status} />
                  <Field label="Submitted" value={dt(data.claim.submission_date)} />
                  <Field label="Decision" value={data.claim.decision_status} />
                  <Field label="Application Channel" value={data.claim.application_channel} />
                  <div className="mt-2"><Button size="sm" variant="outline" onClick={() => navigate(`/bn/claims/${data.claim.id}/workbench`)}>Open Claim Workbench</Button></div>
                </div>
              ) : <p className="text-sm text-muted-foreground">No linked claim.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="product">
          <Card><CardHeader><CardTitle className="text-base">Product / Version</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <Field label="Product" value={data.product?.product_name ?? data.product?.product_code} />
              <Field label="Benefit Code" value={data.product?.benefit_code} />
              <Field label="Duration Type" value={data.product?.benefit_duration_type ?? data.productVersion?.benefit_duration_type ?? 'LONG_TERM'} />
              <Field label="Version" value={data.productVersion?.version_number} />
              <Field label="Effective From" value={dt(data.productVersion?.effective_from)} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="beneficiaries">
          <Card><CardHeader><CardTitle className="text-base">Beneficiaries</CardTitle></CardHeader>
            <CardContent>
              <SimpleTable rows={data.beneficiaries} empty="No beneficiaries on this award."
                columns={[
                  { key: 'full_name', label: 'Name' },
                  { key: 'beneficiary_ssn', label: 'SSN' },
                  { key: 'relationship', label: 'Relation' },
                  { key: 'share_percent', label: 'Share %' },
                  { key: 'share_amount', label: 'Amount' },
                  { key: 'start_date', label: 'Start', render: r => dt(r.start_date) },
                  { key: 'end_date', label: 'End', render: r => dt(r.end_date) },
                  { key: 'status', label: 'Status' },
                  { key: 'bank_acct', label: 'Bank Acct' },
                ]} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule">
          <Card><CardHeader><CardTitle className="text-base">Payment Schedule</CardTitle></CardHeader>
            <CardContent>
              <SimpleTable rows={data.schedules} empty="No payment schedule configured."
                columns={[
                  { key: 'frequency', label: 'Frequency' },
                  { key: 'amount', label: 'Amount' },
                  { key: 'next_run_date', label: 'Next Run', render: r => dt(r.next_run_date) },
                  { key: 'last_run_date', label: 'Last Run', render: r => dt(r.last_run_date) },
                  { key: 'status', label: 'Status' },
                ]} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card><CardHeader><CardTitle className="text-base">Payment History</CardTitle></CardHeader>
            <CardContent>
              <SimpleTable rows={data.payments} empty="No payments issued yet."
                columns={[
                  { key: 'instruction_number', label: 'Reference' },
                  { key: 'scheduled_date', label: 'Scheduled', render: r => dt(r.scheduled_date) },
                  { key: 'amount', label: 'Amount' },
                  { key: 'status', label: 'Status' },
                  { key: 'payment_method', label: 'Method' },
                ]} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lifecert">
          <Card><CardHeader><CardTitle className="text-base">Life Certificates</CardTitle></CardHeader>
            <CardContent>
              <SimpleTable rows={data.lifeCertificates} empty="No life certificate records."
                columns={[
                  { key: 'required_for_period', label: 'Period' },
                  { key: 'due_date', label: 'Due', render: r => dt(r.due_date) },
                  { key: 'submitted_date', label: 'Submitted', render: r => dt(r.submitted_date) },
                  { key: 'verified_date', label: 'Verified', render: r => dt(r.verified_date) },
                  { key: 'status', label: 'Status' },
                  { key: 'verification_method', label: 'Method' },
                ]} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="medical">
          <Card><CardHeader><CardTitle className="text-base">Medical Reviews</CardTitle></CardHeader>
            <CardContent>
              <SimpleTable rows={data.medicalReviews} empty="No medical reviews scheduled."
                columns={[
                  { key: 'review_type', label: 'Type' },
                  { key: 'scheduled_date', label: 'Scheduled', render: r => dt(r.scheduled_date) },
                  { key: 'completed_date', label: 'Completed', render: r => dt(r.completed_date) },
                  { key: 'outcome', label: 'Outcome' },
                  { key: 'examining_provider', label: 'Provider' },
                  { key: 'next_review_date', label: 'Next Review', render: r => dt(r.next_review_date) },
                ]} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suspensions">
          <Card><CardHeader><CardTitle className="text-base">Suspensions</CardTitle></CardHeader>
            <CardContent>
              <SimpleTable rows={data.suspensions} empty="No suspensions on this award."
                columns={[
                  { key: 'suspension_type', label: 'Type' },
                  { key: 'suspended_from', label: 'From', render: r => dt(r.suspended_from) },
                  { key: 'suspended_to', label: 'To', render: r => dt(r.suspended_to) },
                  { key: 'reason_code', label: 'Reason' },
                  { key: 'status', label: 'Status' },
                  { key: 'resumed_at', label: 'Resumed', render: r => dt(r.resumed_at) },
                ]} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overpay">
          <Card><CardHeader><CardTitle className="text-base">Overpayments</CardTitle></CardHeader>
            <CardContent>
              <SimpleTable rows={data.overpayments} empty="No overpayments recorded."
                columns={[
                  { key: 'overpayment_reference', label: 'Reference' },
                  { key: 'reason_code', label: 'Reason' },
                  { key: 'total_amount', label: 'Total' },
                  { key: 'recovered_amount', label: 'Recovered' },
                  { key: 'outstanding_amount', label: 'Outstanding' },
                  { key: 'recovery_method', label: 'Method' },
                  { key: 'status', label: 'Status' },
                ]} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comms">
          <Card><CardHeader><CardTitle className="text-base">Communications</CardTitle></CardHeader>
            <CardContent>
              <SimpleTable rows={data.communications} empty="No communications sent for this award."
                columns={[
                  { key: 'created_at', label: 'Date', render: r => dt(r.created_at) },
                  { key: 'delivery_method', label: 'Method', render: r => r.delivery_method ?? r.channel ?? '—' },
                  { key: 'template_code', label: 'Template' },
                  { key: 'recipient', label: 'Recipient' },
                  { key: 'status', label: 'Status' },
                ]} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card><CardHeader><CardTitle className="text-base">Status History</CardTitle></CardHeader>
            <CardContent>
              <SimpleTable rows={[...data.statusEvents, ...data.rateHistory.map((r: any) => ({ ...r, from_status: 'RATE', to_status: r.rate_amount, event_date: r.effective_from }))]}
                empty="No history yet."
                columns={[
                  { key: 'event_date', label: 'When', render: r => dt(r.event_date) },
                  { key: 'from_status', label: 'From' },
                  { key: 'to_status', label: 'To' },
                  { key: 'reason_code', label: 'Reason' },
                  { key: 'remarks', label: 'Remarks' },
                  { key: 'entered_by', label: 'By' },
                ]} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
