/**
 * BN-ENV-T1 — Local Supabase integration test safety helper.
 *
 * Enforces that BN suspension integration tests can ONLY execute against a
 * local Supabase stack started by the Supabase CLI (`supabase start`).
 *
 * The live Lovable Cloud project ref `xynceskeiiisiefqlgxo` is denylisted.
 * Hosted `*.supabase.co` URLs are rejected outright — hostname must be
 * exactly `127.0.0.1` or `localhost`.
 *
 * The helper reads from `process.env` (Node/Vitest); it does NOT read
 * `import.meta.env` and does not import the app Supabase client.
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

function required(name: string): string {
  const raw = (globalThis as any).process?.env?.[name];
  if (typeof raw !== 'string' || raw.length === 0) {
    throw new LocalSupabaseSafetyError(`missing required env var: ${name}`);
  }
  return raw;
}

/**
 * Assert that the current process is configured for a LOCAL Supabase run.
 * Throws loudly on any mismatch — never silently skips.
 */
export function assertLocalSupabaseEnvironment(): LocalSupabaseCreds {
  const env = (globalThis as any).process?.env ?? {};

  if (env.BN_TEST_CONFIRM_NONPROD !== 'YES') {
    throw new LocalSupabaseSafetyError(
      'BN_TEST_CONFIRM_NONPROD must be exactly "YES" to run integration tests',
    );
  }
  if (env.BN_TEST_ENVIRONMENT !== 'LOCAL_SUPABASE') {
    throw new LocalSupabaseSafetyError(
      'BN_TEST_ENVIRONMENT must be exactly "LOCAL_SUPABASE"',
    );
  }

  const url = required('BN_TEST_SUPABASE_URL');
  const anonKey = required('BN_TEST_ANON_KEY');
  const serviceRoleKey = required('BN_TEST_SUPABASE_SERVICE_ROLE_KEY');

  // Reject denylisted refs anywhere in the URL / keys.
  for (const ref of LIVE_PROJECT_REF_DENYLIST) {
    if (url.includes(ref) || anonKey.includes(ref) || serviceRoleKey.includes(ref)) {
      throw new LocalSupabaseSafetyError(
        `denylisted production project ref "${ref}" detected in local test credentials`,
      );
    }
  }

  // Hostname must be exactly 127.0.0.1 or localhost.
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

/**
 * Unique run identifier for isolating fixture rows within a single local
 * database. `supabase db reset --local` remains the final isolation
 * boundary between runs.
 */
export function makeRunTag(prefix = 'bn_susp'): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${ts}_${rand}`;
}
