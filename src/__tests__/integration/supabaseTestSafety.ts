/**
 * BN-ENV-T1.1 — Local Supabase integration test safety helper.
 *
 * Enforces that BN integration tests can ONLY execute against a local
 * Supabase stack started by the Supabase CLI (`supabase start`).
 *
 * The live Lovable Cloud project ref `xynceskeiiisiefqlgxo` is denylisted.
 * Hosted `*.supabase.co` URLs are rejected outright — hostname must be
 * exactly `127.0.0.1` or `localhost`.
 *
 * Fail-closed semantics: when `BN_REQUIRE_LOCAL_SUPABASE_TESTS=YES` is set,
 * any missing configuration MUST raise; skipping is only permitted for
 * ordinary static test runs where that variable is absent.
 */

export const LIVE_PROJECT_REF_DENYLIST = ['xynceskeiiisiefqlgxo'] as const;

export interface LocalSupabaseCreds {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
}

export class LocalSupabaseSafetyError extends Error {
  constructor(message: string) {
    super(`[BN-ENV-T1 safety] ${message}`);
    this.name = 'LocalSupabaseSafetyError';
  }
}

function readEnv(name: string): string | undefined {
  const v = (globalThis as any).process?.env?.[name];
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

function required(name: string): string {
  const raw = readEnv(name);
  if (!raw) throw new LocalSupabaseSafetyError(`missing required env var: ${name}`);
  return raw;
}

/**
 * True when tests MUST NOT skip. Set by CI:
 *   BN_REQUIRE_LOCAL_SUPABASE_TESTS=YES
 */
export function isLocalIntegrationRequired(): boolean {
  return readEnv('BN_REQUIRE_LOCAL_SUPABASE_TESTS') === 'YES';
}

/**
 * True when a real local Supabase configuration is present.
 */
export function hasLocalIntegrationEnv(): boolean {
  return (
    readEnv('BN_TEST_ENVIRONMENT') === 'LOCAL_SUPABASE' &&
    readEnv('BN_TEST_CONFIRM_NONPROD') === 'YES' &&
    !!readEnv('BN_TEST_SUPABASE_URL') &&
    !!readEnv('BN_TEST_ANON_KEY') &&
    !!readEnv('BN_TEST_SUPABASE_SERVICE_ROLE_KEY')
  );
}

/**
 * Assert that the current process is configured for a LOCAL Supabase run.
 * Throws loudly on any mismatch — never silently skips.
 */
export function assertLocalSupabaseEnvironment(): LocalSupabaseCreds {
  if (readEnv('BN_TEST_CONFIRM_NONPROD') !== 'YES') {
    throw new LocalSupabaseSafetyError(
      'BN_TEST_CONFIRM_NONPROD must be exactly "YES" to run integration tests',
    );
  }
  if (readEnv('BN_TEST_ENVIRONMENT') !== 'LOCAL_SUPABASE') {
    throw new LocalSupabaseSafetyError('BN_TEST_ENVIRONMENT must be exactly "LOCAL_SUPABASE"');
  }

  const url = required('BN_TEST_SUPABASE_URL');
  const anonKey = required('BN_TEST_ANON_KEY');
  const serviceRoleKey = required('BN_TEST_SUPABASE_SERVICE_ROLE_KEY');

  for (const ref of LIVE_PROJECT_REF_DENYLIST) {
    if (url.includes(ref) || anonKey.includes(ref) || serviceRoleKey.includes(ref)) {
      throw new LocalSupabaseSafetyError(
        `denylisted production project ref "${ref}" detected in local test credentials`,
      );
    }
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new LocalSupabaseSafetyError(`BN_TEST_SUPABASE_URL is not a valid URL: ${url}`);
  }
  if (parsed.protocol !== 'http:') {
    throw new LocalSupabaseSafetyError(
      `BN_TEST_SUPABASE_URL must use http:// (local); got ${parsed.protocol}`,
    );
  }
  if (parsed.hostname !== '127.0.0.1' && parsed.hostname !== 'localhost') {
    throw new LocalSupabaseSafetyError(
      `BN_TEST_SUPABASE_URL hostname must be 127.0.0.1 or localhost; got "${parsed.hostname}"`,
    );
  }
  if (/\.supabase\.co$/i.test(parsed.hostname)) {
    throw new LocalSupabaseSafetyError('hosted supabase.co URLs are forbidden for integration tests');
  }

  return { url, anonKey, serviceRoleKey };
}

export function makeRunTag(prefix = 'bn_susp'): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${ts}_${rand}`;
}
