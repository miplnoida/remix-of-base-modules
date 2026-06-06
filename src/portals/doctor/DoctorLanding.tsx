import { PortalLandingTemplate } from '@/portals/_shared/PortalLandingTemplate';
import { ClipboardList, FileText, Stethoscope, Activity, HeartPulse, FileCheck, FolderArchive, MessageSquare } from 'lucide-react';

export default function DoctorLanding() {
  return (
    <PortalLandingTemplate
      brand="Medical Provider Portal"
      role="DOCTOR"
      hero={{
        title: 'Submit medical certificates and reports securely for Social Security claims.',
        subtitle: 'Approved medical providers can complete assigned tasks for sickness, maternity, employment-injury, invalidity and disablement.',
      }}
      ctas={[
        { label: 'Sign in as Medical Provider', to: '/doctor/dashboard' },
        { label: 'Complete Assigned Medical Task', to: '/doctor/medical-tasks', variant: 'outline' },
      ]}
      cards={[
        { title: 'Pending Medical Requests', desc: 'Tasks assigned to you, sorted by due date.', icon: ClipboardList, to: '/doctor/medical-tasks' },
        { title: 'Sickness Certificates', desc: 'Issue and review sickness certificates.', icon: FileText, to: '/doctor/sickness-certificates' },
        { title: 'Maternity Certificates', desc: 'Issue maternity / confinement certificates.', icon: HeartPulse, to: '/doctor/maternity-certificates' },
        { title: 'Employment Injury Reports', desc: 'Initial and progress medical reports.', icon: Activity, to: '/doctor/ei-reports' },
        { title: 'Invalidity Reports', desc: 'Submit invalidity medical assessments.', icon: Stethoscope, to: '/doctor/invalidity-reports' },
        { title: 'Disablement Assessments', desc: 'Permanent disablement evaluations.', icon: Stethoscope, to: '/doctor/disablement' },
        { title: 'Submitted Reports', desc: 'Browse and reprint past submissions.', icon: FileCheck, to: '/doctor/submitted' },
        { title: 'Documents & Messages', desc: 'Files and communications from SSB.', icon: FolderArchive, to: '/doctor/messages' },
      ]}
      dashboardPath="/doctor/dashboard"
      footer={
        <section className="mx-auto max-w-7xl px-4 pb-6">
          <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground flex items-start gap-3">
            <MessageSquare className="h-4 w-4 mt-0.5 text-primary" />
            <p>Access is restricted to verified medical providers. If you have not been approved, please contact the Social Security Board Benefits Section.</p>
          </div>
        </section>
      }
    />
  );
}
