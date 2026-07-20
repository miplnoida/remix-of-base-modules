import { Routes, Route, Navigate, useParams, Link } from 'react-router-dom';
import { ExternalPortalShell } from '@/portals/_shared/ExternalPortalShell';
import { ExternalTaskList } from '@/portals/_shared/ExternalTaskList';
import { ExternalTaskForm } from '@/portals/_shared/ExternalTaskForm';
import { PortalModulePlaceholder } from '@/portals/_shared/PortalModulePlaceholder';
import EmployerLanding from '@/portals/employer/EmployerLanding';
import EmployerWaivers from '@/portals/employer/EmployerWaivers';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  useEmployerProfile, useEmployerEmployees, useEmployerC3History, useEmployerContributions,
  useEmployerPayments, useEmployerBalances, useEmployerNotices, useExternalMessages,
} from '@/portals/_shared/externalHooks';

const NAV = [
  { to: '/employer/dashboard', label: 'Dashboard' },
  { to: '/employer/profile', label: 'Employer Profile' },
  { to: '/employer/users', label: 'Users & Roles' },
  { to: '/employer/employees', label: 'Employee Register' },
  { to: '/employer/employees/add', label: 'Add Employee' },
  { to: '/employer/c3', label: 'C3 Submissions' },
  { to: '/employer/c3/new', label: 'New C3' },
  { to: '/employer/c3/upload', label: 'Upload C3 File' },
  { to: '/employer/c3/errors', label: 'C3 Validation Errors' },
  { to: '/employer/contributions', label: 'Contribution History' },
  { to: '/employer/payments', label: 'Payment Status' },
  { to: '/employer/balances', label: 'Outstanding Balances' },
  { to: '/employer/penalties', label: 'Penalties / Arrears' },
  { to: '/employer/compliance', label: 'Compliance Notices' },
  { to: '/employer/waivers', label: 'Waiver Requests' },
  { to: '/employer/benefit-tasks', label: 'Benefit Claim Tasks' },
  { to: '/employer/confirmations', label: 'Employment Confirmations' },
  { to: '/employer/wage-confirmations', label: 'Wage Confirmations' },
  { to: '/employer/accident-reports', label: 'Accident Reports' },
  { to: '/employer/documents', label: 'Documents' },
  { to: '/employer/messages', label: 'Messages / Letters' },
];

export default function EmployerPortal() {
  return (
    <Routes>
      <Route index element={<EmployerLanding />} />
      <Route path="*" element={
        <ExternalPortalShell role="EMPLOYER" brand="Employer Portal" nav={NAV}>
          <Routes>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="profile" element={<Profile />} />
            <Route path="users" element={<PortalModulePlaceholder title="Employer Users & Roles" description="Manage payroll, HR, compliance and benefit-confirmation users." internalSource="user_roles + employer link" />} />
            <Route path="employees" element={<Employees />} />
            <Route path="employees/add" element={<PortalModulePlaceholder title="Add Employee" description="Register a new employee under this employer." internalSource="ip_employer" />} />
            <Route path="c3" element={<C3History />} />
            <Route path="c3/new" element={<PortalModulePlaceholder title="New C3 Submission" description="Submit monthly C3 contributions interactively." internalSource="cn_c3_reported" />} />
            <Route path="c3/upload" element={<PortalModulePlaceholder title="Upload C3 File" description="Upload a C3 file for validation and submission." internalSource="electronic_c3_uploads" />} />
            <Route path="c3/errors" element={<PortalModulePlaceholder title="C3 Validation Errors" description="Errors returned by Internal C3 validation for correction." internalSource="c3_import_err" />} />
            <Route path="c3/:period" element={<C3PeriodDetail />} />
            <Route path="contributions" element={<Contributions />} />
            <Route path="payments" element={<Payments />} />
            <Route path="balances" element={<Balances />} />
            <Route path="penalties" element={<PortalModulePlaceholder title="Penalties / Arrears" description="Outstanding penalties and arrears notices." internalSource="cn_arrears_liab + tb_penalty" />} />
            <Route path="compliance" element={<Compliance />} />
            <Route path="waivers" element={<EmployerWaivers />} />
            <Route path="benefit-tasks" element={<ExternalTaskList basePath="/employer/benefit-tasks" />} />
            <Route path="benefit-tasks/:taskId" element={<TaskDetail />} />
            <Route path="confirmations" element={<PortalModulePlaceholder title="Employment Confirmations" description="Confirm last worked date and employment status for benefit claims." internalSource="bn_external_task" />} />
            <Route path="wage-confirmations" element={<PortalModulePlaceholder title="Wage Confirmations" description="Confirm wages paid for benefit calculation." internalSource="bn_claim_employer_snapshot" />} />
            <Route path="accident-reports" element={<PortalModulePlaceholder title="Employment Injury Accident Reports" description="Submit and track accident reports for Employment Injury benefit." internalSource="bn_external_task" />} />
            <Route path="documents" element={<PortalModulePlaceholder title="Employer Documents" description="Documents uploaded by this employer." internalSource="er_documents" />} />
            <Route path="messages" element={<Messages />} />
            <Route path="*" element={<Navigate to="/employer/dashboard" replace />} />
          </Routes>
        </ExternalPortalShell>
      } />
    </Routes>
  );
}

function Dashboard() {
  const cards = [
    { to: '/employer/c3/new', title: 'Submit Monthly C3', desc: 'File contributions for the latest period.' },
    { to: '/employer/c3', title: 'C3 History', desc: 'All submitted periods and statuses.' },
    { to: '/employer/balances', title: 'Outstanding Balances', desc: 'What you owe.' },
    { to: '/employer/employees', title: 'Employee Register', desc: 'Currently registered employees.' },
    { to: '/employer/benefit-tasks', title: 'Benefit Claim Tasks', desc: 'Confirmations requested by SSB.' },
    { to: '/employer/compliance', title: 'Compliance Notices', desc: 'Official notices and audit requests.' },
    { to: '/employer/payments', title: 'Payment Receipts', desc: 'Receipts for contributions paid.' },
    { to: '/employer/messages', title: 'Messages & Letters', desc: 'Official communications from SSB.' },
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
  const { data, isLoading } = useEmployerProfile();
  if (isLoading) return <Skeleton className="h-32 w-full" />;
  const e = data?.employer;
  return (
    <Card>
      <CardHeader><CardTitle>Employer Profile</CardTitle><CardDescription>Sourced from Employer Master (er_master).</CardDescription></CardHeader>
      <CardContent>
        {!e ? <p className="text-sm text-muted-foreground">No employer profile on record.</p> : (
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Reg No</dt><dd className="font-mono">{e.regno}</dd>
            <dt className="text-muted-foreground">Name</dt><dd>{e.employer_name}</dd>
            <dt className="text-muted-foreground">Address</dt><dd>{[e.address_line1, e.address_line2, e.city].filter(Boolean).join(', ')}</dd>
            <dt className="text-muted-foreground">Country</dt><dd>{e.country_code}</dd>
            <dt className="text-muted-foreground">Email</dt><dd>{e.email ?? '—'}</dd>
            <dt className="text-muted-foreground">Phone</dt><dd>{e.phone ?? '—'}</dd>
            <dt className="text-muted-foreground">Status</dt><dd><Badge>{e.status}</Badge></dd>
          </dl>
        )}
      </CardContent>
    </Card>
  );
}

function Employees() {
  const { data, isLoading } = useEmployerEmployees();
  if (isLoading) return <Skeleton className="h-48 w-full" />;
  const rows = data?.employees ?? [];
  return (
    <Card>
      <CardHeader><CardTitle>Employee Register</CardTitle><CardDescription>Currently linked employees (ip_employer, open).</CardDescription></CardHeader>
      <CardContent>
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">No current employees on record.</p> : (
          <Table>
            <TableHeader><TableRow><TableHead>SSN</TableHead><TableHead>Start</TableHead><TableHead>Occupation</TableHead></TableRow></TableHeader>
            <TableBody>{rows.map((r: any, i: number) => (
              <TableRow key={i}><TableCell className="font-mono">{r.ssn}</TableCell><TableCell>{r.start_date ?? '—'}</TableCell><TableCell>{r.occup_code ?? '—'}</TableCell></TableRow>
            ))}</TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function C3History() {
  const { data, isLoading } = useEmployerC3History();
  if (isLoading) return <Skeleton className="h-48 w-full" />;
  const rows = data?.submissions ?? [];
  return (
    <Card>
      <CardHeader><CardTitle>C3 Submissions</CardTitle><CardDescription>Monthly contribution returns (cn_c3_reported).</CardDescription></CardHeader>
      <CardContent>
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">No C3 submissions on record.</p> : (
          <Table>
            <TableHeader><TableRow><TableHead>Period</TableHead><TableHead>Wages</TableHead><TableHead>Contributions</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>{rows.slice(0,50).map((r: any, i: number) => (
              <TableRow key={i}><TableCell>{r.period_year}-{String(r.period_month).padStart(2,'0')}</TableCell><TableCell>{r.wages_paid ?? '—'}</TableCell><TableCell>{r.contributions_paid ?? '—'}</TableCell><TableCell><Badge>{r.status ?? 'POSTED'}</Badge></TableCell></TableRow>
            ))}</TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function C3PeriodDetail() {
  const { period } = useParams<{ period: string }>();
  return <PortalModulePlaceholder title={`C3 Period ${period}`} description="Line items for this submission period." internalSource="cn_c3_reported + cn_payment" />;
}

function Contributions() {
  const { data, isLoading } = useEmployerContributions();
  if (isLoading) return <Skeleton className="h-48 w-full" />;
  const rows = data?.contributions ?? [];
  return (
    <Card>
      <CardHeader><CardTitle>Contribution History</CardTitle><CardDescription>Payments posted against your account (cn_payment).</CardDescription></CardHeader>
      <CardContent>
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">No contribution payments on record.</p> : (
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Amount</TableHead><TableHead>Receipt</TableHead></TableRow></TableHeader>
            <TableBody>{rows.slice(0,50).map((r: any, i: number) => (
              <TableRow key={i}><TableCell>{r.payment_date}</TableCell><TableCell>{r.amount}</TableCell><TableCell className="font-mono">{r.receipt_no ?? '—'}</TableCell></TableRow>
            ))}</TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function Payments() {
  const { data, isLoading } = useEmployerPayments();
  if (isLoading) return <Skeleton className="h-48 w-full" />;
  const rows = data?.payments ?? [];
  return (
    <Card>
      <CardHeader><CardTitle>Payment Receipts</CardTitle><CardDescription>Receipts issued for your contributions (cn_receipt).</CardDescription></CardHeader>
      <CardContent>
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">No receipts on record.</p> : (
          <Table>
            <TableHeader><TableRow><TableHead>Receipt #</TableHead><TableHead>Date</TableHead><TableHead>Amount</TableHead></TableRow></TableHeader>
            <TableBody>{rows.slice(0,50).map((r: any, i: number) => (
              <TableRow key={i}><TableCell className="font-mono">{r.receipt_no}</TableCell><TableCell>{r.receipt_date}</TableCell><TableCell>{r.amount}</TableCell></TableRow>
            ))}</TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function Balances() {
  const { data, isLoading } = useEmployerBalances();
  if (isLoading) return <Skeleton className="h-32 w-full" />;
  const rows = data?.balances ?? [];
  return (
    <Card>
      <CardHeader><CardTitle>Outstanding Balances</CardTitle><CardDescription>Arrears (cn_arrears).</CardDescription></CardHeader>
      <CardContent>
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">No outstanding balances.</p> : (
          <Table>
            <TableHeader><TableRow><TableHead>Period</TableHead><TableHead>Amount Due</TableHead></TableRow></TableHeader>
            <TableBody>{rows.map((r: any, i: number) => (
              <TableRow key={i}><TableCell>{r.period_year}-{r.period_month ?? ''}</TableCell><TableCell>{r.amount_due ?? r.amount}</TableCell></TableRow>
            ))}</TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function Compliance() {
  const { data, isLoading } = useEmployerNotices();
  if (isLoading) return <Skeleton className="h-48 w-full" />;
  const rows = data?.notices ?? [];
  return (
    <Card>
      <CardHeader><CardTitle>Compliance Notices</CardTitle><CardDescription>Official compliance notices (ce_notices).</CardDescription></CardHeader>
      <CardContent>
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">No compliance notices.</p> : (
          <Table>
            <TableHeader><TableRow><TableHead>Issued</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>{rows.slice(0,50).map((r: any) => (
              <TableRow key={r.id}><TableCell>{r.issued_at?.slice(0,10) ?? '—'}</TableCell><TableCell>{r.notice_type ?? '—'}</TableCell><TableCell><Badge>{r.status ?? 'OPEN'}</Badge></TableCell></TableRow>
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
