import { ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, FilePlus2, FolderKanban, Inbox, Settings, Scale, Users, MessageSquare, FileCheck, Building2, UserCheck, Files, ListChecks, BarChart3, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/legal-advanced/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/legal-advanced/intake', label: 'New Matter', icon: FilePlus2 },
  { to: '/legal-advanced/matters', label: 'Matters', icon: FolderKanban },
  { to: '/legal-advanced/my-workbasket', label: 'My Workbasket', icon: Inbox },
  { to: '/legal-advanced/team-workbasket', label: 'Team Workbasket', icon: Users },
  { to: '/legal-advanced/advice', label: 'Advice Requests', icon: MessageSquare },
  { to: '/legal-advanced/contracts', label: 'Contract Reviews', icon: FileCheck },
  { to: '/legal-advanced/employer-recovery', label: 'Employer Recovery', icon: Building2 },
  { to: '/legal-advanced/ip-matters', label: 'IP / Benefit Matters', icon: UserCheck },
  { to: '/legal-advanced/documents', label: 'Documents', icon: Files },
  { to: '/legal-advanced/activities', label: 'Activities & Tasks', icon: ListChecks },
  { to: '/legal-advanced/reports', label: 'Reports', icon: BarChart3 },
  { to: '/legal-advanced/admin', label: 'Admin', icon: Shield },
  { to: '/legal-advanced/settings', label: 'Settings', icon: Settings },
];

export function LegalAdvancedLayout({ children }: { children?: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="w-60 border-r bg-card">
        <div className="px-4 py-4 border-b flex items-center gap-2">
          <Scale className="h-5 w-5 text-primary" />
          <div>
            <div className="text-sm font-semibold">Legal Advanced</div>
            <div className="text-[11px] text-muted-foreground">Matter Framework</div>
          </div>
        </div>
        <nav className="p-2 space-y-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 min-w-0">
        <div className="px-6 py-6 max-w-screen-2xl mx-auto">{children ?? <Outlet />}</div>
      </main>
    </div>
  );
}
