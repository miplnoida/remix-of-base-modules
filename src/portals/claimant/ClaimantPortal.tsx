import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { ExternalPortalShell } from '@/portals/_shared/ExternalPortalShell';
import { ExternalTaskList } from '@/portals/_shared/ExternalTaskList';
import { ExternalTaskForm } from '@/portals/_shared/ExternalTaskForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { useExternalProducts, useExternalClaimStatus, useExternalFormDefinition, useExternalMessages } from '@/portals/_shared/externalHooks';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { publicBenefitApi } from '@/portals/_shared/publicBenefitApiClient';
import { toast } from 'sonner';

const NAV = [
  { to: '/claimant/dashboard', label: 'Dashboard' },
  { to: '/claimant/apply', label: 'Apply' },
  { to: '/claimant/claims', label: 'My Claims' },
  { to: '/claimant/tasks', label: 'Pending Actions' },
  { to: '/claimant/documents', label: 'Documents' },
  { to: '/claimant/messages', label: 'Messages' },
  { to: '/claimant/payments', label: 'Payments' },
  { to: '/claimant/profile', label: 'Profile' },
];

export default function ClaimantPortal() {
  return (
    <ExternalPortalShell role="CLAIMANT" brand="Claimant Portal" nav={NAV}>
      <Routes>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="apply" element={<ApplyList />} />
        <Route path="apply/:productCode" element={<ApplyForm />} />
        <Route path="claims" element={<MyClaims />} />
        <Route path="claims/:claimNumber" element={<ClaimDetail />} />
        <Route path="tasks" element={<ExternalTaskList basePath="/claimant/tasks" />} />
        <Route path="tasks/:taskId" element={<TaskDetail />} />
        <Route path="documents" element={<Placeholder title="Documents" />} />
        <Route path="messages" element={<Messages />} />
        <Route path="payments" element={<Placeholder title="Payment History" />} />
        <Route path="profile" element={<Placeholder title="My Profile" />} />
      </Routes>
    </ExternalPortalShell>
  );
}

function Dashboard() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Link to="/claimant/apply"><Card className="hover:shadow-md"><CardHeader><CardTitle>Apply for a Benefit</CardTitle><CardDescription>Start a new benefit application.</CardDescription></CardHeader></Card></Link>
      <Link to="/claimant/claims"><Card className="hover:shadow-md"><CardHeader><CardTitle>My Claims</CardTitle><CardDescription>Status, decisions and payments.</CardDescription></CardHeader></Card></Link>
      <Link to="/claimant/tasks"><Card className="hover:shadow-md"><CardHeader><CardTitle>Pending Actions</CardTitle><CardDescription>Tasks you need to complete.</CardDescription></CardHeader></Card></Link>
      <Link to="/claimant/messages"><Card className="hover:shadow-md"><CardHeader><CardTitle>Messages &amp; Letters</CardTitle></CardHeader></Card></Link>
    </div>
  );
}

function ApplyList() {
  const { data, isLoading } = useExternalProducts();
  if (isLoading) return <Skeleton className="h-32 w-full" />;
  const products = data?.products ?? [];
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {products.map((p: any) => (
        <Link key={p.id} to={`/claimant/apply/${p.benefit_code}`}>
          <Card className="hover:shadow-md"><CardHeader><CardTitle className="text-base">{p.benefit_name}</CardTitle><CardDescription>{p.category} · {p.payment_type}</CardDescription></CardHeader></Card>
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
    } catch (e: any) {
      toast.error(e?.message ?? 'Submission failed');
    } finally { setSubmitting(false); }
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

function MyClaims() {
  return <Placeholder title="My Claims" description="Your submitted claims will appear here. Internal BN drives status updates." />;
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
function TaskDetail() {
  const { taskId } = useParams<{ taskId: string }>();
  return <ExternalTaskForm taskId={taskId!} />;
}
function Messages() {
  const { data, isLoading } = useExternalMessages();
  if (isLoading) return <Skeleton className="h-32 w-full" />;
  return (
    <div className="space-y-2">
      {(data?.messages ?? []).map((m: any) => (
        <Card key={m.id}><CardHeader><CardTitle className="text-base">{m.subject ?? m.template_code ?? 'Message'}</CardTitle><CardDescription>{m.created_at}</CardDescription></CardHeader></Card>
      ))}
      {(data?.messages ?? []).length === 0 && <p className="text-sm text-muted-foreground">No messages yet.</p>}
    </div>
  );
}
function Placeholder({ title, description }: { title: string; description?: string }) {
  return <Card><CardHeader><CardTitle>{title}</CardTitle>{description && <CardDescription>{description}</CardDescription>}</CardHeader></Card>;
}
