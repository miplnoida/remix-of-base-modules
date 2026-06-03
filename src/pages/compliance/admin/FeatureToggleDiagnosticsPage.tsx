/**
 * Compliance Feature Toggle Runtime Diagnostics (UAT only).
 *
 * Reachable via direct URL: /compliance/admin/feature-toggle-diagnostics
 * Not added to the main sidebar. Gated by the existing Compliance Setup
 * permission via PermissionWrapper. Read-only.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useIsAdmin } from '@/hooks/useNavigationMenu';
import { useComplianceFeatureFlagsBootstrap } from '@/hooks/compliance/useComplianceFeatureFlags';
import { resolveComplianceAccess, type ComplianceModuleRow } from '@/lib/compliance/accessResolution';
import {
  getComplianceDbFlag,
  hasComplianceDbFlagsLoaded,
  subscribeComplianceDbFlags,
} from '@/lib/compliance/featureFlagCache';
import {
  isComplianceFeatureEnabled,
  COMPLIANCE_HELPER_TO_DB_FLAG,
  type ComplianceFeatureKey,
} from '@/lib/compliance/featureToggles';
import { AlertTriangle, RefreshCw, ExternalLink } from 'lucide-react';

const PHASE1_DB_FLAGS = [
  'compliance.core.verification_queue',
  'compliance.payment.arrangement',
  'compliance.risk.automation_jobs',
];

const PHASE2_DB_FLAGS = [
  'compliance.core.case_merge',
  'compliance.core.case_reopen',
  'compliance.core.notice_approval',
  'compliance.core.case_closure_approval',
  'compliance.payment.waiver_requests',
  'compliance.inspection.field',
  'compliance.inspection.planning',
  'compliance.inspection.evidence',
  'compliance.inspection.convert_finding',
  'compliance.legal.handoff',
  'compliance.legal.pack_generation',
  'compliance.legal.court_monitoring',
  'compliance.legal.returned_handling',
  'compliance.risk.scoring',
  'compliance.risk.rule_simulator',
  'compliance.risk.risk_simulator',
];

const PHASE1_HELPER_KEYS: ComplianceFeatureKey[] = [
  'violations.verificationQueue',
  'arrangements.new',
  'arrangements.active',
  'arrangements.pendingApproval',
  'arrangements.installmentsDue',
  'arrangements.paymentAllocation',
  'reports.automationJobs',
];

const PHASE2_HELPER_KEYS: ComplianceFeatureKey[] = [
  'cases.mergeReview',
  'cases.reopenRequests',
  'notices.pendingApproval',
  'cases.closure',
  'enforcement.waivers',
  'inspections',
  'inspections.planning',
  'inspections.evidence',
  'inspections.convertFinding',
  'legal.handoff',
  'legal.packPreparation',
  'legal.courtMonitoring',
  'legal.returnedFromLegal',
  'risk.scoring',
  'risk.ruleSimulator',
  'risk.riskSimulator',
];

interface RouteTest {
  path: string;
  flagKey: string;
  expectedWhenOff: 'FeatureDisabled' | 'blocked-write' | 'normal';
}

const ROUTE_TESTS: RouteTest[] = [
  { path: '/compliance/violations/verification-queue', flagKey: 'compliance.core.verification_queue', expectedWhenOff: 'FeatureDisabled' },
  { path: '/compliance/arrangements/new', flagKey: 'compliance.payment.arrangement', expectedWhenOff: 'FeatureDisabled' },
  { path: '/compliance/arrangements/active', flagKey: 'compliance.payment.arrangement', expectedWhenOff: 'FeatureDisabled' },
  { path: '/compliance/arrangements/payment-allocation', flagKey: 'compliance.payment.arrangement', expectedWhenOff: 'FeatureDisabled' },
  { path: '/compliance/admin/automation/jobs', flagKey: 'compliance.risk.automation_jobs', expectedWhenOff: 'FeatureDisabled' },
  { path: '/compliance/reports/automation-jobs', flagKey: 'compliance.risk.automation_jobs', expectedWhenOff: 'FeatureDisabled' },
  // Phase 2
  { path: '/compliance/cases/merge-review', flagKey: 'compliance.core.case_merge', expectedWhenOff: 'FeatureDisabled' },
  { path: '/compliance/cases/reopen-requests', flagKey: 'compliance.core.case_reopen', expectedWhenOff: 'FeatureDisabled' },
  { path: '/compliance/notices/pending-approval', flagKey: 'compliance.core.notice_approval', expectedWhenOff: 'FeatureDisabled' },
  { path: '/compliance/cases/closure', flagKey: 'compliance.core.case_closure_approval', expectedWhenOff: 'FeatureDisabled' },
  { path: '/compliance/enforcement/waivers', flagKey: 'compliance.payment.waiver_requests', expectedWhenOff: 'FeatureDisabled' },
  { path: '/compliance/field/execution', flagKey: 'compliance.inspection.field', expectedWhenOff: 'FeatureDisabled' },
  { path: '/compliance/field/plan-builder', flagKey: 'compliance.inspection.planning', expectedWhenOff: 'FeatureDisabled' },
  { path: '/compliance/inspections/evidence', flagKey: 'compliance.inspection.evidence', expectedWhenOff: 'FeatureDisabled' },
  { path: '/compliance/inspections/convert-finding', flagKey: 'compliance.inspection.convert_finding', expectedWhenOff: 'FeatureDisabled' },
  { path: '/compliance/enforcement/legal-referral', flagKey: 'compliance.legal.handoff', expectedWhenOff: 'FeatureDisabled' },
  { path: '/compliance/legal/pack-preparation', flagKey: 'compliance.legal.pack_generation', expectedWhenOff: 'FeatureDisabled' },
  { path: '/compliance/enforcement/proceedings', flagKey: 'compliance.legal.court_monitoring', expectedWhenOff: 'FeatureDisabled' },
  { path: '/compliance/legal/returned-from-legal', flagKey: 'compliance.legal.returned_handling', expectedWhenOff: 'FeatureDisabled' },
  { path: '/compliance/risk/score-details', flagKey: 'compliance.risk.scoring', expectedWhenOff: 'FeatureDisabled' },
  { path: '/compliance/admin/tools/rule-simulator', flagKey: 'compliance.risk.rule_simulator', expectedWhenOff: 'FeatureDisabled' },
  { path: '/compliance/admin/tools/risk-simulator', flagKey: 'compliance.risk.risk_simulator', expectedWhenOff: 'FeatureDisabled' },
];


function BoolBadge({ value }: { value: boolean | undefined }) {
  if (value === undefined) return <Badge variant="outline">unloaded</Badge>;
  return value ? <Badge className="bg-emerald-600">ON</Badge> : <Badge variant="destructive">OFF</Badge>;
}

function DecisionBadge({ decision }: { decision: string }) {
  if (decision === 'render') return <Badge className="bg-emerald-600">Render page</Badge>;
  if (decision === 'feature-disabled') return <Badge variant="secondary">FeatureDisabled</Badge>;
  if (decision === 'fail-closed') return <Badge variant="destructive">Fail closed</Badge>;
  return <Badge variant="destructive">Access Denied</Badge>;
}

function Mono({ children }: { children: React.ReactNode }) {
  return <span className="font-mono text-xs break-all">{children ?? '—'}</span>;
}

export default function FeatureToggleDiagnosticsPage() {
  const auth = useSupabaseAuth();
  const isAdmin = useIsAdmin();
  const { isLoading, isError, refetch } = useComplianceFeatureFlagsBootstrap();
  const [routePath, setRoutePath] = useState('/compliance/violations');
  // Force re-render when cache changes
  const [, setTick] = useState(0);
  useEffect(() => subscribeComplianceDbFlags(() => setTick((t) => t + 1)), []);

  const loaded = hasComplianceDbFlagsLoaded();

  const userId = auth?.user?.id;

  const profileQ = useQuery({
    queryKey: ['compliance-access-diag-profile', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id,email,full_name')
        .eq('id', userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const rolesQ = useQuery({
    queryKey: ['compliance-access-diag-roles', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role,created_at')
        .eq('user_id', userId!);
      if (error) throw error;
      return data || [];
    },
  });

  const modulesQ = useQuery({
    queryKey: ['compliance-access-diag-modules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_modules')
        .select('id,name,display_name,route,parent_id,sort_order,is_enabled,show_in_menu,routes_enabled')
        .or('route.like./compliance/%,route.eq./compliance')
        .order('sort_order');
      if (error) throw error;
      return (data || []) as ComplianceModuleRow[];
    },
  });

  const permissionsQ = useQuery({
    queryKey: ['compliance-access-diag-permissions', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('get_user_permissions', { _user_id: userId! });
      if (error) throw error;
      return data || [];
    },
  });

  const accessibleQ = useQuery({
    queryKey: ['compliance-access-diag-accessible', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('get_user_accessible_modules', { _user_id: userId! });
      if (error) throw error;
      return data || [];
    },
  });

  const actionQ = useQuery({
    queryKey: ['compliance-access-diag-actions', modulesQ.data?.map((m) => m.id).join(',')],
    enabled: !!modulesQ.data?.length,
    queryFn: async () => {
      const ids = modulesQ.data!.map((m) => m.id);
      const { data, error } = await supabase
        .from('module_actions')
        .select('id,module_id,action_name,display_name,is_enabled')
        .in('module_id', ids)
        .eq('action_name', 'view');
      if (error) throw error;
      return data || [];
    },
  });

  const rolePermissionQ = useQuery({
    queryKey: ['compliance-access-diag-role-permissions', rolesQ.data?.map((r: any) => r.role).join(','), modulesQ.data?.map((m) => m.id).join(',')],
    enabled: !!rolesQ.data?.length && !!modulesQ.data?.length,
    queryFn: async () => {
      const roleNames = (rolesQ.data || []).map((r: any) => r.role);
      const { data: roleRows, error: roleError } = await supabase
        .from('roles')
        .select('id,role_name')
        .in('role_name', roleNames);
      if (roleError) throw roleError;
      const roleIds = (roleRows || []).map((r) => r.id);
      if (!roleIds.length) return [];
      const { data, error } = await supabase
        .from('role_permissions')
        .select('id,role_id,module_id,action_id,is_granted')
        .in('role_id', roleIds)
        .in('module_id', modulesQ.data!.map((m) => m.id));
      if (error) throw error;
      return (data || []).map((rp: any) => ({ ...rp, role_name: roleRows?.find((r) => r.id === rp.role_id)?.role_name }));
    },
  });

  const parentById = useMemo(() => new Map((modulesQ.data || []).map((m) => [m.id, m])), [modulesQ.data]);
  const actionsByModule = useMemo(() => new Map((actionQ.data || []).map((a: any) => [a.module_id, a])), [actionQ.data]);
  const rolePermByModuleAction = useMemo(() => new Map((rolePermissionQ.data || []).map((rp: any) => [`${rp.module_id}:${rp.action_id}`, rp])), [rolePermissionQ.data]);
  const accessibleNames = useMemo(() => new Set((accessibleQ.data || []).map((m: any) => m.name)), [accessibleQ.data]);
  const resolution = useMemo(() => resolveComplianceAccess({
    pathname: routePath,
    modules: modulesQ.data || [],
    permissions: permissionsQ.data || [],
    accessibleModuleNames: accessibleNames,
    isAdmin,
  }), [routePath, modulesQ.data, permissionsQ.data, accessibleNames, isAdmin]);

  return (
    <PermissionWrapper moduleName="ce_admin_feature_toggles">
      <div className="container mx-auto p-6 space-y-6">
        <PageHeader
          title="Feature Toggle Runtime Diagnostics"
          subtitle="UAT-only — verifies the DB feature_flags ↔ runtime helper bridge."
        />

        <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="pt-6 flex gap-3 items-start text-sm">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-foreground">UAT diagnostics only.</p>
              <p className="text-muted-foreground">
                Do not link this page from the main menu. Read-only view of the
                compliance feature toggle runtime cache. Reachable by direct URL.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>1. Session & cache status</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <div><span className="text-muted-foreground">User:</span> <span className="font-mono">{auth?.user?.email ?? '—'}</span></div>
            <div><span className="text-muted-foreground">User ID:</span> <span className="font-mono text-xs">{auth?.user?.id ?? '—'}</span></div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Cache loaded:</span> <BoolBadge value={loaded} />
              {isLoading && <Badge variant="outline">loading…</Badge>}
              {isError && <Badge variant="destructive">load error</Badge>}
              <Button size="sm" variant="outline" onClick={() => refetch()} className="ml-auto gap-2">
                <RefreshCw className="h-3 w-3" /> Refresh flags
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Raw DB flag values (Phase 1 + Phase 2)</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b">
                  <th className="py-2">flag_key</th>
                  <th className="py-2">DB value</th>
                </tr>
              </thead>
              <tbody>
                {[...PHASE1_DB_FLAGS, ...PHASE2_DB_FLAGS].map((k) => (
                  <tr key={k} className="border-b last:border-0">
                    <td className="py-2 font-mono text-xs">{k}</td>
                    <td className="py-2"><BoolBadge value={getComplianceDbFlag(k)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>3. Runtime helper results (isComplianceFeatureEnabled)</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b">
                  <th className="py-2">helper key</th>
                  <th className="py-2">mapped DB key</th>
                  <th className="py-2">result</th>
                </tr>
              </thead>
              <tbody>
                {[...PHASE1_HELPER_KEYS, ...PHASE2_HELPER_KEYS].map((k) => (
                  <tr key={k} className="border-b last:border-0">
                    <td className="py-2 font-mono text-xs">{k}</td>
                    <td className="py-2 font-mono text-xs">{COMPLIANCE_HELPER_TO_DB_FLAG[k] ?? '—'}</td>
                    <td className="py-2"><BoolBadge value={isComplianceFeatureEnabled(k)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>4. Active route tests</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b">
                  <th className="py-2">route</th>
                  <th className="py-2">flag</th>
                  <th className="py-2">DB</th>
                  <th className="py-2">expected when OFF</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {ROUTE_TESTS.map((t) => (
                  <tr key={t.path} className="border-b last:border-0">
                    <td className="py-2 font-mono text-xs">{t.path}</td>
                    <td className="py-2 font-mono text-xs">{t.flagKey}</td>
                    <td className="py-2"><BoolBadge value={getComplianceDbFlag(t.flagKey)} /></td>
                    <td className="py-2 text-xs">{t.expectedWhenOff}</td>
                    <td className="py-2 text-right">
                      <Button asChild size="sm" variant="outline" className="gap-1">
                        <Link to={t.path} target="_blank" rel="noreferrer">
                          Open <ExternalLink className="h-3 w-3" />
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>5. Where to change flags</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Edit at{' '}
            <Link to="/compliance/admin/feature-toggles" className="text-primary underline">
              Compliance → Setup → Feature Toggles
            </Link>. Click <em>Refresh flags</em> above after changing.
          </CardContent>
        </Card>
      </div>
    </PermissionWrapper>
  );
}
