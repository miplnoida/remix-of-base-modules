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
import { EXPECTED_AWARD360_PROJECT_REF, getSupabaseProjectRef, type Award360Permissions } from '../useAwardPermissions';
import type { Award360TabAccess } from '../useAward360TabAccess';
import type { Award360TabKey } from '../viewModels';
import { AWARD_ACTION_DEFINITIONS } from '@/services/bn/awards/awardActionCatalog';
import {
  AWARD360_CERTIFICATION_REGISTRY,
  AWARD360_CERTIFICATION_SUITE_IDS,
} from '@/services/bn/awards/award360CertificationRegistry';
import {
  AWARD360_LOADER_MANIFEST,
  AWARD360_MANIFEST_STATUS,
  AWARD360_MANIFEST_VERSION,
} from '@/services/bn/awards/award360LoaderManifest';
import { summariseAwardActionInventory } from '@/services/bn/awards/awardActionConsumerInventory';
import { AWARD_ACTION_GUARD_REASON_CODES } from '@/services/bn/awards/awardActionGuard';
import { AWARD_PILOT_ACTIONS } from '@/services/bn/awards/pilot/awardPilotHandlers';
import {
  PILOT_COVERAGE_SCENARIOS,
} from '@/services/bn/awards/pilot/awardPilotCoverageMatrix';
import { PILOT_UAT_CATALOG } from '@/services/bn/awards/pilot/awardPilotUATCatalog';
import { PILOT_RUNBOOKS } from '@/services/bn/awards/pilot/awardPilotRunbooks';
import { PILOT_COMPENSATION_REGISTRY } from '@/services/bn/awards/pilot/awardPilotCompensation';
import { AWARD_PILOT_DEPLOYMENT_SAFETY } from '@/services/bn/awards/pilot/awardPilotDeploymentSafety';

interface Props {
  perms: Award360Permissions;
  tabAccess: Record<Award360TabKey, Award360TabAccess>;
}

export const Award360AdminDiagnostics: React.FC<Props> = ({ perms, tabAccess }) => {
  const { user } = useSupabaseAuth();
  const qc = useQueryClient();
  const [roles, setRoles] = React.useState<string[] | null>(null);
  const [email, setEmail] = React.useState<string | null>(null);
  const [registrySnapshot, setRegistrySnapshot] = React.useState<{
    moduleId: string | null;
    actions: string[];
    viewFound: boolean;
    viewEnabled: boolean;
    fetchedAt: string | null;
    error: string | null;
  }>({ moduleId: null, actions: [], viewFound: false, viewEnabled: false, fetchedAt: null, error: null });

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

  // BN-AWARD360-B3-C2 — compact bn_awards_list registry probe.
  const loadRegistryProbe = React.useCallback(async () => {
    try {
      const { data: mod, error: modErr } = await supabase
        .from('app_modules')
        .select('id, name, is_enabled, routes_enabled', { count: 'exact' })
        .eq('name', 'bn_awards_list')
        .maybeSingle();
      if (modErr) throw modErr;
      if (!mod) {
        setRegistrySnapshot({ moduleId: null, actions: [], viewFound: false, viewEnabled: false, fetchedAt: new Date().toISOString(), error: 'Module bn_awards_list not found' });
        return;
      }
      const { data: acts, error: aErr } = await supabase
        .from('module_actions')
        .select('action_name, is_enabled')
        .eq('module_id', (mod as any).id);
      if (aErr) throw aErr;
      const { data: directView, error: directViewError } = await supabase
        .from('module_actions')
        .select('id, module_id, action_name, is_enabled', { count: 'exact' })
        .eq('module_id', (mod as any).id)
        .eq('action_name', 'view')
        .maybeSingle();
      if (directViewError) throw directViewError;
      setRegistrySnapshot({
        moduleId: (mod as any).id,
        actions: ((acts ?? []) as any[]).map((a) => `${a.action_name}${a.is_enabled === false ? ' (disabled)' : ''}`),
        viewFound: !!directView,
        viewEnabled: !!directView && (directView as any).is_enabled !== false,
        fetchedAt: new Date().toISOString(),
        error: null,
      });
    } catch (e: any) {
      setRegistrySnapshot({ moduleId: null, actions: [], viewFound: false, viewEnabled: false, fetchedAt: new Date().toISOString(), error: e?.message ?? String(e) });
    }
  }, []);

  React.useEffect(() => {
    void loadRegistryProbe();
  }, [loadRegistryProbe]);

  const projectRef = React.useMemo(() => getSupabaseProjectRef(), []);
  const awardViewCap = perms.capabilities?.AWARD_VIEW;
  const diagnostics = perms.registryDiagnostics;
  const browserHasView = registrySnapshot.viewFound;
  const projectMismatch = projectRef !== EXPECTED_AWARD360_PROJECT_REF;
  const directSnapshotMismatch = registrySnapshot.viewFound && diagnostics?.awardView.actionFound === false;

  const refreshAll = async () => {
    if (!user?.id) return;
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['is-admin', user.id] }),
      qc.invalidateQueries({ queryKey: ['award360-registry-snapshot'] }),
      qc.invalidateQueries({ queryKey: ['award360-user-permissions', user.id] }),
      qc.invalidateQueries({ queryKey: ['award360-rollout-snapshot', 'v2'] }),
      qc.invalidateQueries({ queryKey: ['navigation-modules'] }),
      qc.invalidateQueries({ queryKey: ['user-navigation-permissions', user.id] }),
    ]);
    await loadRegistryProbe();
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
                  <th className="border p-1">Mod enabled</th>
                  <th className="border p-1">Route enabled</th>
                  <th className="border p-1">Action exists</th>
                  <th className="border p-1">Action enabled</th>
                  <th className="border p-1">Granted</th>
                  <th className="border p-1">Effective</th>
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
                      <td className="border p-1">{capResult ? String(capResult.moduleEnabled) : '—'}</td>
                      <td className="border p-1">{capResult ? String(capResult.routeEnabled) : '—'}</td>
                      <td className="border p-1">{capResult ? String(capResult.actionExists) : '—'}</td>
                      <td className="border p-1">{capResult ? String(capResult.actionEnabled) : '—'}</td>
                      <td className="border p-1">{capResult ? String(capResult.permissionGranted) : 'n/a'}</td>
                      <td className="border p-1">{capResult ? String(capResult.effectiveAccess) : 'n/a'}</td>
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

        <div data-testid="award360-registry-diagnostic" className="rounded border border-blue-500/40 p-2">
          <div className="mb-1 flex items-center justify-between">
            <div className="font-medium">Registry probe · bn_awards_list</div>
            <Button size="sm" variant="ghost" onClick={() => void loadRegistryProbe()}>Re-probe</Button>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <div><b>Module name:</b> bn_awards_list</div>
            <div><b>Module ID:</b> <span data-testid="registry-module-id">{registrySnapshot.moduleId ?? '—'}</span></div>
            <div className="col-span-2">
              <b>Actions loaded for bn_awards_list:</b>{' '}
              <span data-testid="registry-actions">
                {registrySnapshot.actions.length ? registrySnapshot.actions.join(', ') : '—'}
              </span>
            </div>
            <div>
              <b>view found:</b>{' '}
              <Badge variant={browserHasView ? 'default' : 'destructive'} data-testid="registry-view-found">
                {String(browserHasView)}
              </Badge>
            </div>
            <div>
              <b>view enabled:</b>{' '}
              <Badge variant={registrySnapshot.viewEnabled ? 'default' : 'destructive'} data-testid="registry-view-enabled">
                {String(registrySnapshot.viewEnabled)}
              </Badge>
            </div>
            <div>
              <b>AWARD_VIEW.actionExists:</b>{' '}
              <Badge variant={awardViewCap?.actionExists ? 'default' : 'destructive'}>
                {awardViewCap ? String(awardViewCap.actionExists) : '—'}
              </Badge>
            </div>
            <div>
              <b>Granted:</b>{' '}
              <Badge variant={awardViewCap?.permissionGranted ? 'default' : 'destructive'}>
                {awardViewCap ? String(awardViewCap.permissionGranted) : '—'}
              </Badge>
            </div>
            <div>
              <b>Effective:</b>{' '}
              <Badge variant={awardViewCap?.effectiveAccess ? 'default' : 'destructive'}>
                {awardViewCap ? String(awardViewCap.effectiveAccess) : '—'}
              </Badge>
            </div>
            <div><b>User has permission:</b> {awardViewCap ? String(awardViewCap.permissionGranted) : '—'}</div>
            <div><b>Registry fetched:</b> <span data-testid="registry-fetched-at">{diagnostics?.fetchedAt ?? '—'}</span></div>
            <div>
              <b>Browser project ref:</b>{' '}
              <code data-testid="registry-project-ref">{projectRef ?? '—'}</code>
            </div>
            <div><b>Expected project ref:</b> <code>{EXPECTED_AWARD360_PROJECT_REF}</code></div>
            <div><b>Required modules:</b> {diagnostics?.requiredModuleCount ?? '—'}</div>
            <div><b>Returned modules:</b> {diagnostics?.returnedModuleCount ?? '—'}</div>
            <div><b>Returned actions:</b> {diagnostics?.returnedActionCount ?? '—'}</div>
            <div><b>Snapshot view found:</b> {diagnostics ? String(diagnostics.awardView.actionFound) : '—'}</div>
            {registrySnapshot.error && (
              <div className="col-span-2 rounded border border-red-500/50 bg-red-500/10 px-2 py-1 text-red-700 dark:text-red-300">
                Probe error: {registrySnapshot.error}
              </div>
            )}
            {diagnostics?.appearsTruncated && (
              <div role="alert" className="col-span-2 rounded border border-red-500/50 bg-red-500/10 px-2 py-1 text-red-700 dark:text-red-300">
                Registry response appears truncated ({diagnostics.returnedActionCount}/{diagnostics.reportedActionCount ?? '?'} actions); access remains fail-closed.
              </div>
            )}
            {projectMismatch && (
              <div role="alert" className="col-span-2 rounded border border-red-500/50 bg-red-500/10 px-2 py-1 text-red-700 dark:text-red-300">
                Browser project reference differs from the authorised project.
              </div>
            )}
            {directSnapshotMismatch && (
              <div role="alert" className="col-span-2 rounded border border-red-500/50 bg-red-500/10 px-2 py-1 text-red-700 dark:text-red-300">
                The direct browser query found bn_awards_list.view, but the Award 360 registry snapshot omitted it. The registry snapshot is incomplete.
              </div>
            )}
          </div>
          <div className="mt-1 text-[10px] text-muted-foreground">
            Browser environment identity only. Keys, access tokens, refresh tokens, and user JWTs are never displayed.
          </div>
        </div>

        <div data-testid="award360-d3-certification" className="rounded border border-blue-500/40 p-2">
          <div className="font-medium mb-1">Stage D3 · Certification & action-contract summary</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <div><b>Build ID:</b> <code>{(import.meta as any).env?.VITE_BUILD_ID ?? 'dev'}</code></div>
            <div><b>Certified loaders:</b> {Object.keys(AWARD360_CERTIFICATION_REGISTRY).length}</div>
            <div><b>Manifest loaders:</b> {AWARD360_LOADER_MANIFEST.length}</div>
            <div><b>Pending execution:</b> {AWARD360_LOADER_MANIFEST.filter((m) => m.pendingExecution).length}</div>
            <div className="col-span-2">
              <b>Suites:</b>{' '}
              {AWARD360_CERTIFICATION_SUITE_IDS.map((s) => (
                <Badge key={s} variant="secondary" className="mr-1">
                  {s} ({Object.values(AWARD360_CERTIFICATION_REGISTRY).filter((c) => c.suiteId === s).length})
                </Badge>
              ))}
            </div>
            <div><b>Actions defined:</b> {AWARD_ACTION_DEFINITIONS.length}</div>
            <div>
              <b>Navigation:</b> {AWARD_ACTION_DEFINITIONS.filter((d) => !d.isMutation).length}
              {' / '}<b>Mutations:</b> {AWARD_ACTION_DEFINITIONS.filter((d) => d.isMutation).length}
            </div>
            <div className="col-span-2 text-[10px] text-muted-foreground">
              Matrix drift is enforced at test-time by
              <code className="mx-1">actionContract.test.ts</code>
              and <code className="mx-1">award360RouteAndMatrixDrift.test.ts</code>.
              No PII, tokens, or secrets are rendered.
            </div>
          </div>
        </div>

        <div data-testid="award360-d5-certification" className="rounded border border-green-500/40 p-2">
          <div className="font-medium mb-1">Stage D5 · Pilot mutation certification</div>
          {(() => {
            const inv = summariseAwardActionInventory();
            const good =
              AWARD360_MANIFEST_STATUS === 'PILOT_MUTATION_CERTIFIED' ||
              AWARD360_MANIFEST_STATUS === 'RUNTIME_CERTIFIED';
            return (
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <div><b>Manifest status:</b>{' '}
                  <Badge variant={good ? 'default' : 'destructive'}>
                    {AWARD360_MANIFEST_STATUS}
                  </Badge>
                </div>
                <div><b>Manifest version:</b> <code>{AWARD360_MANIFEST_VERSION}</code></div>
                <div><b>Registered actions:</b> {inv.totalRegisteredActions}</div>
                <div><b>Actions with UI consumers:</b> {inv.actionsWithUiConsumers}</div>
                <div><b>Actions guarded:</b> {inv.actionsGuarded}</div>
                <div><b>Pilot mutation handlers:</b> {inv.actionsWithMutationHandlers}</div>
                <div><b>Navigation / Mutation:</b> {inv.navigationActions} / {inv.mutationActions}</div>
                <div><b>Dark-launched mutations:</b> {inv.darkLaunchedMutations.length}</div>
                <div><b>Orphaned registrations:</b> {inv.orphanedRegistrations.length}</div>
                <div><b>Unguarded mutations:</b> {inv.unguardedMutations.length}</div>
                <div className="col-span-2">
                  <b>Pilot actions:</b>{' '}
                  {inv.pilotActions.length === 0 ? (
                    <span className="text-muted-foreground">none</span>
                  ) : (
                    inv.pilotActions.map((a) => (
                      <Badge key={a} variant="secondary" className="mr-1">{a}</Badge>
                    ))
                  )}
                </div>
                <div className="col-span-2">
                  <b>Reason codes:</b>{' '}
                  {AWARD_ACTION_GUARD_REASON_CODES.map((c) => (
                    <Badge key={c} variant="secondary" className="mr-1">{c}</Badge>
                  ))}
                </div>
                <div className="col-span-2 text-[10px] text-muted-foreground">
                  Stage D5 posture: only the listed pilot actions have registered mutation handlers, and every command
                  flows through the canonical pipeline (guard → kill-switch → cohort → idempotency → optimistic
                  concurrency → transactional handler + audit → telemetry). Every remaining mutation stays
                  dark-launched. Zero direct writes exist in the Award 360 tree (enforced by
                  <code className="mx-1">safety.test.ts</code>).
                </div>
              </div>
            );
          })()}
        </div>


        <div className="text-muted-foreground">
          Communication rendered content is intentionally hidden until a dedicated
          view-content action is registered.
        </div>
      </CardContent>
    </Card>
  );
};
