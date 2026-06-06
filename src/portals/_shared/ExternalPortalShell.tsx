import { ReactNode, useEffect, useState, useMemo } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LogOut, Home, ChevronRight } from 'lucide-react';
import { externalAuthService, type PortalSession } from './externalAuthService';
import type { PortalRole } from './publicBenefitApiClient';
import { cn } from '@/lib/utils';

export interface NavItem { to: string; label: string }
export interface NavGroup { label: string; items: NavItem[] }
type NavInput = NavItem[] | NavGroup[];

interface Props {
  role: PortalRole;
  brand: string;
  nav: NavInput;
  subHeader?: ReactNode;
  /** Route (relative to portal root) considered the "home" / dashboard. */
  homeHref?: string;
  children: ReactNode;
}

function isGrouped(n: NavInput): n is NavGroup[] {
  return Array.isArray(n) && n.length > 0 && (n[0] as any).items !== undefined;
}
function firstHref(n: NavInput): string {
  if (isGrouped(n)) return n[0]?.items?.[0]?.to ?? '/';
  return n[0]?.to ?? '/';
}

/* Build breadcrumb trail from nav groups + current path */
function useBreadcrumbs(nav: NavInput, homeHref: string) {
  const { pathname } = useLocation();
  return useMemo(() => {
    const flat: { to: string; label: string; group?: string }[] = [];
    if (isGrouped(nav)) {
      nav.forEach(g => g.items.forEach(i => flat.push({ ...i, group: g.label })));
    } else {
      nav.forEach(i => flat.push({ ...i }));
    }
    // Find best match: longest prefix match against current pathname
    const matches = flat.filter(i => pathname === i.to || pathname.startsWith(i.to + '/'));
    matches.sort((a, b) => b.to.length - a.to.length);
    const current = matches[0];
    const crumbs: { to?: string; label: string }[] = [{ to: homeHref, label: 'Dashboard' }];
    if (current) {
      if (current.group && current.to !== homeHref) crumbs.push({ label: current.group });
      if (current.to !== homeHref) crumbs.push({ label: current.label });
    } else if (pathname !== homeHref) {
      // Derive a fallback label from the last path segment
      const seg = pathname.split('/').filter(Boolean).pop() ?? '';
      crumbs.push({ label: seg.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Page' });
    }
    return { crumbs, isHome: pathname === homeHref };
  }, [nav, pathname, homeHref]);
}

/**
 * ExternalPortalShell — top bar + side nav for Claimant / Employer / Doctor
 * portals. Pure presentation; never embeds Internal BN UI.
 */
export function ExternalPortalShell({ role, brand, nav, subHeader, homeHref, children }: Props) {
  const [session, setSession] = useState<PortalSession | null>(null);
  const navigate = useNavigate();
  const resolvedHome = homeHref ?? firstHref(nav);
  const { crumbs, isHome } = useBreadcrumbs(nav, resolvedHome);

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
      <header className="border-b border-border bg-gradient-to-r from-[hsl(var(--ssb-green-primary))] to-[hsl(var(--primary))] text-primary-foreground shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link to={resolvedHome} className="flex items-center gap-3">
            <img
              src="/images/ssb-logo.png"
              alt="Social Security Board"
              className="h-10 w-10 rounded-full bg-white/95 p-1 shadow ring-1 ring-white/40"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-wide opacity-90">Social Security Board</span>
              <span className="text-base font-bold">{brand}</span>
            </div>
            <Badge variant="outline" className="ml-2 border-white/40 bg-white/10 text-xs text-primary-foreground">{role}</Badge>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="opacity-90">{session?.displayName ?? 'Guest'}</span>
            {session ? (
              <Button variant="ghost" size="sm" onClick={signOut} className="gap-1.5 text-primary-foreground hover:bg-white/15 hover:text-primary-foreground"><LogOut className="h-4 w-4" /> Sign out</Button>
            ) : null}
          </div>
        </div>
        {subHeader ? (
          <div className="mx-auto max-w-7xl px-4 pb-3">{subHeader}</div>
        ) : null}
      </header>

      {/* Breadcrumb bar — always show, gives "you are here" + back-to-dashboard */}
      <div className="border-b bg-muted/40">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2">
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-sm">
            <Link
              to={resolvedHome}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-muted-foreground hover:bg-background hover:text-foreground"
            >
              <Home className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
            {crumbs.slice(1).map((c, i, arr) => (
              <span key={i} className="flex items-center gap-1 min-w-0">
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                {c.to && i < arr.length - 1 ? (
                  <Link to={c.to} className="truncate text-muted-foreground hover:text-foreground">{c.label}</Link>
                ) : (
                  <span className="truncate font-medium text-foreground">{c.label}</span>
                )}
              </span>
            ))}
          </nav>
          {!isHome && (
            <Button asChild size="sm" variant="ghost" className="h-7 gap-1 text-xs">
              <Link to={resolvedHome}><Home className="h-3.5 w-3.5" /> Back to Dashboard</Link>
            </Button>
          )}
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
        {/* Sidebar hidden on the dashboard itself (tiles are the primary nav there)
            and on mobile (bottom nav handles it). Shown on inner pages as secondary nav. */}
        {!isHome && (
          <aside className="hidden md:block w-60 shrink-0">
            <nav className="sticky top-4 space-y-4">
              {isGrouped(nav) ? (
                nav.map(group => (
                  <div key={group.label}>
                    <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                      {group.label}
                    </div>
                    <div className="space-y-1">
                      {group.items.map(item => <SideLink key={item.to} item={item} />)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="space-y-1">
                  {nav.map(item => <SideLink key={item.to} item={item} />)}
                </div>
              )}
            </nav>
          </aside>
        )}
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

function SideLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      end
      className={({ isActive }) => cn(
        'block rounded-md px-3 py-2 text-sm transition-colors',
        isActive ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      {item.label}
    </NavLink>
  );
}
