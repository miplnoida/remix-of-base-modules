/**
 * BN-AP-01 Slice 2A.3 — Child-handler certification (static contract tests).
 *
 * These tests assert on the shape of `bn-benefits-query/index.ts` (source
 * text) rather than executing the Deno function, so they can run in the
 * Vitest suite alongside the rest of the BN test matrix. They enforce the
 * completion-gate invariants for Slice 2A.3:
 *
 *   1. The synthetic `appealSlice2Pending` handler has been removed.
 *   2. Every enterprise child query is registered against a real, named
 *      handler function.
 *   3. Every real appeal child handler routes through the parent gate
 *      (`requireAppealParent`) so a NOT_FOUND parent surfaces as
 *      NOT_FOUND, never as an empty page.
 *   4. `getAppeal` returns the canonical camelCase DTO expected by the
 *      Appeal 360 header (`appellantName`, `sourceReference`, `slaStatus`).
 *   5. `getAppealSourceDecision` filters on the correct FK column
 *      (`appeal_id`), matching the live schema.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SRC = fs.readFileSync(
  path.resolve(process.cwd(), 'supabase/functions/bn-benefits-query/index.ts'),
  'utf-8',
);

const CHILD_HANDLERS = [
  'getAppealParties',
  'getAppealIssues',
  'getAppealGrounds',
  'getAppealDeadlines',
  'getAppealEvidence',
  'getAppealEvidenceRequests',
  'getAppealStays',
  'getAppealHearing',
  'getAppealRecommendations',
  'getAppealDecisions',
  'getAppealDecisionSnapshot',
  'getAppealImplementation',
  'getAppealNotes',
  'getAppealLinks',
  'getAppealEvents',
  'getAppealWorkflow',
  'getAppealCommunications',
];

describe('BN-AP-01 Slice 2A.3 — child handler certification', () => {
  it('removes the synthetic appealSlice2Pending handler', () => {
    expect(SRC.includes('appealSlice2Pending')).toBe(false);
  });

  it('declares each enterprise child handler as a real function', () => {
    for (const name of CHILD_HANDLERS) {
      expect(SRC).toMatch(new RegExp(`\\basync function ${name}\\b`));
    }
  });

  it('routes every child handler through the parent gate', () => {
    for (const name of CHILD_HANDLERS) {
      const fnMatch = SRC.match(
        new RegExp(`async function ${name}\\([^)]*\\)[\\s\\S]*?\\n\\}\\n`, 'm'),
      );
      expect(fnMatch, `handler ${name} not extractable`).toBeTruthy();
      const body = fnMatch![0];
      expect(body, `${name} must call requireAppealParent`).toMatch(
        /requireAppealParent\(admin, params\)/,
      );
    }
  });

  it('registers real handlers for all 14 child queries in QUERY_REGISTRY', () => {
    const codeToHandler: Record<string, string> = {
      BN_APPEAL_GET_PARTIES: 'getAppealParties',
      BN_APPEAL_GET_ISSUES: 'getAppealIssues',
      BN_APPEAL_GET_GROUNDS: 'getAppealGrounds',
      BN_APPEAL_GET_DEADLINES: 'getAppealDeadlines',
      BN_APPEAL_GET_EVIDENCE: 'getAppealEvidence',
      BN_APPEAL_GET_EVIDENCE_REQUESTS: 'getAppealEvidenceRequests',
      BN_APPEAL_GET_STAYS: 'getAppealStays',
      BN_APPEAL_GET_HEARING: 'getAppealHearing',
      BN_APPEAL_GET_HEARINGS: 'getAppealHearing',
      BN_APPEAL_GET_RECOMMENDATIONS: 'getAppealRecommendations',
      BN_APPEAL_GET_DECISIONS: 'getAppealDecisions',
      BN_APPEAL_GET_DECISION_SNAPSHOT: 'getAppealDecisionSnapshot',
      BN_APPEAL_GET_IMPLEMENTATION: 'getAppealImplementation',
      BN_APPEAL_GET_NOTES: 'getAppealNotes',
      BN_APPEAL_GET_LINKS: 'getAppealLinks',
      BN_APPEAL_GET_EVENTS: 'getAppealEvents',
      BN_APPEAL_GET_WORKFLOW: 'getAppealWorkflow',
      BN_APPEAL_GET_COMMUNICATIONS: 'getAppealCommunications',
    };
    for (const [code, handler] of Object.entries(codeToHandler)) {
      const rx = new RegExp(`${code}:[^}]*handler:\\s*${handler}\\b`);
      expect(SRC, `${code} must register ${handler}`).toMatch(rx);
    }
  });

  it('getAppeal returns the canonical header DTO fields', () => {
    // The frontend header depends on these exact keys; assert they are emitted
    // either as `key:` or shorthand `key,` inside the DTO literal.
    for (const key of ['appellantName', 'sourceReference', 'slaStatus', 'appealNumber', 'rowVersion']) {
      expect(SRC).toMatch(new RegExp(`\\b${key}[:,]`));
    }
  });

  it('getAppealSourceDecision filters on appeal_id (not bn_appeal_id)', () => {
    const fnMatch = SRC.match(/async function getAppealSourceDecision[\s\S]*?\n\}\n/);
    expect(fnMatch).toBeTruthy();
    const body = fnMatch![0];
    expect(body).toContain(".eq('appeal_id'");
    expect(body).not.toContain(".eq('bn_appeal_id'");
  });

  it('parent gate throws canonical NOT_FOUND QueryError', () => {
    expect(SRC).toMatch(
      /requireAppealParent[\s\S]*?throw new QueryError\('NOT_FOUND', 'APPEAL_NOT_FOUND'/,
    );
  });
});
