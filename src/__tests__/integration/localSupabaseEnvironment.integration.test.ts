/**
 * BN-ENV-T1.1 — Environment validation integration test.
 *
 * Static safety checks (always run) use vi.stubEnv / vi.unstubAllEnvs to
 * mutate env deterministically. Local Auth capability tests run against a
 * `supabase start` stack and fail closed when
 * BN_REQUIRE_LOCAL_SUPABASE_TESTS=YES.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  assertLocalSupabaseEnvironment,
  LocalSupabaseSafetyError,
  LIVE_PROJECT_REF_DENYLIST,
  makeRunTag,
  hasLocalIntegrationEnv,
  isLocalIntegrationRequired,
} from './supabaseTestSafety';

const READY = hasLocalIntegrationEnv();
const REQUIRED = isLocalIntegrationRequired();

if (REQUIRED && !READY) {
  // Fail closed at load time when CI demands local tests but env is missing.
  throw new Error(
    '[BN-ENV-T1] BN_REQUIRE_LOCAL_SUPABASE_TESTS=YES but local Supabase env vars are missing',
  );
}

describe('BN-ENV-T1 safety helper (always runs)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('rejects hosted supabase.co URL', () => {
    vi.stubEnv('BN_TEST_CONFIRM_NONPROD', 'YES');
    vi.stubEnv('BN_TEST_ENVIRONMENT', 'LOCAL_SUPABASE');
    vi.stubEnv('BN_TEST_SUPABASE_URL', 'https://xynceskeiiisiefqlgxo.supabase.co');
    vi.stubEnv('BN_TEST_ANON_KEY', 'x');
    vi.stubEnv('BN_TEST_SUPABASE_SERVICE_ROLE_KEY', 'x');
    expect(() => assertLocalSupabaseEnvironment()).toThrow(LocalSupabaseSafetyError);
  });

  it('rejects denylisted live project ref', () => {
    vi.stubEnv('BN_TEST_CONFIRM_NONPROD', 'YES');
    vi.stubEnv('BN_TEST_ENVIRONMENT', 'LOCAL_SUPABASE');
    vi.stubEnv('BN_TEST_SUPABASE_URL', 'http://127.0.0.1:54321');
    vi.stubEnv('BN_TEST_ANON_KEY', `contains-${LIVE_PROJECT_REF_DENYLIST[0]}`);
    vi.stubEnv('BN_TEST_SUPABASE_SERVICE_ROLE_KEY', 'x');
    expect(() => assertLocalSupabaseEnvironment()).toThrow(/denylisted/);
  });

  it('rejects missing confirmation variable', () => {
    vi.stubEnv('BN_TEST_CONFIRM_NONPROD', '');
    vi.stubEnv('BN_TEST_ENVIRONMENT', 'LOCAL_SUPABASE');
    vi.stubEnv('BN_TEST_SUPABASE_URL', 'http://127.0.0.1:54321');
    vi.stubEnv('BN_TEST_ANON_KEY', 'x');
    vi.stubEnv('BN_TEST_SUPABASE_SERVICE_ROLE_KEY', 'x');
    expect(() => assertLocalSupabaseEnvironment()).toThrow(/BN_TEST_CONFIRM_NONPROD/);
  });

  it('accepts a well-formed local configuration', () => {
    vi.stubEnv('BN_TEST_CONFIRM_NONPROD', 'YES');
    vi.stubEnv('BN_TEST_ENVIRONMENT', 'LOCAL_SUPABASE');
    vi.stubEnv('BN_TEST_SUPABASE_URL', 'http://127.0.0.1:54321');
    vi.stubEnv('BN_TEST_ANON_KEY', 'anon-local');
    vi.stubEnv('BN_TEST_SUPABASE_SERVICE_ROLE_KEY', 'service-local');
    expect(() => assertLocalSupabaseEnvironment()).not.toThrow();
  });
});

// When REQUIRED, use describe (must run). Otherwise skip when env absent.
const authDescribe = REQUIRED ? describe : READY ? describe : describe.skip;

authDescribe('BN-ENV-T1 local Supabase auth capability', () => {
  let admin: SupabaseClient;
  let anon: SupabaseClient;
  let userId: string | null = null;
  const tag = makeRunTag('bn_env');
  const email = `${tag}@local.test`;
  const password = `Pw!${tag}_x1`;

  beforeAll(() => {
    const creds = assertLocalSupabaseEnvironment();
    admin = createClient(creds.url, creds.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    anon = createClient(creds.url, creds.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  });

  afterAll(async () => {
    if (userId && admin) {
      await admin.auth.admin.deleteUser(userId);
    }
  });

  it('creates a temporary Auth user via service-role admin API', async () => {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    expect(error).toBeNull();
    expect(data.user?.id).toBeTruthy();
    userId = data.user!.id;
  });

  it('signs in and verifies PostgreSQL auth.uid() via bn_test_auth_uid_probe', async () => {
    const { data: signIn, error: signInError } = await anon.auth.signInWithPassword({
      email,
      password,
    });
    expect(signInError).toBeNull();
    expect(signIn.session?.access_token).toBeTruthy();
    expect(userId).toBeTruthy();

    // Call the local-only probe with the signed-in anon client. PostgREST
    // forwards the JWT so auth.uid() resolves inside PostgreSQL itself.
    const { data: uid, error: rpcError } = await anon.rpc('bn_test_auth_uid_probe');
    expect(rpcError).toBeNull();
    expect(uid).toBe(userId);
  });

  it('deletes the temporary Auth user via service-role admin API', async () => {
    expect(userId).toBeTruthy();
    const { error } = await admin.auth.admin.deleteUser(userId!);
    expect(error).toBeNull();
    userId = null;
  });
});
