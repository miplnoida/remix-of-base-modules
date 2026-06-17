import React, { useEffect, useState } from 'react';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { PageShell } from '@/components/common/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const fmtMin = (m: number) => {
  if (!isFinite(m) || m < 0) return '—';
  if (m < 1) return `${Math.round(m * 60)}s`;
  if (m < 60) return `${m.toFixed(1)} min`;
  return `${(m / 60).toFixed(2)} h`;
};

const fmtTs = (t: number | null) =>
  t ? new Date(t).toLocaleString() : '—';

export const SessionHealth: React.FC = () => {
  const { user, profile, roles, isAdmin, session, getSessionDiagnostics } = useSupabaseAuth();
  const [tick, setTick] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  if (!isAdmin) {
    return (
      <PageShell
        title="Session Health"
        noPermission
        noPermissionMessage="Administrator role is required to view session diagnostics."
      >
        <div />
      </PageShell>
    );
  }

  const d = getSessionDiagnostics();
  const idleStatus =
    d.idleRemainingMinutes < 2 ? 'destructive'
      : d.idleRemainingMinutes < 10 ? 'secondary'
        : 'default';

  const handleRefreshNow = async () => {
    setRefreshing(true);
    try {
      const { error } = await supabase.auth.refreshSession();
      if (error) toast.error(`Refresh failed: ${error.message}`);
      else toast.success('Session token refreshed.');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <PageShell
      title="Session Health"
      subtitle="Live diagnostics for the current user session — idle window, token refresh schedule, and absolute session ceiling."
      breadcrumbs={[
        { label: 'System Administration', href: '/system-admin' },
        { label: 'Session Health' },
      ]}
      actions={
        <Button onClick={handleRefreshNow} disabled={refreshing}>
          {refreshing ? 'Refreshing…' : 'Refresh Token Now'}
        </Button>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>User</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div><span className="text-muted-foreground">Name:</span> {profile?.full_name || '—'}</div>
            <div><span className="text-muted-foreground">Email:</span> {user?.email || '—'}</div>
            <div><span className="text-muted-foreground">User Code:</span> {profile?.user_code || '—'}</div>
            <div><span className="text-muted-foreground">Roles:</span> {roles.join(', ') || '—'}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Idle Window</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Last activity</span><span>{fmtTs(d.lastActivityAt)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Idle for</span><span>{fmtMin(d.idleMinutes)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Idle limit</span><span>{fmtMin(d.idleLimitMinutes)}</span></div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Countdown</span>
              <Badge variant={idleStatus as any}>{fmtMin(d.idleRemainingMinutes)} remaining</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Session Ceiling</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Session age</span><span>{fmtMin(d.sessionAgeMinutes)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Absolute limit</span><span>{fmtMin(d.sessionLimitMinutes)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Remaining</span>
              <span>{fmtMin(Math.max(0, d.sessionLimitMinutes - d.sessionAgeMinutes))}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Access Token</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Expires at</span><span>{fmtTs(d.sessionExpiresAt)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Auto-refresh</span>
              <Badge variant={d.autoRefreshEnabled ? 'default' : 'secondary'}>
                {d.autoRefreshEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            <div className="flex justify-between"><span className="text-muted-foreground">Refresh scheduled</span>
              <Badge variant={d.nextRefreshScheduled ? 'default' : 'secondary'}>
                {d.nextRefreshScheduled ? 'Yes' : 'No'}
              </Badge>
            </div>
            <div className="flex justify-between"><span className="text-muted-foreground">Provider token</span>
              <span>{session?.access_token ? 'present' : 'missing'}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 xl:col-span-3">
          <CardHeader><CardTitle>About these timeouts</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              The idle window resets on click, keyboard input, focus, scroll, touch, pointer, and after every successful API call.
              Activity is broadcast across tabs via <code>BroadcastChannel</code> and <code>localStorage</code> so working in any tab keeps every tab alive.
            </p>
            <p>
              The access token is proactively refreshed ~2 minutes before expiry. The absolute session ceiling is enforced even across token refreshes.
              Default idle is <strong>120 minutes</strong>; the value above is whatever the active <code>password_policies</code> row provides.
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="hidden">{tick}</div>
    </PageShell>
  );
};

export default SessionHealth;
