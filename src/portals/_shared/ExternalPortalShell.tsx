import { ReactNode, useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LogOut, Shield } from 'lucide-react';
import { externalAuthService, type PortalSession } from './externalAuthService';
import type { PortalRole } from './publicBenefitApiClient';
import { cn } from '@/lib/utils';

interface NavItem { to: string; label: string }
interface Props {
  role: PortalRole;
  brand: string;
  nav: NavItem[];
  children: ReactNode;
}

/**
 * ExternalPortalShell — top bar + side nav for Claimant / Employer / Doctor
 * portals. Pure presentation; never embeds Internal BN UI.
 */
export function ExternalPortalShell({ role, brand, nav, children }: Props) {
  const [session, setSession] = useState<PortalSession | null>(null);
  const navigate = useNavigate();
  useEffect(() => {
    externalAuthService.getSession().then(setSession);
    const sub = externalAuthService.onAuthStateChange(setSession);
    return () => sub.data?.subscription?.unsubscribe?.();
  }, []);

  const signOut = async () => {
    await externalAuthService.signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link to={nav[0]?.to ?? '/'} className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-semibold">{brand}</span>
            <Badge variant="outline" className="ml-2 text-xs">{role}</Badge>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">{session?.displayName ?? 'Guest'}</span>
            {session ? (
              <Button variant="ghost" size="sm" onClick={signOut} className="gap-1.5"><LogOut className="h-4 w-4" /> Sign out</Button>
            ) : null}
          </div>
        </div>
      </header>
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
        <aside className="w-56 shrink-0">
          <nav className="space-y-1">
            {nav.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end
                className={({ isActive }) => cn(
                  'block rounded-md px-3 py-2 text-sm transition-colors',
                  isActive ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
