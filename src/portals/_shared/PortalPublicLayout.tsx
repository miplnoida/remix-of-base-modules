import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { useEnterpriseContext } from '@/hooks/enterprise/useEnterpriseContext';

interface Props {
  brand: string;
  role?: string;
  signInTo?: string;
  children: ReactNode;
}

/**
 * PortalPublicLayout — header + footer chrome shared by all public-facing
 * portal landing pages. Matches Internal LAN brand: SSB logo on national
 * green gradient. No sidebar; landings are marketing/entry pages.
 */
export function PortalPublicLayout({ brand, role, signInTo, children }: Props) {
  const { data: ctx } = useEnterpriseContext({ moduleCode: 'PORTAL' });
  const orgName = ctx?.organization?.name ?? 'Social Security Board';
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="border-b border-border bg-gradient-to-r from-[hsl(var(--ssb-green-primary))] to-[hsl(var(--primary))] text-primary-foreground shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link to="/portal" className="flex items-center gap-3">
            <img
              src="/images/ssb-logo.png"
              alt={orgName}
              className="h-10 w-10 rounded-full bg-white/95 p-1 shadow ring-1 ring-white/40"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <div className="flex flex-col leading-tight">
              <span className="text-xs font-semibold tracking-wide opacity-90">{orgName}</span>
              <span className="text-base font-bold">{brand}</span>
            </div>
            {role && <Badge variant="outline" className="ml-2 border-white/40 bg-white/10 text-xs text-primary-foreground">{role}</Badge>}
          </Link>
          <nav className="flex items-center gap-2 text-sm">
            <Link to="/portal" className="px-3 py-1.5 rounded-md hover:bg-white/15 opacity-90">All Portals</Link>
            <Link to="/claimant" className="px-3 py-1.5 rounded-md hover:bg-white/15 opacity-90 hidden md:inline">Claimant</Link>
            <Link to="/employer" className="px-3 py-1.5 rounded-md hover:bg-white/15 opacity-90 hidden md:inline">Employer</Link>
            <Link to="/doctor" className="px-3 py-1.5 rounded-md hover:bg-white/15 opacity-90 hidden md:inline">Medical Provider</Link>
            {signInTo && (
              <Link to={signInTo} className="ml-2 inline-flex items-center rounded-md bg-white text-primary px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-white/90">Sign in</Link>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border bg-card text-muted-foreground">
        <div className="mx-auto max-w-7xl px-4 py-6 grid gap-4 md:grid-cols-3 text-xs">
          <div>
            <p className="font-semibold text-foreground mb-1">{orgName}</p>
            <p>Online Services Platform — Internal LAN is the system of record. External portals consume secure APIs only.</p>
          </div>
          <div>
            <p className="font-semibold text-foreground mb-1">Help & Support</p>
            <p>Email: help@ssb.gov</p>
            <p>Phone: +1 (869) 466-5535</p>
            <p>Office hours: Mon–Fri, 8:00–16:00</p>
          </div>
          <div>
            <p className="font-semibold text-foreground mb-1">Visit Us</p>
            <p>Bay Road, Basseterre, St. Kitts</p>
            <p>Charlestown, Nevis</p>
          </div>
        </div>
        <div className="border-t border-border py-3 text-center text-[11px]">© {new Date().getFullYear()} {orgName}. All rights reserved.</div>
      </footer>
    </div>
  );
}
