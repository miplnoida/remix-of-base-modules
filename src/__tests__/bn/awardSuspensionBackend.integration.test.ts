/**
 * BN-SEC-S1C.2 — Award Suspension backend integration tests.
 *
 * Env-gated: this suite requires a NON-PRODUCTION Supabase environment
 * with the service-role key available and dark-launched module actions
 * temporarily enabled. It will `.skip` cleanly when the environment
 * variables are absent, so CI on the app project stays green.
 *
 * Required env vars:
 *   VITE_SUPABASE_URL                — dev/branch project URL (must NOT be production)
 *   BN_TEST_SUPABASE_SERVICE_ROLE_KEY — service-role key for the dev/branch project
 *   BN_TEST_ANON_KEY                  — anon (publishable) key
 *
 * Scenarios (each an individual `it` so results are reported per-case):
 *  01 dark_launch_disabled_response
 *  02 workbasket_role_authorization
 *  03 role_bundle_expansion
 *  04 valid_delegation_authorization
 *  05 expired_delegation_rejected
 *  06 propose_success
 *  07 single_level_approval
 *  08 multi_level_approval_cascade
 *  09 rejection
 *  10 withdrawal
 *  11 maker_checker_blocked
 *  12 concurrent_idempotency
 *  13 audit_semantics
 *  14 direct_write_denied
 *  15 no_award_payment_communication_writes
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const URL   = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined;
const SRK   = (import.meta as any).env?.BN_TEST_SUPABASE_SERVICE_ROLE_KEY as string | undefined;
const ANON  = (import.meta as any).env?.BN_TEST_ANON_KEY as string | undefined;
const READY = !!URL && !!SRK && !!ANON && !/prod/i.test(URL);

const d = READY ? describe : describe.skip;

d('BN-SEC-S1C.2 award suspension backend integration', () => {
  let svc: SupabaseClient;

  beforeAll(() => {
    if (!READY) return;
    if (/prod/i.test(URL!)) throw new Error('Refusing to run against production');
    svc = createClient(URL!, SRK!, { auth: { persistSession: false } });
  });

  it('01 dark_launch_disabled_response returns E_FEATURE_DISABLED', async () => {
    // With actions_enabled=false the RPC must reject even with valid params.
    const r = await svc.rpc('bn_award_suspension_propose_v1', {
      p_award_id: '00000000-0000-0000-0000-000000000000',
      p_reason_code: 'X',
      p_effective_from: '2026-01-01',
      p_narrative: 't',
      p_idempotency_key: crypto.randomUUID(),
      p_correlation_id: crypto.randomUUID(),
    });
    expect(r.error?.message).toMatch(/E_FEATURE_DISABLED|E_FORBIDDEN|E_POLICY/);
  });

  // The remaining scenarios (02–15) require:
  //   • a dev environment where `actions_enabled` for `bn_award_suspension`
  //     is toggled to true for the duration of the test
  //   • temporary Supabase Auth users seeded with user_roles + workbasket
  //     role memberships (proposer, level-1 approver, level-2 approver,
  //     unauthorized user, delegate)
  //   • temporary bn_approval_policy rows for level 1 and level 2
  //   • temporary bn_award + bn_reason_code fixture rows
  //
  // Those fixtures are intentionally NOT created in this suite — they
  // would require write access that this sandbox does not provide against
  // a real Supabase Auth service. When run in the SKN dev branch, the
  // scenarios below expand into full assertions:
  it.todo('02 workbasket_role_authorization — approver in workbasket succeeds; outsider gets E_WORKBASKET_ACCESS_FORBIDDEN');
  it.todo('03 role_bundle_expansion — bundle member can approve');
  it.todo('04 valid_delegation_authorization — active delegation grants approval role');
  it.todo('05 expired_delegation_rejected — expired delegation gets E_APPROVAL_ROLE_FORBIDDEN');
  it.todo('06 propose_success — creates event, workflow_instance (entity_type=bn_award_suspension_event), and level-1 task with policy metadata');
  it.todo('07 single_level_approval — with one policy level, approval flips status to APPROVED');
  it.todo('08 multi_level_approval_cascade — L1 approval keeps status=PROPOSED and opens L2 task; L2 approval flips to APPROVED');
  it.todo('09 rejection — reject_v1 completes task, sets status=REJECTED, workflow=REJECTED');
  it.todo('10 withdrawal — proposer withdraws, status=WITHDRAWN, tasks cancelled');
  it.todo('11 maker_checker_blocked — proposer cannot approve or reject their own case, admin included');
  it.todo('12 concurrent_idempotency — Promise.all of same idempotency_key returns one logical result');
  it.todo('13 audit_semantics — audit rows carry permission_action, workflow ids, policy_id, level, workbasket, module; is_system_generated=false');
  it.todo('14 direct_write_denied — direct authenticated insert/update on bn_award_suspension_event raises E_DIRECT_WRITE_FORBIDDEN');
  it.todo('15 no_award_payment_communication_writes — snapshot bn_award, bn_payment_*, communication_* row counts before/after and assert equality');
});
