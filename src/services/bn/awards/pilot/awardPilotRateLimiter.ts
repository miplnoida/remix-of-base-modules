/**
 * AW360-WAVE-1-C1 Stage D8 — Production rate limiting & backpressure.
 *
 * Action-aware limits with a stable RATE_LIMITED outcome. Callers receive
 * safe retry information; sustained rate-limiting emits a metrics record so
 * operational alerts can distinguish misuse, misconfiguration, and real
 * capacity pressure.
 */
import type { AwardActionKey } from '../awardActionAvailability';

export type RateLimitScope =
  | 'ACTOR'
  | 'TENANT'
  | 'AWARD'
  | 'ACTION'
  | 'PROVIDER'
  | 'CONCURRENT'
  | 'QUEUED_REMINDER_DELIVERY'
  | 'RECONCILIATION_BACKLOG';

export interface RateLimitRule {
  readonly scope: RateLimitScope;
  readonly action?: AwardActionKey;
  readonly windowMs: number;
  readonly max: number;
  readonly retryAfterMs: number;
}

export interface RateLimitAttempt {
  readonly action: AwardActionKey;
  readonly tenantId: string;
  readonly actorUserId: string;
  readonly awardId: string;
  readonly provider?: string;
  readonly at: number;
}

export type RateLimitOutcome =
  | { readonly outcome: 'ALLOWED' }
  | {
      readonly outcome: 'RATE_LIMITED';
      readonly scope: RateLimitScope;
      readonly retryAfterMs: number;
      readonly reason: string;
    };

export interface RateLimitMetricsSample {
  readonly scope: RateLimitScope;
  readonly action: AwardActionKey;
  readonly count: number;
  readonly windowStart: number;
  readonly windowEnd: number;
}

export interface AwardPilotRateLimiter {
  readonly rules: readonly RateLimitRule[];
  check(a: RateLimitAttempt): RateLimitOutcome;
  release(a: Pick<RateLimitAttempt, 'action' | 'awardId'>): void;
  metrics(): readonly RateLimitMetricsSample[];
}

/** Default production rules — conservative for the four pilot actions. */
export const AWARD_PILOT_RATE_LIMIT_RULES: readonly RateLimitRule[] = [
  { scope: 'ACTOR', windowMs: 60_000, max: 30, retryAfterMs: 2_000 },
  { scope: 'TENANT', windowMs: 60_000, max: 200, retryAfterMs: 1_000 },
  { scope: 'AWARD', windowMs: 60_000, max: 5, retryAfterMs: 5_000 },
  { scope: 'ACTION', action: 'SEND_LIFE_CERTIFICATE_REMINDER', windowMs: 60_000, max: 120, retryAfterMs: 1_000 },
  { scope: 'ACTION', action: 'SCHEDULE_MEDICAL_REVIEW', windowMs: 60_000, max: 60, retryAfterMs: 1_000 },
  { scope: 'ACTION', action: 'PROPOSE_SUSPENSION', windowMs: 60_000, max: 30, retryAfterMs: 2_000 },
  { scope: 'ACTION', action: 'PROPOSE_RESUMPTION', windowMs: 60_000, max: 30, retryAfterMs: 2_000 },
  { scope: 'PROVIDER', windowMs: 1_000, max: 20, retryAfterMs: 500 },
  { scope: 'CONCURRENT', windowMs: 0, max: 50, retryAfterMs: 250 },
  { scope: 'QUEUED_REMINDER_DELIVERY', windowMs: 60_000, max: 500, retryAfterMs: 2_000 },
  { scope: 'RECONCILIATION_BACKLOG', windowMs: 0, max: 10, retryAfterMs: 30_000 },
];

interface Bucket {
  hits: number[];
}

export function createPilotRateLimiter(
  rules: readonly RateLimitRule[] = AWARD_PILOT_RATE_LIMIT_RULES,
): AwardPilotRateLimiter {
  const buckets = new Map<string, Bucket>();
  const concurrent = new Map<string, number>();
  const samples: RateLimitMetricsSample[] = [];

  function bucketFor(scope: RateLimitScope, key: string): Bucket {
    const k = `${scope}::${key}`;
    let b = buckets.get(k);
    if (!b) buckets.set(k, (b = { hits: [] }));
    return b;
  }

  function keyForRule(rule: RateLimitRule, a: RateLimitAttempt): string | null {
    if (rule.action && rule.action !== a.action) return null;
    switch (rule.scope) {
      case 'ACTOR': return `${a.tenantId}::${a.actorUserId}`;
      case 'TENANT': return a.tenantId;
      case 'AWARD': return `${a.tenantId}::${a.awardId}`;
      case 'ACTION': return `${a.tenantId}::${a.action}`;
      case 'PROVIDER': return a.provider ?? '__none__';
      case 'CONCURRENT': return `${a.tenantId}::${a.action}::${a.awardId}`;
      case 'QUEUED_REMINDER_DELIVERY': return a.action === 'SEND_LIFE_CERTIFICATE_REMINDER' ? a.tenantId : null;
      case 'RECONCILIATION_BACKLOG': return `__recon::${a.tenantId}`;
    }
  }

  return {
    rules,
    check(a) {
      for (const rule of rules) {
        const key = keyForRule(rule, a);
        if (key == null) continue;
        if (rule.scope === 'CONCURRENT') {
          const n = concurrent.get(key) ?? 0;
          if (n >= rule.max) {
            return { outcome: 'RATE_LIMITED', scope: rule.scope, retryAfterMs: rule.retryAfterMs, reason: 'CONCURRENT_LIMIT' };
          }
          concurrent.set(key, n + 1);
          continue;
        }
        const b = bucketFor(rule.scope, key);
        const cutoff = a.at - rule.windowMs;
        b.hits = b.hits.filter((t) => t >= cutoff);
        if (b.hits.length >= rule.max) {
          samples.push({
            scope: rule.scope,
            action: a.action,
            count: b.hits.length,
            windowStart: cutoff,
            windowEnd: a.at,
          });
          return {
            outcome: 'RATE_LIMITED',
            scope: rule.scope,
            retryAfterMs: rule.retryAfterMs,
            reason: `${rule.scope}_LIMIT_EXCEEDED`,
          };
        }
        b.hits.push(a.at);
      }
      return { outcome: 'ALLOWED' };
    },
    release(a) {
      for (const rule of rules) {
        if (rule.scope !== 'CONCURRENT') continue;
        if (rule.action && rule.action !== a.action) continue;
        // release without tenant/actor is best-effort — decrement any award-scoped counter.
        for (const [k, n] of concurrent) {
          if (k.endsWith(`::${a.action}::${a.awardId}`)) {
            concurrent.set(k, Math.max(0, n - 1));
          }
        }
      }
    },
    metrics: () => samples.slice(),
  };
}
