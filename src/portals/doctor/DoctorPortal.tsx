import { Routes, Route, Navigate, useParams, Link } from 'react-router-dom';
import { ExternalPortalShell } from '@/portals/_shared/ExternalPortalShell';
import { ExternalTaskList } from '@/portals/_shared/ExternalTaskList';
import { ExternalTaskForm } from '@/portals/_shared/ExternalTaskForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const NAV = [
  { to: '/doctor/dashboard', label: 'Dashboard' },
  { to: '/doctor/tasks', label: 'Medical Certificate Requests' },
  { to: '/doctor/certificates', label: 'Certificates' },
  { to: '/doctor/medical-reports', label: 'Medical Reports' },
  { to: '/doctor/disablement-assessments', label: 'Disablement Assessments' },
  { to: '/doctor/messages', label: 'Messages' },
];

export default function DoctorPortal() {
  return (
    <ExternalPortalShell role="DOCTOR" brand="Medical Provider Portal" nav={NAV}>
      <Routes>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="tasks" element={<ExternalTaskList basePath="/doctor/tasks" />} />
        <Route path="tasks/:taskId" element={<TaskDetail />} />
        <Route path="certificates" element={<Placeholder title="Sickness &amp; Maternity Certificates" />} />
        <Route path="medical-reports" element={<Placeholder title="Employment Injury Medical Reports" />} />
        <Route path="disablement-assessments" element={<Placeholder title="Disablement Assessments" />} />
        <Route path="messages" element={<Placeholder title="Messages" />} />
      </Routes>
    </ExternalPortalShell>
  );
}

function Dashboard() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Link to="tasks"><Card className="hover:shadow-md"><CardHeader><CardTitle>Medical Certificate Requests</CardTitle><CardDescription>Certificates and reports requested by Internal BN.</CardDescription></CardHeader></Card></Link>
      <Link to="medical-reports"><Card className="hover:shadow-md"><CardHeader><CardTitle>Medical Reports</CardTitle></CardHeader></Card></Link>
      <Link to="disablement-assessments"><Card className="hover:shadow-md"><CardHeader><CardTitle>Disablement Assessments</CardTitle></CardHeader></Card></Link>
      <Link to="messages"><Card className="hover:shadow-md"><CardHeader><CardTitle>Messages</CardTitle></CardHeader></Card></Link>
    </div>
  );
}
function TaskDetail() {
  const { taskId } = useParams<{ taskId: string }>();
  return <ExternalTaskForm taskId={taskId!} />;
}
function Placeholder({ title, description }: { title: string; description?: string }) {
  return <Card><CardHeader><CardTitle>{title}</CardTitle>{description && <CardDescription>{description}</CardDescription>}</CardHeader><CardContent className="text-sm text-muted-foreground">All clinical decisions and certificates flow back to Internal BN for review and audit.</CardContent></Card>;
}
