import { supabase } from '@/integrations/supabase/client';
import { logAction } from '@/platform/audit/auditService';
import { runAllChecks, computeOverall } from './checks';
import type { AttestationInput, CheckResult, ReleaseReadinessAttestation, ReleaseReadinessRun } from './types';

const db = supabase as any;
const RUN_TABLE = 'core_release_readiness_run';
const ATT_TABLE = 'core_release_readiness_attestation';

export async function runReadinessChecks(releaseTag: string, notes?: string): Promise<ReleaseReadinessRun> {
  const results = await runAllChecks(releaseTag);
  const { overall_status, passed_count, warning_count, failed_count } = computeOverall(results);

  const { data: userData } = await supabase.auth.getUser();
  const run_by = userData?.user?.id ?? null;

  const { data, error } = await db
    .from(RUN_TABLE)
    .insert({
      release_tag: releaseTag,
      overall_status,
      passed_count,
      warning_count,
      failed_count,
      check_results: results,
      notes: notes ?? null,
      run_by,
    })
    .select('*')
    .single();
  if (error) throw error;

  await logAction({
    event_code: 'RELEASE_READINESS_CHECK_RUN',
    action: 'EXECUTE',
    module_code: 'CORE',
    domain_code: 'GOVERNANCE',
    entity_type: RUN_TABLE,
    entity_id: data.id,
    outcome: overall_status === 'FAILED' ? 'FAILURE' : overall_status === 'WARNING' ? 'PARTIAL' : 'SUCCESS',
    notes: `Release ${releaseTag}: ${passed_count} passed, ${warning_count} warnings, ${failed_count} failed.`,
    metadata: { release_tag: releaseTag, overall_status },
  });

  return data as ReleaseReadinessRun;
}

export async function listRuns(limit = 20): Promise<ReleaseReadinessRun[]> {
  const { data, error } = await db.from(RUN_TABLE).select('*').order('run_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []) as ReleaseReadinessRun[];
}

export async function getLatestRun(releaseTag?: string): Promise<ReleaseReadinessRun | null> {
  let q = db.from(RUN_TABLE).select('*').order('run_at', { ascending: false }).limit(1);
  if (releaseTag) q = q.eq('release_tag', releaseTag);
  const { data, error } = await q;
  if (error) throw error;
  return (data?.[0] ?? null) as ReleaseReadinessRun | null;
}

export async function listAttestations(releaseTag: string): Promise<ReleaseReadinessAttestation[]> {
  const { data, error } = await db
    .from(ATT_TABLE)
    .select('*')
    .eq('release_tag', releaseTag)
    .order('attested_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ReleaseReadinessAttestation[];
}

export async function attestCheck(input: AttestationInput): Promise<ReleaseReadinessAttestation> {
  const { data: userData } = await supabase.auth.getUser();
  const attested_by = userData?.user?.id ?? null;

  const payload = {
    release_tag: input.release_tag,
    check_code: input.check_code,
    attested_status: input.attested_status ?? 'PASSED',
    evidence_url: input.evidence_url ?? null,
    notes: input.notes ?? null,
    attested_by,
    attested_at: new Date().toISOString(),
    is_active: true,
  };

  const { data, error } = await db
    .from(ATT_TABLE)
    .upsert(payload, { onConflict: 'release_tag,check_code' })
    .select('*')
    .single();
  if (error) throw error;

  await logAction({
    event_code: 'RELEASE_READINESS_CHECK_ATTESTED',
    action: 'ATTEST',
    module_code: 'CORE',
    domain_code: 'GOVERNANCE',
    entity_type: ATT_TABLE,
    entity_id: data.id,
    outcome: 'SUCCESS',
    notes: `Attested ${input.check_code} for release ${input.release_tag}.`,
    metadata: { release_tag: input.release_tag, check_code: input.check_code },
  });

  return data as ReleaseReadinessAttestation;
}

export async function revokeAttestation(id: string): Promise<void> {
  const { data, error } = await db.from(ATT_TABLE).update({ is_active: false }).eq('id', id).select('*').single();
  if (error) throw error;
  await logAction({
    event_code: 'RELEASE_READINESS_ATTESTATION_REVOKED',
    action: 'REVOKE',
    module_code: 'CORE',
    domain_code: 'GOVERNANCE',
    entity_type: ATT_TABLE,
    entity_id: id,
    outcome: 'SUCCESS',
    notes: `Revoked attestation for ${data.check_code} (${data.release_tag}).`,
  });
}

export async function overrideCheck(releaseTag: string, checkCode: string, reason: string): Promise<void> {
  await attestCheck({
    release_tag: releaseTag,
    check_code: checkCode,
    attested_status: 'ATTESTED',
    notes: `[OVERRIDE] ${reason}`,
  });
  await logAction({
    event_code: 'RELEASE_READINESS_CHECK_OVERRIDDEN',
    action: 'OVERRIDE',
    module_code: 'CORE',
    domain_code: 'GOVERNANCE',
    entity_type: ATT_TABLE,
    outcome: 'SUCCESS',
    is_high_risk: true,
    notes: `Overrode ${checkCode} for release ${releaseTag}: ${reason}`,
  });
}

export async function exportReport(run: ReleaseReadinessRun): Promise<string> {
  const lines: string[] = [];
  lines.push(`Release Readiness Report — ${run.release_tag}`);
  lines.push(`Overall: ${run.overall_status}`);
  lines.push(`Passed: ${run.passed_count}   Warnings: ${run.warning_count}   Failed: ${run.failed_count}`);
  lines.push(`Run at: ${run.run_at}`);
  lines.push('');
  for (const r of run.check_results as CheckResult[]) {
    lines.push(`[${r.status}] ${r.check_name} (${r.category})`);
    lines.push(`  ${r.summary}`);
    if (r.issues?.length) r.issues.forEach((i) => lines.push(`   - ${i}`));
  }
  const content = lines.join('\n');
  await logAction({
    event_code: 'RELEASE_READINESS_EXPORTED',
    action: 'EXPORT',
    module_code: 'CORE',
    domain_code: 'GOVERNANCE',
    entity_type: RUN_TABLE,
    entity_id: run.id,
    outcome: 'SUCCESS',
    notes: `Exported release ${run.release_tag} report.`,
  });
  return content;
}

export async function checkAdminAccessHealth(): Promise<{ ok: boolean; message: string }> {
  const { data, error } = await db
    .from('role_permissions')
    .select('role_id, module_actions!inner(action_name, module_id)')
    .eq('module_actions.module_id', 'f0120012-0000-4000-8000-000000000001')
    .eq('module_actions.action_name', 'view')
    .eq('is_granted', true)
    .limit(1);
  if (error) return { ok: false, message: error.message };
  const ok = (data ?? []).length > 0;
  await logAction({
    event_code: 'RELEASE_READINESS_ADMIN_ACCESS_VERIFIED',
    action: 'HEALTH_CHECK',
    module_code: 'CORE',
    domain_code: 'GOVERNANCE',
    entity_type: 'app_modules',
    outcome: ok ? 'SUCCESS' : 'PARTIAL',
    notes: ok ? 'Admin role can view Release Readiness Dashboard.' : 'No admin role has view permission.',
  });
  return {
    ok,
    message: ok
      ? 'Admin role has core.admin.release_readiness.view granted.'
      : 'No admin role has view access — grant Release Readiness view permission.',
  };
}
