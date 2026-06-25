import { ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, FilePlus2, FolderKanban, Inbox, Settings, Scale } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/legal-advanced/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/legal-advanced/matters', label: 'Matters', icon: FolderKanban },
  { to: '/legal-advanced/intake', label: 'New Matter', icon: FilePlus2 },
  { to: '/legal-advanced/workbaskets', label: 'Workbaskets', icon: Inbox },
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
