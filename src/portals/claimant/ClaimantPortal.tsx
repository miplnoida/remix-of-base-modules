import { Routes, Route, Navigate, useParams, Link } from 'react-router-dom';
import { ExternalPortalShell } from '@/portals/_shared/ExternalPortalShell';
import { ExternalTaskList } from '@/portals/_shared/ExternalTaskList';
import { ExternalTaskForm } from '@/portals/_shared/ExternalTaskForm';
import { PortalModulePlaceholder } from '@/portals/_shared/PortalModulePlaceholder';
import ClaimantLanding from '@/portals/claimant/ClaimantLanding';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { publicBenefitApi } from '@/portals/_shared/publicBenefitApiClient';
import {
  useExternalProducts, useExternalClaimStatus, useExternalFormDefinition, useExternalMessages,
  useExternalClaims, useExternalAwards, useExternalPayments, useExternalContributions,
  useExternalEmploymentHistory, useExternalProfile,
} from '@/portals/_shared/externalHooks';
import { useState } from 'react';
import { toast } from 'sonner';

const NAV = [
  { to: '/claimant/dashboard', label: 'Dashboard' },
  { to: '/claimant/profile', label: 'My Profile' },
  { to: '/claimant/contributions', label: 'Contribution History' },
  { to: '/claimant/employment-history', label: 'Employment History' },
  { to: '/claimant/apply', label: 'Apply for Benefits' },
  { to: '/claimant/claims', label: 'My Claims' },
  { to: '/claimant/awards', label: 'My Awards / Pensions' },
  { to: '/claimant/payments', label: 'Payment History' },
  { to: '/claimant/life-certificates', label: 'Life Certificates' },
  { to: '/claimant/school-certificates', label: 'School Certificates' },
  { to: '/claimant/bank-details', label: 'EFT / Bank Update' },
  { to: '/claimant/documents', label: 'Documents' },
  { to: '/claimant/messages', label: 'Messages / Letters' },
  { to: '/claimant/appeals', label: 'Appeals / Reconsideration' },
  { to: '/claimant/tasks', label: 'Pending Tasks' },
];

export default function ClaimantPortal() {
  return (
    <ExternalPortalShell role="CLAIMANT" brand="Insured Person Portal" nav={NAV}>
      <Routes>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="profile" element={<Profile />} />
        <Route path="contributions" element={<Contributions />} />
        <Route path="employment-history" element={<Employment />} />
        <Route path="apply" element={<ApplyList />} />
        <Route path="apply/:productCode" element={<ApplyForm />} />
        <Route path="claims" element={<Claims />} />
        <Route path="claims/:claimNumber" element={<ClaimDetail />} />
        <Route path="awards" element={<Awards />} />
        <Route path="payments" element={<Payments />} />
        <Route path="life-certificates" element={<PortalModulePlaceholder title="Life Certificates" description="Annual proof-of-life submissions for pensioners." internalSource="bn_life_certificate" />} />
        <Route path="school-certificates" element={<PortalModulePlaceholder title="School / College Certificates" description="Enrolment proofs for survivor / orphan beneficiaries." internalSource="bn_external_task" />} />
        <Route path="bank-details" element={<PortalModulePlaceholder title="EFT / Bank Account Update" description="Submit or update your bank account for benefit payments." internalSource="cl_bank_acct" />} />
        <Route path="documents" element={<PortalModulePlaceholder title="My Documents" description="Documents you have uploaded to support claims, certificates and requests." internalSource="ip_documents" />} />
        <Route path="messages" element={<Messages />} />
        <Route path="appeals" element={<PortalModulePlaceholder title="Appeals / Reconsideration" description="Request review of a benefit decision. Routed to Internal BN Appeals workflow." internalSource="bn_claim_decision" />} />
        <Route path="tasks" element={<ExternalTaskList basePath="/claimant/tasks" />} />
        <Route path="tasks/:taskId" element={<TaskDetail />} />
      </Routes>
    </ExternalPortalShell>
  );
}

function Dashboard() {
  const cards = [
    { to: '/claimant/apply', title: 'Apply for a Benefit', desc: 'Sickness, Maternity, Funeral, Survivors and more.' },
    { to: '/claimant/claims', title: 'My Claims', desc: 'Track submitted claims and decisions.' },
    { to: '/claimant/awards', title: 'My Awards / Pensions', desc: 'Active awards and entitlements.' },
    { to: '/claimant/payments', title: 'Payment History', desc: 'Past benefit payments and EFTs.' },
    { to: '/claimant/contributions', title: 'Contribution History', desc: 'Your annual contribution summary.' },
    { to: '/claimant/employment-history', title: 'Employment History', desc: 'Employers you contributed under.' },
    { to: '/claimant/tasks', title: 'Pending Tasks', desc: 'Actions you need to complete.' },
    { to: '/claimant/messages', title: 'Messages & Letters', desc: 'Official communications from SSB.' },
  ];
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {cards.map(c => (
        <Link key={c.to} to={c.to}>
          <Card className="hover:shadow-md transition-shadow h-full">
            <CardHeader><CardTitle className="text-base">{c.title}</CardTitle><CardDescription>{c.desc}</CardDescription></CardHeader>
          </Card>
        </Link>
      ))}
    </div>
  );
}

function Profile() {
  const { data, isLoading } = useExternalProfile();
  if (isLoading) return <Skeleton className="h-32 w-full" />;
  const p = data?.profile;
  return (
    <Card>
      <CardHeader><CardTitle>My Profile</CardTitle><CardDescription>Sourced from Insured Person Master (ip_master).</CardDescription></CardHeader>
      <CardContent>
        {!p ? <p className="text-sm text-muted-foreground">No profile on record.</p> : (
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-muted-foreground">SSN</dt><dd className="font-mono">{p.ssn}</dd>
            <dt className="text-muted-foreground">Name</dt><dd>{p.first_name} {p.last_name}</dd>
            <dt className="text-muted-foreground">Date of Birth</dt><dd>{p.dob ?? '—'}</dd>
            <dt className="text-muted-foreground">Gender</dt><dd>{p.gender ?? '—'}</dd>
            <dt className="text-muted-foreground">Mobile</dt><dd>{p.mobile_phone ?? '—'}</dd>
            <dt className="text-muted-foreground">Email</dt><dd>{p.email ?? '—'}</dd>
          </dl>
        )}
      </CardContent>
    </Card>
  );
}

function Contributions() {
  const { data, isLoading } = useExternalContributions();
  if (isLoading) return <Skeleton className="h-48 w-full" />;
  const rows = data?.contributions ?? [];
  return (
    <Card>
      <CardHeader><CardTitle>Contribution History</CardTitle><CardDescription>Annual contribution summary (ip_wages_ann_sum).</CardDescription></CardHeader>
      <CardContent>
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">No contribution records.</p> : (
          <Table>
            <TableHeader><TableRow><TableHead>Year</TableHead><TableHead>Weeks</TableHead><TableHead>Wages</TableHead><TableHead>Contributions</TableHead></TableRow></TableHeader>
            <TableBody>{rows.map((r: any, i: number) => (
              <TableRow key={i}><TableCell>{r.year_paid}</TableCell><TableCell>{r.weeks_paid ?? '—'}</TableCell><TableCell>{r.wages_paid ?? '—'}</TableCell><TableCell>{r.contributions_paid ?? '—'}</TableCell></TableRow>
            ))}</TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function Employment() {
  const { data, isLoading } = useExternalEmploymentHistory();
  if (isLoading) return <Skeleton className="h-48 w-full" />;
  const rows = data?.employment ?? [];
  return (
    <Card>
      <CardHeader><CardTitle>Employment History</CardTitle><CardDescription>Employers you contributed under (ip_employer).</CardDescription></CardHeader>
      <CardContent>
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">No employment history on record.</p> : (
          <Table>
            <TableHeader><TableRow><TableHead>Employer</TableHead><TableHead>Start</TableHead><TableHead>End</TableHead><TableHead>Occupation</TableHead></TableRow></TableHeader>
            <TableBody>{rows.map((r: any, i: number) => (
              <TableRow key={i}><TableCell className="font-mono">{r.regno}</TableCell><TableCell>{r.start_date ?? '—'}</TableCell><TableCell>{r.end_date ?? 'Current'}</TableCell><TableCell>{r.occup_code ?? '—'}</TableCell></TableRow>
            ))}</TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function ApplyList() {
  const { data, isLoading, error } = useExternalProducts();
  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (error) return <Card><CardContent className="py-6 text-sm text-destructive">{(error as Error).message}</CardContent></Card>;
  const products = data?.products ?? [];
  if (products.length === 0) {
    return (
      <Card><CardHeader>
        <CardTitle className="text-base">No benefits available online</CardTitle>
        <CardDescription>Admin must enable the <b>Online</b> channel on a product version and attach a CLAIMANT screen template.</CardDescription>
      </CardHeader></Card>
    );
  }
  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {products.map((p: any) => (
        <Link key={p.id} to={`/claimant/apply/${p.benefit_code}`}>
          <Card className="hover:shadow-md h-full"><CardHeader><CardTitle className="text-base">{p.benefit_name}</CardTitle><CardDescription>{p.category} · {p.payment_type}</CardDescription></CardHeader></Card>
        </Link>
      ))}
    </div>
  );
}

function ApplyForm() {
  const { productCode } = useParams<{ productCode: string }>();
  const { data, isLoading, error } = useExternalFormDefinition(productCode, 'CLAIMANT');
  const [values, setValues] = useState<Record<string, any>>({});
  const [declaration, setDeclaration] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (error) return <p className="text-sm text-destructive">{(error as Error).message}</p>;
  const fields: any[] = data?.fields ?? [];
  const submit = async () => {
    setSubmitting(true);
    try {
      const res = await publicBenefitApi.submitApplication({ productCode: productCode!, values, declarationAccepted: declaration });
      toast.success(`Application submitted. Reference ${res.claimNumber}`);
    } catch (e: any) { toast.error(e?.message ?? 'Submission failed'); } finally { setSubmitting(false); }
  };
  return (
    <Card>
      <CardHeader><CardTitle>{data?.product?.productName}</CardTitle><CardDescription>Reference templates from Product Catalog · v{data?.version?.number}</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        {fields.length === 0 && <p className="text-sm text-muted-foreground">No public fields configured for this product.</p>}
        {fields.map((f: any) => (
          <div key={f.id ?? f.field_code} className="space-y-1">
            <label className="text-xs">{f.field_label}{f.is_required && <span className="text-destructive"> *</span>}</label>
            <input className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={values[f.field_code] ?? ''} onChange={e => setValues(p => ({ ...p, [f.field_code]: e.target.value }))} />
            {f.help_text && <p className="text-[10px] text-muted-foreground">{f.help_text}</p>}
          </div>
        ))}
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={declaration} onChange={e => setDeclaration(e.target.checked)} /> I declare the above is true and complete.</label>
        <div className="flex justify-end"><Button onClick={submit} disabled={submitting || !declaration}>{submitting ? 'Submitting…' : 'Submit Application'}</Button></div>
      </CardContent>
    </Card>
  );
}

function Claims() {
  const { data, isLoading } = useExternalClaims();
  if (isLoading) return <Skeleton className="h-48 w-full" />;
  const rows = data?.claims ?? [];
  return (
    <Card>
      <CardHeader><CardTitle>My Claims</CardTitle><CardDescription>All claims you have submitted (bn_claim).</CardDescription></CardHeader>
      <CardContent>
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">No claims yet.</p> : (
          <Table>
            <TableHeader><TableRow><TableHead>Claim Number</TableHead><TableHead>Status</TableHead><TableHead>Submitted</TableHead><TableHead>Decision</TableHead></TableRow></TableHeader>
            <TableBody>{rows.map((c: any) => (
              <TableRow key={c.id}>
                <TableCell><Link className="text-primary hover:underline font-mono" to={`/claimant/claims/${c.claim_number}`}>{c.claim_number}</Link></TableCell>
                <TableCell><Badge>{c.status}</Badge></TableCell>
                <TableCell>{c.submission_date ?? '—'}</TableCell>
                <TableCell>{c.decision_date ?? '—'}</TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function ClaimDetail() {
  const { claimNumber } = useParams<{ claimNumber: string }>();
  const { data, isLoading } = useExternalClaimStatus(claimNumber);
  if (isLoading) return <Skeleton className="h-32 w-full" />;
  return (
    <Card>
      <CardHeader><CardTitle>Claim {claimNumber}</CardTitle><CardDescription>Status driven by Internal BN.</CardDescription></CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div>Status: <Badge>{data?.claim?.status}</Badge></div>
        <div>Submitted: {data?.claim?.submission_date}</div>
        {data?.decision && <div>Decision: {data.decision.decision_type}</div>}
        <div>Payments: {data?.payments?.length ?? 0}</div>
      </CardContent>
    </Card>
  );
}

function Awards() {
  const { data, isLoading } = useExternalAwards();
  if (isLoading) return <Skeleton className="h-48 w-full" />;
  const rows = data?.awards ?? [];
  return (
    <Card>
      <CardHeader><CardTitle>My Awards / Pensions</CardTitle><CardDescription>Active and historical awards (bn_award).</CardDescription></CardHeader>
      <CardContent>
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">No awards on record.</p> : (
          <Table>
            <TableHeader><TableRow><TableHead>Award #</TableHead><TableHead>Type</TableHead><TableHead>Start</TableHead><TableHead>Rate</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>{rows.map((a: any) => (
              <TableRow key={a.id}><TableCell className="font-mono">{a.award_number ?? a.id.slice(0,8)}</TableCell><TableCell>{a.award_type ?? '—'}</TableCell><TableCell>{a.start_date ?? '—'}</TableCell><TableCell>{a.weekly_rate ?? a.monthly_rate ?? '—'}</TableCell><TableCell><Badge>{a.status}</Badge></TableCell></TableRow>
            ))}</TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function Payments() {
  const { data, isLoading } = useExternalPayments();
  if (isLoading) return <Skeleton className="h-48 w-full" />;
  const rows = data?.payments ?? [];
  return (
    <Card>
      <CardHeader><CardTitle>Payment History</CardTitle><CardDescription>Benefit payments to you (bn_payment_instruction).</CardDescription></CardHeader>
      <CardContent>
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">No payments recorded.</p> : (
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Gross</TableHead><TableHead>Net</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>{rows.map((p: any) => (
              <TableRow key={p.id}><TableCell>{p.payment_date}</TableCell><TableCell>{p.gross_amount}</TableCell><TableCell>{p.net_amount ?? p.gross_amount}</TableCell><TableCell><Badge>{p.status}</Badge></TableCell></TableRow>
            ))}</TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function Messages() {
  const { data, isLoading } = useExternalMessages();
  if (isLoading) return <Skeleton className="h-32 w-full" />;
  const rows = data?.messages ?? [];
  return (
    <div className="space-y-2">
      {rows.length === 0 && <p className="text-sm text-muted-foreground">No messages yet.</p>}
      {rows.map((m: any) => (
        <Card key={m.id}><CardHeader><CardTitle className="text-base">{m.subject ?? m.template_code ?? 'Message'}</CardTitle><CardDescription>{m.created_at}</CardDescription></CardHeader></Card>
      ))}
    </div>
  );
}

function TaskDetail() {
  const { taskId } = useParams<{ taskId: string }>();
  return <ExternalTaskForm taskId={taskId!} />;
}
