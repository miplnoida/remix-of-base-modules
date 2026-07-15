/**
 * BN-AWARD360-ADMIN-1 — Admin-only diagnostics panel.
 *
 * Rendered only when the current user is Admin and the `?diag=1` query param
 * is present on /bn/awards/:id. Ordinary users never see this content.
 */
import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Award360Permissions } from '../useAwardPermissions';
import type { Award360TabAccess } from '../useAward360TabAccess';
import type { Award360TabKey } from '../viewModels';

interface Props {
  perms: Award360Permissions;
  tabAccess: Record<Award360TabKey, Award360TabAccess>;
}

export const Award360AdminDiagnostics: React.FC<Props> = ({ perms, tabAccess }) => {
  const { user } = useSupabaseAuth();
  const qc = useQueryClient();
  const [roles, setRoles] = React.useState<string[] | null>(null);
  const [email, setEmail] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const { data: rs } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
      const { data: p } = await supabase.from('profiles').select('email').eq('id', user.id).maybeSingle();
      if (cancelled) return;
      setRoles((rs ?? []).map((r) => r.role as string));
      setEmail((p as any)?.email ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const refreshAll = () => {
    if (!user?.id) return;
    qc.invalidateQueries({ queryKey: ['is-admin', user.id] });
    qc.invalidateQueries({ queryKey: ['award360-registry-snapshot'] });
    qc.invalidateQueries({ queryKey: ['award360-user-permissions', user.id] });
    qc.invalidateQueries({ queryKey: ['award360-rollout-snapshot', 'v2'] });
    qc.invalidateQueries({ queryKey: ['navigation-modules'] });
    qc.invalidateQueries({ queryKey: ['user-navigation-permissions', user.id] });
  };

  if (!perms.admin.isAdmin) return null;

  return (
    <Card className="mt-4 border-blue-500/50">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm">Award 360 · Admin diagnostics</CardTitle>
        <Button size="sm" variant="outline" onClick={refreshAll}>Refresh caches</Button>
      </CardHeader>
      <CardContent className="text-xs space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div><b>User UUID:</b> {user?.id ?? '—'}</div>
          <div><b>Email:</b> {email ?? '—'}</div>
          <div className="col-span-2">
            <b>Roles:</b>{' '}
            {(roles ?? []).map((r) => (
              <Badge key={r} variant="secondary" className="mr-1">{r}</Badge>
            ))}
          </div>
          <div>
            <b>is_admin:</b>{' '}
            <Badge variant={perms.admin.isAdmin ? 'default' : 'destructive'}>
              {String(perms.admin.isAdmin)}
            </Badge>
          </div>
          <div>
            <b>Admin status:</b>{' '}
            {perms.admin.isLoading ? 'loading' : perms.admin.isError ? `error: ${perms.admin.error?.message}` : 'ready'}
          </div>
        </div>

        <div>
          <div className="font-medium mb-1">Tab access matrix</div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-left">
                  <th className="border p-1">Tab</th>
                  <th className="border p-1">Capability</th>
                  <th className="border p-1">Module</th>
                  <th className="border p-1">Action</th>
                  <th className="border p-1">Mod exists</th>
                  <th className="border p-1">Action exists</th>
                  <th className="border p-1">Granted</th>
                  <th className="border p-1">Visible</th>
                  <th className="border p-1">Query</th>
                  <th className="border p-1">Reason</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(tabAccess).map((a) => {
                  const capResult =
                    a.capability !== 'ALWAYS_VISIBLE' ? perms.capabilities[a.capability] : null;
                  return (
                    <tr key={a.tab}>
                      <td className="border p-1">{a.tab}</td>
                      <td className="border p-1">{a.capability}</td>
                      <td className="border p-1">{capResult?.moduleName ?? '—'}</td>
                      <td className="border p-1">{capResult?.action ?? '—'}</td>
                      <td className="border p-1">{capResult ? String(capResult.moduleExists) : '—'}</td>
                      <td className="border p-1">{capResult ? String(capResult.actionExists) : '—'}</td>
                      <td className="border p-1">
                        {capResult ? String(capResult.permissionGranted) : 'n/a'}
                      </td>
                      <td className="border p-1">{String(a.visible)}</td>
                      <td className="border p-1">{String(a.queryEnabled)}</td>
                      <td className="border p-1">{a.reason}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="text-muted-foreground">
          Communication rendered content is intentionally hidden until a dedicated
          view-content action is registered.
        </div>
      </CardContent>
    </Card>
  );
};
