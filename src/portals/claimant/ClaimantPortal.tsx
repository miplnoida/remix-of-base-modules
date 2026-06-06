import { Routes, Route, Navigate, useParams, Link } from 'react-router-dom';
import { ExternalPortalShell } from '@/portals/_shared/ExternalPortalShell';
import { ExternalTaskList } from '@/portals/_shared/ExternalTaskList';
import { ExternalTaskForm } from '@/portals/_shared/ExternalTaskForm';
import { PortalModulePlaceholder } from '@/portals/_shared/PortalModulePlaceholder';
import { PortalFormRenderer } from '@/components/external/PortalFormRenderer';
import { RequirePersonaFlag } from '@/components/external/RequirePersonaFlag';
import ClaimantLanding from '@/portals/claimant/ClaimantLanding';
import LinkSsnPage from '@/portals/claimant/LinkSsnPage';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  useExternalClaimStatus, useExternalMessages,
  useExternalClaims, useExternalClaimBuckets, useExternalAwards, useExternalPayments, useExternalContributions,
  useExternalEmploymentHistory, useExternalProfile,
} from '@/portals/_shared/externalHooks';
import { useClaimantPersona } from '@/hooks/external/useClaimantPersona';
import { useProductApplicability, type ApplicableProduct } from '@/hooks/external/useProductApplicability';
import { useMemo } from 'react';

interface NavItem { to: string; label: string }

function buildNav(flags: Record<string, boolean> | undefined): NavItem[] {
  const f = flags ?? {};
  const items: NavItem[] = [
    { to: '/claimant/dashboard', label: 'Dashboard' },
    { to: '/claimant/profile', label: 'My Profile' },
  ];
  if (f.canViewContributions) items.push({ to: '/claimant/contributions', label: 'Contribution History' });
  if (f.canViewEmploymentHistory) items.push({ to: '/claimant/employment-history', label: 'Employment History' });
  items.push({ to: '/claimant/apply', label: 'Apply for Benefits' });
  items.push({ to: '/claimant/claims', label: 'My Claims' });
  items.push({ to: '/claimant/awards', label: 'My Awards / Pensions' });
  if (f.canViewPayments) items.push({ to: '/claimant/payments', label: 'Payment History' });
  items.push(
    { to: '/claimant/life-certificates', label: 'Life Certificates' },
    { to: '/claimant/school-certificates', label: 'School Certificates' },
    { to: '/claimant/bank-details', label: 'EFT / Bank Update' },
    { to: '/claimant/documents', label: 'Documents' },
    { to: '/claimant/messages', label: 'Messages / Letters' },
    { to: '/claimant/appeals', label: 'Appeals / Reconsideration' },
    { to: '/claimant/tasks', label: 'Pending Tasks' },
  );
  return items;
}

export default function ClaimantPortal() {
  const { persona } = useClaimantPersona();
  const nav = useMemo(() => buildNav(persona?.flags as any), [persona]);
  return (
    <Routes>
      <Route index element={<ClaimantLanding />} />
      <Route path="*" element={
        <ExternalPortalShell role="CLAIMANT" brand="Insured Person Portal" nav={nav}>
          <Routes>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="profile" element={<Profile />} />
            <Route path="link-ssn" element={<LinkSsnPage />} />
            <Route path="contributions" element={
              <RequirePersonaFlag flag="canViewContributions" title="Contribution history is private">
                <Contributions />
              </RequirePersonaFlag>
            } />
            <Route path="employment-history" element={
              <RequirePersonaFlag flag="canViewEmploymentHistory" title="Employment history is private">
                <Employment />
              </RequirePersonaFlag>
            } />
            <Route path="apply" element={<ApplyList />} />
            <Route path="apply/:productCode" element={<ApplyForm />} />
            <Route path="claims" element={<Claims />} />
            <Route path="claims/:claimNumber" element={<ClaimDetail />} />
            <Route path="awards" element={<Awards />} />
            <Route path="payments" element={
              <RequirePersonaFlag flag="canViewPayments" title="No payments visible to this account">
                <Payments />
              </RequirePersonaFlag>
            } />
            <Route path="life-certificates" element={<PortalModulePlaceholder title="Life Certificates" description="Annual proof-of-life submissions for pensioners." internalSource="bn_life_certificate" />} />
            <Route path="school-certificates" element={<PortalModulePlaceholder title="School / College Certificates" description="Enrolment proofs for survivor / orphan beneficiaries." internalSource="bn_external_task" />} />
            <Route path="bank-details" element={<PortalModulePlaceholder title="EFT / Bank Account Update" description="Submit or update your bank account for benefit payments." internalSource="cl_bank_acct" />} />
            <Route path="documents" element={<PortalModulePlaceholder title="My Documents" description="Documents you have uploaded to support claims, certificates and requests." internalSource="ip_documents" />} />
            <Route path="messages" element={<Messages />} />
            <Route path="appeals" element={<PortalModulePlaceholder title="Appeals / Reconsideration" description="Request review of a benefit decision. Routed to Internal BN Appeals workflow." internalSource="bn_claim_decision" />} />
            <Route path="tasks" element={<ExternalTaskList basePath="/claimant/tasks" />} />
            <Route path="tasks/:taskId" element={<TaskDetail />} />
            <Route path="*" element={<Navigate to="/claimant/dashboard" replace />} />
          </Routes>
        </ExternalPortalShell>
      } />
    </Routes>
  );
}

function PersonaSummary() {
  const { persona, isLoading } = useClaimantPersona();
  if (isLoading || !persona) return null;
  const hasSelf = !!persona.personSsn;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{persona.displayName}</CardTitle>
        <CardDescription className="flex flex-wrap gap-1">
          {persona.personas.length === 0
            ? <span>No persona detected yet.</span>
            : persona.personas.map(p => <Badge key={p} variant="secondary">{p.replace('_',' ')}</Badge>)}
        </CardDescription>
      </CardHeader>
      {!hasSelf && (
        <CardContent>
          <div className="flex items-center justify-between gap-3 rounded-md border border-dashed p-3 text-sm">
            <div>
              <div className="font-medium">Are you the insured person?</div>
              <div className="text-muted-foreground">Link your SSN to unlock contribution and employment history.</div>
            </div>
            <Button asChild size="sm"><Link to="/claimant/link-ssn">Link my SSN</Link></Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function Dashboard() {
  const { persona } = useClaimantPersona();
  const f = persona?.flags;
  const allCards = [
    { to: '/claimant/apply', title: 'Apply for a Benefit', desc: 'Sickness, Maternity, Funeral, Survivors and more.', show: true },
    { to: '/claimant/claims', title: 'My Claims', desc: 'Track submitted claims and decisions.', show: true },
    { to: '/claimant/awards', title: 'My Awards / Pensions', desc: 'Active awards and entitlements.', show: true },
    { to: '/claimant/payments', title: 'Payment History', desc: 'Past benefit payments and EFTs.', show: !!f?.canViewPayments },
    { to: '/claimant/contributions', title: 'Contribution History', desc: 'Your annual contribution summary.', show: !!f?.canViewContributions },
    { to: '/claimant/employment-history', title: 'Employment History', desc: 'Employers you contributed under.', show: !!f?.canViewEmploymentHistory },
    { to: '/claimant/tasks', title: 'Pending Tasks', desc: 'Actions you need to complete.', show: true },
    { to: '/claimant/messages', title: 'Messages & Letters', desc: 'Official communications from SSB.', show: true },
  ];
  const cards = allCards.filter(c => c.show);
  return (
    <div className="space-y-6">
      <PersonaSummary />
      <ClaimBuckets />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map(c => (
          <Link key={c.to} to={c.to}>
            <Card className="hover:shadow-md transition-shadow h-full">
              <CardHeader><CardTitle className="text-base">{c.title}</CardTitle><CardDescription>{c.desc}</CardDescription></CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function ClaimBuckets() {
  const { data, isLoading } = useExternalClaimBuckets();
  if (isLoading) return <Skeleton className="h-32 w-full" />;
  const b = data ?? { own: [], submittedForOthers: [], asBeneficiary: [], asGuardianOrPayee: [] };
  const cards = [
    { title: 'My own claims', items: b.own },
    { title: 'Submitted for someone else', items: b.submittedForOthers },
    { title: 'As beneficiary', items: b.asBeneficiary },
    { title: 'As guardian / payee', items: b.asGuardianOrPayee },
  ];
  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
      {cards.map(c => (
        <Card key={c.title}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{c.title}</CardTitle>
            <CardDescription className="text-2xl font-bold text-foreground">{c.items.length}</CardDescription>
          </CardHeader>
        </Card>
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
  const { data, isLoading, error } = useProductApplicability();
  const { persona } = useClaimantPersona();
  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (error) return <Card><CardContent className="py-6 text-sm text-destructive">{(error as Error).message}</CardContent></Card>;
  const products = data ?? [];
  if (products.length === 0) {
    return (
      <Card><CardHeader>
        <CardTitle className="text-base">No benefits available online</CardTitle>
        <CardDescription>Admin must publish a product version with a participant config.</CardDescription>
      </CardHeader></Card>
    );
  }
  const canApplyForSelf = !!persona?.flags?.canApplyForSelf;
  const canApplyForOthers = !!persona?.flags?.canApplyForOthers;
  const forSelf = products.filter(p => p.allowsSelf);
  // "Apply for others" — only the products whose participant config permits a non-SELF applicant.
  const forOthers = products.filter(p => p.allowsOthers);

  return (
    <div className="space-y-6">
      <PersonaSummary />
      <section>
        <div className="mb-3">
          <h2 className="text-lg font-semibold">Apply for myself</h2>
          <p className="text-sm text-muted-foreground">
            {canApplyForSelf
              ? 'Benefits you can apply for as the insured person.'
              : 'Link your SSN to apply for benefits as the insured person.'}
          </p>
        </div>
        <ProductGrid products={forSelf} disabled={!canApplyForSelf} disabledHint="Link your SSN to enable" />
      </section>
      <section>
        <div className="mb-3">
          <h2 className="text-lg font-semibold">Apply for someone else</h2>
          <p className="text-sm text-muted-foreground">
            Only products whose configuration allows a guardian, payee, representative or next-of-kin to file are listed here.
          </p>
        </div>
        {forOthers.length === 0 ? (
          <Card><CardContent className="py-6 text-sm text-muted-foreground">No products currently permit a non-self applicant.</CardContent></Card>
        ) : (
          <ProductGrid products={forOthers} disabled={!canApplyForOthers} disabledHint="You need a verified guardian / payee / representative link to file for others" />
        )}
      </section>
    </div>
  );
}

function ProductGrid({ products, disabled, disabledHint }: { products: ApplicableProduct[]; disabled: boolean; disabledHint: string }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {products.map(p => {
        const card = (
          <Card className={`h-full ${disabled ? 'opacity-60' : 'hover:shadow-md'}`}>
            <CardHeader>
              <CardTitle className="text-base">{p.benefit_name}</CardTitle>
              <CardDescription>
                {p.category} · {p.payment_type}
                {p.requiresDeceased && <> · <Badge variant="secondary">requires deceased</Badge></>}
              </CardDescription>
            </CardHeader>
            {disabled && <CardContent className="text-xs text-muted-foreground">{disabledHint}</CardContent>}
          </Card>
        );
        return disabled
          ? <div key={p.id}>{card}</div>
          : <Link key={p.id} to={`/claimant/apply/${p.benefit_code}`}>{card}</Link>;
      })}
    </div>
  );
}

function ApplyForm() {
  const { productCode } = useParams<{ productCode: string }>();
  if (!productCode) return <p className="text-sm text-destructive">Missing product.</p>;
  return <PortalFormRenderer productCode={productCode} />;
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
