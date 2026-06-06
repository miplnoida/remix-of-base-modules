import { Routes, Route, Navigate, useParams, Link } from 'react-router-dom';
import { ExternalPortalShell } from '@/portals/_shared/ExternalPortalShell';
import { ExternalTaskList } from '@/portals/_shared/ExternalTaskList';
import { ExternalTaskForm } from '@/portals/_shared/ExternalTaskForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const NAV = [
  { to: '/employer/dashboard', label: 'Dashboard' },
  { to: '/employer/tasks', label: 'Pending Requests' },
  { to: '/employer/employee-claims', label: 'Employee Claims' },
  { to: '/employer/accident-reports', label: 'Accident Reports' },
  { to: '/employer/confirmations', label: 'Submitted Responses' },
  { to: '/employer/messages', label: 'Messages' },
];

export default function EmployerPortal() {
  return (
    <ExternalPortalShell role="EMPLOYER" brand="Employer Portal" nav={NAV}>
      <Routes>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="tasks" element={<ExternalTaskList basePath="/employer/tasks" />} />
        <Route path="tasks/:taskId" element={<TaskDetail />} />
        <Route path="employee-claims" element={<Placeholder title="Employee Claim Requests" description="Sickness, maternity, employment-injury claims awaiting employer confirmation." />} />
        <Route path="accident-reports" element={<Placeholder title="Employment Injury Accident Reports" />} />
        <Route path="confirmations" element={<Placeholder title="Submitted Responses" />} />
        <Route path="messages" element={<Placeholder title="Messages" />} />
      </Routes>
    </ExternalPortalShell>
  );
}

function Dashboard() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Link to="tasks"><Card className="hover:shadow-md"><CardHeader><CardTitle>Pending Requests</CardTitle><CardDescription>Confirmations and reports awaiting your action.</CardDescription></CardHeader></Card></Link>
      <Link to="accident-reports"><Card className="hover:shadow-md"><CardHeader><CardTitle>Accident Reports</CardTitle><CardDescription>Submit and track injury reports.</CardDescription></CardHeader></Card></Link>
      <Link to="employee-claims"><Card className="hover:shadow-md"><CardHeader><CardTitle>Employee Claims</CardTitle></CardHeader></Card></Link>
      <Link to="messages"><Card className="hover:shadow-md"><CardHeader><CardTitle>Messages</CardTitle></CardHeader></Card></Link>
    </div>
  );
}
function TaskDetail() {
  const { taskId } = useParams<{ taskId: string }>();
  return <ExternalTaskForm taskId={taskId!} />;
}
function Placeholder({ title, description }: { title: string; description?: string }) {
  return <Card><CardHeader><CardTitle>{title}</CardTitle>{description && <CardDescription>{description}</CardDescription>}</CardHeader><CardContent className="text-sm text-muted-foreground">All actions are scoped to your employer and audited inside Internal BN.</CardContent></Card>;
}
