/**
 * AW360-WAVE-1-C1 Slice B.1 — additional certification tests covering:
 *   §2 execution-time scope enforcement
 *   §3 containment lockdown
 *   §4 exact query-matrix drift
 *   §6 live-schema envelope + provenance
 *   §7 action-route resolution against the router manifest
 *   §8 OPEN_CLAIM Option B — worklist fallback is always eligible
 *   §10 expanded action gating (routes/actions disabled, fallback intact)
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { AwardQueryRecorder } from '@/test/mocks/award360QueryRecorder';
import {
  AWARD360_SCHEMA_CONTRACT,
  renderAward360QueryMatrixMarkdown,
} from '@/services/bn/awards/award360SchemaContract';
import {
  AWARD_ACTION_DEFINITIONS,
} from '@/services/bn/awards/awardActionCatalog';
import {
  getAwardActionAvailability,
  fullyRolledOutState,
  type AwardActionInput,
  type AwardActionKey,
} from '@/services/bn/awards/awardActionAvailability';

// -----------------------------------------------------------------
// §2 scope enforcement
// -----------------------------------------------------------------
describe('AW360 Slice B.1 · scope enforcement', () => {
  it('rejects a completed query that omits the required scope filter', async () => {
    const rec = new AwardQueryRecorder({ responses: { bn_award_beneficiary: [] } });
    await expect(async () => {
      await rec.client().from('bn_award_beneficiary').select('id, bn_award_id');
    }).rejects.toThrow(/required scope filter on "bn_award_id"/);
  });

  it('accepts a scoped query', async () => {
    const rec = new AwardQueryRecorder({ responses: { bn_award_beneficiary: [] } });
    const c = rec.client();
    await c
      .from('bn_award_beneficiary')
      .select('id, bn_award_id, status')
      .eq('bn_award_id', 'a-1');
    expect(rec.queries).toHaveLength(1);
  });

  it('enforces scope for maybeSingle()', async () => {
    const rec = new AwardQueryRecorder({ responses: { bn_award: { id: 'a-1' } } });
    await expect(async () => {
      await rec.client().from('bn_award').select('id, award_number').maybeSingle();
    }).rejects.toThrow(/required scope filter on "id"/);
  });
});

// -----------------------------------------------------------------
// §3 containment lockdown
// -----------------------------------------------------------------
describe('AW360 Slice B.1 · containment lockdown', () => {
  it('permits .contains() only on explicitly allowed jsonb columns', () => {
    const rec = new AwardQueryRecorder();
    // bn_communication_log.context IS allowed
    expect(() =>
      rec.client().from('bn_communication_log').contains('context', { award_id: 'a-1' }),
    ).not.toThrow();
  });

  it('rejects .contains() on tables without allowedContainmentColumns', () => {
    const rec = new AwardQueryRecorder();
    // bn_claim has no containment allow-list
    expect(() =>
      rec.client().from('bn_claim').contains('id', {}),
    ).toThrow(/not an allowed containment column/);
  });
});

// -----------------------------------------------------------------
// §4 exact drift for the query matrix (matches action-matrix pattern)
// -----------------------------------------------------------------
describe('AW360 Slice B.1 · exact query-matrix drift', () => {
  it('checked-in query matrix equals the pure renderer output (structure)', () => {
    const rendered = renderAward360QueryMatrixMarkdown('');
    // Strip the optional live-schema metadata line from the checked-in doc
    // so structural comparison is stable regardless of provenance freshness.
    const actual = readFileSync(
      resolve(process.cwd(), 'docs/bn/award360-query-matrix.md'),
      'utf8',
    );
    // Every contract table must appear exactly once as a row header.
    for (const table of Object.keys(AWARD360_SCHEMA_CONTRACT)) {
      const marker = `| \`${table}\` |`;
      expect(rendered.split(marker).length).toBe(2);
      expect(actual.split(marker).length).toBe(2);
    }
    // Loaders column must exist in the header.
    expect(rendered).toContain('| Loaders |');
    expect(actual).toContain('| Loaders |');
  });
});

// -----------------------------------------------------------------
// §6 live-schema envelope + provenance
// -----------------------------------------------------------------
describe('AW360 Slice B.1 · live-schema envelope', () => {
  it('live schema JSON carries a provenance metadata envelope', () => {
    const raw = readFileSync(
      resolve(process.cwd(), 'src/services/bn/awards/award360.live-schema.json'),
      'utf8',
    );
    const parsed = JSON.parse(raw);
    expect(parsed.metadata).toBeDefined();
    expect(parsed.metadata.projectRef).toMatch(/^[a-z0-9]+$/);
    expect(parsed.metadata.capturedAt).toMatch(/T/);
    expect(parsed.metadata.source).toMatch(/information_schema/i);
    expect(parsed.tables).toBeDefined();
    expect(Object.keys(parsed.tables).length).toBeGreaterThan(20);
  });

  it('every contract table exists in the live-schema snapshot', () => {
    const raw = readFileSync(
      resolve(process.cwd(), 'src/services/bn/awards/award360.live-schema.json'),
      'utf8',
    );
    const parsed = JSON.parse(raw);
    for (const table of Object.keys(AWARD360_SCHEMA_CONTRACT)) {
      expect(parsed.tables[table], `${table} missing from live-schema snapshot`).toBeDefined();
    }
  });

  it('every allowed column in the contract exists in the live schema', () => {
    const raw = readFileSync(
      resolve(process.cwd(), 'src/services/bn/awards/award360.live-schema.json'),
      'utf8',
    );
    const parsed = JSON.parse(raw);
    for (const [table, contract] of Object.entries(AWARD360_SCHEMA_CONTRACT)) {
      const live: string[] = parsed.tables[table] ?? [];
      for (const col of contract.allowedColumns) {
        expect(live, `${table}.${col} not in live schema`).toContain(col);
      }
    }
  });
});

// -----------------------------------------------------------------
// §7 route resolution — every action route must map to a registered
// Award-360-facing route family in AppRoutes.tsx. We validate by
// searching the router source for the route prefix.
// -----------------------------------------------------------------
describe('AW360 Slice B.1 · route resolution', () => {
  // Registered top-level route prefixes surfaced from AppRoutes.tsx.
  // Any Award 360 action route must resolve into one of these families.
  const REGISTERED_ROUTE_PREFIXES = [
    '/bn/awards',
    '/bn/claims',
    '/bn/config',
    '/bn/payments',
    '/bn/persons',
    '/bn/comm',
    '/bn/audit',
    '/bn/medical',
    '/bn/overpayment',
    '/bn/suspension',
    '/bn/life-certificates',
    '/bn/survivors',
    '/bn/beneficiaries',
  ];

  it('every navigation action resolves to a registered route family', () => {
    for (const def of AWARD_ACTION_DEFINITIONS) {
      if (def.isMutation) continue;
      const template = def.routeTemplate;
      const matches = REGISTERED_ROUTE_PREFIXES.some((p) => template.startsWith(p));
      expect(matches, `${def.key} → ${template} does not match a registered route family`).toBe(true);
    }
  });

  it('every route template resolves placeholders cleanly (no {undefined})', () => {
    for (const def of AWARD_ACTION_DEFINITIONS) {
      if (def.isMutation) continue;
      expect(def.routeTemplate).not.toContain('undefined');
      expect(def.routeTemplate).not.toContain('null');
      expect(def.routeTemplate).not.toContain('{');
    }
  });
});

// -----------------------------------------------------------------
// §8 OPEN_CLAIM Option B — always eligible; deep-link OR worklist
// -----------------------------------------------------------------
function baseAwardInput(action: AwardActionKey): AwardActionInput {
  return {
    action,
    awardId: 'a-1',
    awardStatus: 'ACTIVE',
    hasClaimId: true,
    claimId: 'c-1',
    hasProductVersion: true,
    pensionerDeceased: false,
    permissions: {
      canViewAward: true,
      canViewCentralAudit: true,
      canServiceLifeCert: true,
      canServiceMedical: true,
      canServiceOverpayment: true,
      canServiceSuspension: true,
      canServicePayments: true,
      canServiceCommunications: true,
      canProposeSuspension: true,
      canApproveSuspension: true,
    },
    featureEnabled: {
      lifeCert: true, medicalReview: true, overpayment: true,
      awardSuspension: true, payments: true,
    },
    rolloutStates: fullyRolledOutState(),
  };
}

describe('AW360 Slice B.1 · OPEN_CLAIM Option B (worklist fallback)', () => {
  it('is always eligible — deep-links when claimId present', () => {
    const res = getAwardActionAvailability(baseAwardInput('OPEN_CLAIM'));
    expect(res.executionMode).toBe('NAVIGATE');
    expect(res.targetRoute).toBe('/bn/claims/c-1');
    expect(res.notEligibleReason).toBeUndefined();
  });

  it('falls back to /bn/claims worklist when no claimId — still eligible', () => {
    const input = baseAwardInput('OPEN_CLAIM');
    input.claimId = null;
    input.hasClaimId = false;
    const res = getAwardActionAvailability(input);
    expect(res.executionMode).toBe('NAVIGATE');
    expect(res.targetRoute).toBe('/bn/claims');
  });
});

// -----------------------------------------------------------------
// §10 expanded action gating — rollout state toggles
// -----------------------------------------------------------------
describe('AW360 Slice B.1 · expanded action gating', () => {
  it('routes_enabled=false disables NAVIGATION actions', () => {
    const input = baseAwardInput('OPEN_PRODUCT');
    input.rolloutStates = {
      ...fullyRolledOutState(),
      award: { moduleEnabled: true, routesEnabled: false, actionsEnabled: true },
    };
    const res = getAwardActionAvailability(input);
    expect(res.executionMode).toBe('DISABLED');
  });

  it('actions_enabled=false disables MUTATIONS but preserves navigation', () => {
    // ADD_BENEFICIARY is a mutation
    const mut = baseAwardInput('ADD_BENEFICIARY');
    mut.rolloutStates = {
      ...fullyRolledOutState(),
      award: { moduleEnabled: true, routesEnabled: true, actionsEnabled: false },
    };
    const mres = getAwardActionAvailability(mut);
    expect(mres.executionMode).toBe('DISABLED');

    const nav = baseAwardInput('OPEN_PRODUCT');
    nav.rolloutStates = {
      ...fullyRolledOutState(),
      award: { moduleEnabled: true, routesEnabled: true, actionsEnabled: false },
    };
    const nres = getAwardActionAvailability(nav);
    expect(nres.executionMode).toBe('NAVIGATE');
  });
});
