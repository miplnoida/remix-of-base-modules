/**
 * Approval & Workflow Readiness card.
 *
 * Phase-1 governance card for the Configuration Validation page.
 * Verifies that the DB foundation seeded by migration
 * `Phase 1 — BN Claim Governance` is in place and that every published
 * product version has a workable approval path.
 *
 * Checks performed (all read-only):
 *   1. All 14 BN department roles exist.
 *   2. All 14 BN workbaskets exist.
 *   3. `CLAIM_GOVERNANCE_WORKFLOW` workflow definition exists with
 *      14 ordered steps.
 *   4. Every ACTIVE product version has at least one stage on its
 *      approval path (bn_approval_policy rows with stage_code set).
 *   5. Every staged approval policy row has an approval_role and an
 *      approval_workbasket_id.
 *   6. Long-term product versions have an AWARD stage on the path.
 *   7. Payable product versions have a PAYMENT_APPROVAL stage on the path.
 *   8. Legacy bn_override_policy rows are migrated (count = 0
 *      OR all have been mirrored into bn_approval_policy).
 */
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const REQUIRED_ROLES = [
  'BN_INTAKE_OFFICER','BN_DOCUMENT_OFFICER','BN_ELIGIBILITY_OFFICER',
  'BN_SENIOR_ELIGIBILITY_OFFICER','BN_CALCULATION_OFFICER','BN_CLAIMS_OFFICER',
  'BN_SUPERVISOR','BN_MANAGER','BN_DIRECTOR','BN_AWARD_OFFICER',
  'BN_PAYMENT_OFFICER','BN_FINANCE_SUPERVISOR','BN_AUDITOR','BN_CONFIG_ADMIN',
];

const REQUIRED_BASKETS = [
  'BN_INTAKE_REVIEW','BN_DOCUMENT_REVIEW','BN_ELIGIBILITY_REVIEW',
  'BN_ELIGIBILITY_OVERRIDE_REVIEW','BN_CALCULATION_REVIEW','BN_CLAIM_RECOMMENDATION',
  'BN_SUPERVISOR_APPROVAL','BN_MANAGER_APPROVAL','BN_DIRECTOR_APPROVAL',
  'BN_AWARD_SETUP','BN_PAYMENT_PREPARATION','BN_PAYMENT_APPROVAL',
  'BN_PAYMENT_ISSUE','BN_CONFIG_AUDIT',
];

type CheckStatus = 'PASS' | 'WARN' | 'FAIL';
interface Check { label: string; status: CheckStatus; detail: string; }

async function loadReadiness(): Promise<Check[]> {
  const checks: Check[] = [];

  // 1. Roles
  const { data: roles } = await supabase
    .from('roles')
    .select('role_name')
    .in('role_name', REQUIRED_ROLES);
  const haveRoles = new Set((roles ?? []).map((r) => r.role_name));
  const missingRoles = REQUIRED_ROLES.filter((r) => !haveRoles.has(r));
  checks.push({
    label: 'Department roles seeded',
    status: missingRoles.length === 0 ? 'PASS' : 'FAIL',
    detail: missingRoles.length === 0
      ? `All ${REQUIRED_ROLES.length} roles present.`
      : `Missing: ${missingRoles.join(', ')}`,
  });

  // 2. Workbaskets
  const { data: baskets } = await supabase
    .from('bn_workbasket')
    .select('basket_code, assigned_role')
    .in('basket_code', REQUIRED_BASKETS);
  const haveBaskets = new Set((baskets ?? []).map((b) => b.basket_code));
  const missingBaskets = REQUIRED_BASKETS.filter((b) => !haveBaskets.has(b));
  checks.push({
    label: 'Workbaskets seeded',
    status: missingBaskets.length === 0 ? 'PASS' : 'FAIL',
    detail: missingBaskets.length === 0
      ? `All ${REQUIRED_BASKETS.length} workbaskets present.`
      : `Missing: ${missingBaskets.join(', ')}`,
  });

  // 2b. Every workbasket has an assigned role
  const unassigned = (baskets ?? []).filter((b) => !b.assigned_role);
  checks.push({
    label: 'Every workbasket has an assigned role',
    status: unassigned.length === 0 ? 'PASS' : 'FAIL',
    detail: unassigned.length === 0
      ? 'All workbaskets routed to a role.'
      : `Unassigned: ${unassigned.map((b) => b.basket_code).join(', ')}`,
  });

  // 3. Workflow template + steps
  const { data: wf } = await supabase
    .from('workflow_definitions')
    .select('id')
    .eq('name', 'CLAIM_GOVERNANCE_WORKFLOW')
    .maybeSingle();
  let stepCount = 0;
  if (wf?.id) {
    const { count } = await supabase
      .from('workflow_steps')
      .select('id', { count: 'exact', head: true })
      .eq('workflow_id', wf.id);
    stepCount = count ?? 0;
  }
  checks.push({
    label: 'CLAIM_GOVERNANCE_WORKFLOW template',
    status: !wf?.id ? 'FAIL' : stepCount >= 14 ? 'PASS' : 'WARN',
    detail: !wf?.id
      ? 'Workflow definition missing.'
      : `${stepCount} step(s) configured (expected 14).`,
  });

  // 4-7. Per-product approval-path checks against ACTIVE product versions
  const { data: versions } = await supabase
    .from('bn_product_version')
    .select('id, version_label, status, payment_type, bn_product:product_id(category, benefit_code)')
    .eq('status', 'ACTIVE');

  const activeVersions = (versions ?? []) as any[];
  if (activeVersions.length === 0) {
    checks.push({
      label: 'Per-product approval paths',
      status: 'WARN',
      detail: 'No ACTIVE product versions to evaluate yet.',
    });
  } else {
    const versionIds = activeVersions.map((v) => v.id);
    const { data: policies } = await supabase
      .from('bn_approval_policy')
      .select('product_version_id, stage_code, approval_role, approval_workbasket_id, is_enabled')
      .in('product_version_id', versionIds)
      .not('stage_code', 'is', null);

    const byVersion = new Map<string, any[]>();
    for (const p of policies ?? []) {
      const arr = byVersion.get(p.product_version_id) ?? [];
      arr.push(p);
      byVersion.set(p.product_version_id, arr);
    }

    const missingPath = activeVersions.filter((v) => !(byVersion.get(v.id)?.length));
    checks.push({
      label: 'Every ACTIVE product has a staged approval path',
      status: missingPath.length === 0 ? 'PASS' : 'WARN',
      detail: missingPath.length === 0
        ? `${activeVersions.length} product version(s) configured.`
        : `Missing path: ${missingPath.map((v) => v.bn_product?.benefit_code ?? v.id).join(', ')}`,
    });

    const incomplete: string[] = [];
    for (const [vid, rows] of byVersion) {
      const bad = rows.filter((r) => !r.approval_role || !r.approval_workbasket_id);
      if (bad.length) {
        const v = activeVersions.find((x) => x.id === vid);
        incomplete.push(v?.bn_product?.benefit_code ?? vid);
      }
    }
    checks.push({
      label: 'Every staged policy row has a role + workbasket',
      status: incomplete.length === 0 ? 'PASS' : 'FAIL',
      detail: incomplete.length === 0
        ? 'All staged policy rows are routable.'
        : `Incomplete: ${incomplete.join(', ')}`,
    });

    const longTermMissingAward = activeVersions.filter((v) => {
      const cat = v.bn_product?.category;
      if (cat !== 'LONG_TERM' && cat !== 'SURVIVOR') return false;
      return !(byVersion.get(v.id) ?? []).some((r) => r.stage_code === 'AWARD_SETUP');
    });
    checks.push({
      label: 'Long-term products have AWARD_SETUP stage',
      status: longTermMissingAward.length === 0 ? 'PASS' : 'FAIL',
      detail: longTermMissingAward.length === 0
        ? 'OK.'
        : `Missing: ${longTermMissingAward.map((v) => v.bn_product?.benefit_code).join(', ')}`,
    });

    const payableMissing = activeVersions.filter((v) => {
      if (!v.payment_type) return false;
      return !(byVersion.get(v.id) ?? []).some((r) => r.stage_code === 'PAYMENT_APPROVAL');
    });
    checks.push({
      label: 'Payable products have PAYMENT_APPROVAL stage',
      status: payableMissing.length === 0 ? 'PASS' : 'WARN',
      detail: payableMissing.length === 0
        ? 'OK.'
        : `Missing: ${payableMissing.map((v) => v.bn_product?.benefit_code).join(', ')}`,
    });
  }

  // 8. Legacy override policies migrated?
  const { count: legacyCount } = await supabase
    .from('bn_override_policy')
    .select('id', { count: 'exact', head: true });
  checks.push({
    label: 'Legacy bn_override_policy migration',
    status: !legacyCount ? 'PASS' : 'WARN',
    detail: !legacyCount
      ? 'No legacy override rows remaining.'
      : `${legacyCount} legacy row(s) — review migration via Product Catalog override page.`,
  });

  return checks;
}

function StatusIcon({ s }: { s: CheckStatus }) {
  if (s === 'PASS') return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  if (s === 'WARN') return <AlertTriangle className="h-4 w-4 text-amber-600" />;
  return <XCircle className="h-4 w-4 text-destructive" />;
}

export function ClaimGovernanceReadinessCard() {
  const { data: checks, isLoading } = useQuery({
    queryKey: ['bn', 'claim-governance-readiness'],
    queryFn: loadReadiness,
    staleTime: 60_000,
  });

  const fails = (checks ?? []).filter((c) => c.status === 'FAIL').length;
  const warns = (checks ?? []).filter((c) => c.status === 'WARN').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Approval &amp; Workflow Readiness
          {!isLoading && (
            <Badge variant={fails > 0 ? 'destructive' : warns > 0 ? 'secondary' : 'default'}>
              {fails > 0 ? `${fails} failing` : warns > 0 ? `${warns} warning` : 'All checks pass'}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading readiness checks…
          </div>
        )}
        {!isLoading && fails === 0 && warns === 0 && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Claim governance foundation is in place.</AlertTitle>
            <AlertDescription>
              Roles, workbaskets, workflow template and per-product approval paths are configured.
            </AlertDescription>
          </Alert>
        )}
        <ul className="divide-y rounded-md border">
          {(checks ?? []).map((c) => (
            <li key={c.label} className="flex items-start gap-3 px-3 py-2 text-sm">
              <StatusIcon s={c.status} />
              <div className="flex-1">
                <div className="font-medium">{c.label}</div>
                <div className="text-xs text-muted-foreground">{c.detail}</div>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
