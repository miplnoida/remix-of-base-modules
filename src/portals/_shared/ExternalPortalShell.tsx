import { ReactNode, useEffect, useState, useMemo } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  LogOut, Home, ChevronRight, PanelLeftClose, PanelLeftOpen, Circle,
  UserCircle2,
} from 'lucide-react';
import { externalAuthService, type PortalSession } from './externalAuthService';
import type { PortalRole } from './publicBenefitApiClient';
import { HeaderErrorBoundary } from './HeaderErrorBoundary';
import { cn } from '@/lib/utils';
import { useEnterpriseContext } from '@/hooks/enterprise/useEnterpriseContext';

export interface NavItem {
  to: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}
export interface NavGroup {
  label: string;
  items: NavItem[];
  icon?: React.ComponentType<{ className?: string }>;
}
type NavInput = NavItem[] | NavGroup[];

interface Props {
  role: PortalRole;
  brand: string;
  nav: NavInput;
  subHeader?: ReactNode;
  homeHref?: string;
  /** Items shown inside the top-right user dropdown (profile, security, etc.). */
  userMenuItems?: NavItem[];
  /** Extra content rendered at the top of the user dropdown (status badges, etc.). */
  userMenuHeader?: ReactNode;
  /** Items shown in the mobile bottom navigation bar. */
  mobileNavItems?: NavItem[];
  /** Optional notification bell rendered to the left of the avatar. */
  notificationBell?: ReactNode;
  /** Optional help button rendered to the left of the avatar. */
  helpButton?: ReactNode;
  children: ReactNode;
}

function isGrouped(n: NavInput): n is NavGroup[] {
  return Array.isArray(n) && n.length > 0 && (n[0] as any).items !== undefined;
}
function firstHref(n: NavInput): string {
  if (isGrouped(n)) return n[0]?.items?.[0]?.to ?? '/';
  return n[0]?.to ?? '/';
}

function useBreadcrumbs(nav: NavInput, homeHref: string) {
  const { pathname } = useLocation();
  return useMemo(() => {
    const flat: { to: string; label: string; group?: string }[] = [];
    if (isGrouped(nav)) {
      nav.forEach(g => g.items.forEach(i => flat.push({ to: i.to, label: i.label, group: g.label })));
    } else {
      nav.forEach(i => flat.push({ to: i.to, label: i.label }));
    }
    const matches = flat.filter(i => pathname === i.to || pathname.startsWith(i.to + '/'));
    matches.sort((a, b) => b.to.length - a.to.length);
    const current = matches[0];
    const crumbs: { to?: string; label: string }[] = [{ to: homeHref, label: 'Dashboard' }];
    if (current) {
      if (current.group && current.to !== homeHref) crumbs.push({ label: current.group });
      if (current.to !== homeHref) crumbs.push({ label: current.label });
    } else if (pathname !== homeHref) {
      const seg = pathname.split('/').filter(Boolean).pop() ?? '';
      crumbs.push({ label: seg.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Page' });
    }
    return { crumbs, isHome: pathname === homeHref };
  }, [nav, pathname, homeHref]);
}

const SIDEBAR_STATE_KEY = 'lov.portalSidebar.collapsed';

export function ExternalPortalShell({
  role, brand, nav, subHeader, homeHref,
  userMenuItems, userMenuHeader, mobileNavItems,
  notificationBell, helpButton, children,
}: Props) {
  const [session, setSession] = useState<PortalSession | null>(null);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(SIDEBAR_STATE_KEY) === '1';
  });
  const navigate = useNavigate();
  const resolvedHome = homeHref ?? firstHref(nav);
  const { crumbs, isHome } = useBreadcrumbs(nav, resolvedHome);
  const { data: enterpriseCtx } = useEnterpriseContext({ moduleCode: 'PORTAL' });
  const orgName = enterpriseCtx?.organization?.name ?? 'Social Security Board';

  useEffect(() => {
    let mounted = true;
    externalAuthService.getSession()
      .then(s => { if (mounted) setSession(s); })
      .catch(err => {
        if (import.meta.env.DEV) console.error('[shell] getSession failed', err);
        if (mounted) setSession(null);
      });
    const sub = externalAuthService.onAuthStateChange(s => {
      if (import.meta.env.DEV) console.debug('[shell] session changed', s);
      setSession(s);
    });
    return () => { mounted = false; sub.data?.subscription?.unsubscribe?.(); };
  }, []);

  useEffect(() => {
    try { window.localStorage.setItem(SIDEBAR_STATE_KEY, collapsed ? '1' : '0'); } catch {}
  }, [collapsed]);

  const signOut = async () => {
    await externalAuthService.signOut();
    navigate('/');
  };

  // Fallback display values so the avatar dropdown always renders, even while
  // the session is still loading or if the lookup fails. Menu *contents* vary,
  // but the control itself is always present for authenticated users.
  const displayName = session?.displayName ?? 'Account';
  const email = session?.email ?? '';
  const initials = (session?.displayName ?? session?.email ?? 'A')
    .split(/[\s@.]+/).filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase()).join('') || 'A';

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-gradient-to-r from-[hsl(var(--ssb-green-primary))] to-[hsl(var(--primary))] text-primary-foreground shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link to={resolvedHome} className="flex items-center gap-3">
            <img
              src="/images/ssb-logo.png"
              alt={orgName}
              className="h-10 w-10 rounded-full bg-white/95 p-1 shadow ring-1 ring-white/40"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-wide opacity-90">{orgName}</span>
              <span className="text-base font-bold">{brand}</span>
            </div>
            <Badge variant="outline" className="ml-2 border-white/40 bg-white/10 text-xs text-primary-foreground">{role}</Badge>
          </Link>
          <div className="flex items-center gap-2 text-sm">
            <HeaderErrorBoundary>{helpButton}</HeaderErrorBoundary>
            <HeaderErrorBoundary>{notificationBell}</HeaderErrorBoundary>
            <HeaderErrorBoundary>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="Account menu"
                    className="flex items-center gap-2 rounded-full bg-white/10 px-2 py-1 pr-3 hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-primary text-xs font-bold">
                      {initials || <UserCircle2 className="h-4 w-4" />}
                    </span>
                    <span className="hidden md:inline opacity-95 max-w-[180px] truncate">
                      {displayName}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72">
                  <DropdownMenuLabel className="flex flex-col gap-1">
                    <span className="text-sm font-semibold">{displayName}</span>
                    {email && <span className="text-xs font-normal text-muted-foreground truncate">{email}</span>}
                  </DropdownMenuLabel>
                  {userMenuHeader && (
                    <>
                      <DropdownMenuSeparator />
                      <div className="px-2 py-1.5">
                        <HeaderErrorBoundary>{userMenuHeader}</HeaderErrorBoundary>
                      </div>
                    </>
                  )}
                  {userMenuItems && userMenuItems.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      {userMenuItems.map(item => {
                        const Icon = item.icon ?? Circle;
                        return (
                          <DropdownMenuItem key={item.to} asChild>
                            <Link to={item.to} className="flex items-center gap-2">
                              <Icon className="h-4 w-4 text-muted-foreground" />
                              <span>{item.label}</span>
                            </Link>
                          </DropdownMenuItem>
                        );
                      })}
                    </>
                  )}
                  <DropdownMenuSeparator />
                  {session ? (
                    <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
                      <LogOut className="h-4 w-4 mr-2" /> Sign out
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem asChild>
                      <Link to="/" className="flex items-center gap-2">
                        <UserCircle2 className="h-4 w-4" /> Sign in
                      </Link>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </HeaderErrorBoundary>
          </div>
        </div>
        {subHeader ? (
          <div className="mx-auto max-w-7xl px-4 pb-3">
            <HeaderErrorBoundary>{subHeader}</HeaderErrorBoundary>
          </div>
        ) : null}
      </header>

      {/* Sticky breadcrumb bar */}
      <div className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2">
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-sm">
            <Link
              to={resolvedHome}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
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

      <div className={cn('mx-auto flex max-w-7xl gap-6 px-4 py-6', mobileNavItems && 'pb-24 md:pb-6')}>
        {!isHome && (
          <aside className={cn('hidden md:block shrink-0 transition-[width] duration-200', collapsed ? 'w-14' : 'w-60')}>
            <div className="sticky top-14 space-y-2">
              <div className="flex justify-end px-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => setCollapsed(c => !c)}
                        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                      >
                        {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="text-xs">
                      {collapsed ? 'Expand menu' : 'Collapse to icons'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <nav className="space-y-3">
                {isGrouped(nav) ? (
                  nav.map(group => (
                    <div key={group.label}>
                      {!collapsed && (
                        <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                          {group.label}
                        </div>
                      )}
                      {collapsed && <div className="mx-2 my-1 h-px bg-border" />}
                      <div className="space-y-0.5">
                        {group.items.map(item => <SideLink key={item.to} item={item} collapsed={collapsed} />)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="space-y-0.5">
                    {nav.map(item => <SideLink key={item.to} item={item} collapsed={collapsed} />)}
                  </div>
                )}
              </nav>
            </div>
          </aside>
        )}
        <main className="min-w-0 flex-1">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      {mobileNavItems && mobileNavItems.length > 0 && (
        <nav
          aria-label="Primary"
          className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden"
        >
          <ul
            className="mx-auto grid max-w-7xl"
            style={{ gridTemplateColumns: `repeat(${mobileNavItems.length}, minmax(0, 1fr))` }}
          >
            {mobileNavItems.map(item => {
              const Icon = item.icon ?? Circle;
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end
                    className={({ isActive }) => cn(
                      'flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium',
                      isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
}

function SideLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const Icon = item.icon ?? Circle;
  const inner = (
    <NavLink
      to={item.to}
      end
      className={({ isActive }) => cn(
        'flex items-center gap-2 rounded-md text-sm transition-colors',
        collapsed ? 'h-9 w-9 justify-center mx-auto' : 'px-3 py-2',
        isActive
          ? 'bg-primary/10 text-primary font-medium'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      <Icon className={cn('shrink-0', collapsed ? 'h-4 w-4' : 'h-4 w-4')} />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </NavLink>
  );
  if (!collapsed) return inner;
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>{inner}</TooltipTrigger>
        <TooltipContent side="right" className="text-xs">{item.label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
