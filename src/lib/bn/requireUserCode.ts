/**
 * BN audit-trail guard.
 *
 * Every privileged BN write (claim, award, payment, suspension, life-cert,
 * medical review, calculation run, simulation) MUST be stamped with the
 * authenticated user's `user_code`. The legacy "SYSTEM" fallback is no longer
 * accepted — if we cannot identify the actor, the mutation must fail loudly
 * so the operator (and the audit reviewer) see a real error instead of an
 * untraceable row.
 */

export class MissingUserCodeError extends Error {
  readonly code = 'BN_MISSING_USER_CODE';
  constructor(action?: string) {
    super(
      action
        ? `Cannot perform "${action}" — authenticated user_code is required for BN audit.`
        : 'Cannot perform BN action — authenticated user_code is required for audit.',
    );
    this.name = 'MissingUserCodeError';
  }
}

const FORBIDDEN = new Set(['SYSTEM', 'CURRENT_USER', 'ANONYMOUS', 'UNKNOWN']);

export function requireUserCode(
  userCode: string | null | undefined,
  action?: string,
): string {
  const value = (userCode ?? '').trim();
  if (!value || FORBIDDEN.has(value.toUpperCase())) {
    throw new MissingUserCodeError(action);
  }
  return value;
}

export function isValidUserCode(userCode: string | null | undefined): boolean {
  try {
    requireUserCode(userCode);
    return true;
  } catch {
    return false;
  }
}
