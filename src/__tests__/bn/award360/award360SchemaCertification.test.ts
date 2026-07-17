/**
 * AW360-WAVE-1 — Cross-service schema drift certification.
 *
 * Statically scans every Award 360 service for column names and table
 * scopes that are known to NOT exist in the live schema. Any regression
 * that reintroduces a legacy column will fail here before it can reach
 * the runtime "column does not exist" error surface.
 *
 * This complements summarySchemaAlignment.test.ts (which enforces at the
 * mock boundary for the summary service) by covering award360Service and
 * award360DeepService too.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SERVICES = [
  'award360Service.ts',
  'award360DeepService.ts',
  'award360SummaryService.ts',
].map((f) => join(__dirname, '..', '..', '..', 'services', 'bn', 'awards', f));

// Columns that must NEVER appear as a select item, filter, or order key
// anywhere in an Award 360 service. Each entry is matched as a full
// single-quoted string to avoid false positives on substrings.
const FORBIDDEN_COLUMN_LITERALS = [
  // bn_award_suspension_event
  "'event_status'",
  "'proposed_by'",
  // bn_payment_instruction
  "'instruction_number'",
  // bn_payment_schedule
  "'next_run_date'",
  "'last_run_date'",
  // bn_communication_log
  "'template_code'",
  "'delivery_method'",
  // bn_overpayment
  "'overpayment_reference'",
  "'total_amount'",
  // bn_claim
  "'assigned_officer'",
  // Note: bn_product_version_id is legitimate on bn_comm_mapping; the
  // bn_claim-specific ban is enforced by mapping.test.ts.
  // bn_product
  "'product_code'",
  // ip_master
  "'residency_status'",
  "'is_deceased'",
];

// Column-in-context violations: (table scope hint, forbidden column literal).
// These catch cases where a column name is legal on another table but must
// never be used against the named table.
const CONTEXTUAL_VIOLATIONS: Array<{ table: string; column: string; note: string }> = [
  { table: 'bn_award_beneficiary',   column: "'award_id'",      note: 'must be bn_award_id' },
  { table: 'bn_overpayment',         column: "'award_id'",      note: 'must be bn_award_id' },
  { table: 'bn_communication_log',   column: "'award_id'",      note: 'scope by claim_id + context @> {award_id}' },
];

function readServices(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of SERVICES) out[p] = readFileSync(p, 'utf8');
  return out;
}

describe('AW360-WAVE-1 · schema drift certification', () => {
  const srcs = readServices();

  it('reads every Award 360 service source', () => {
    for (const [, s] of Object.entries(srcs)) {
      expect(s.length).toBeGreaterThan(0);
    }
  });

  it('contains no forbidden column literals in any service', () => {
    const offenders: string[] = [];
    for (const [path, src] of Object.entries(srcs)) {
      for (const bad of FORBIDDEN_COLUMN_LITERALS) {
        if (src.includes(bad)) {
          offenders.push(`${path.split('/').pop()} :: ${bad}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('contains no contextual (table + forbidden column) pairs', () => {
    const offenders: string[] = [];
    for (const [path, src] of Object.entries(srcs)) {
      for (const rule of CONTEXTUAL_VIOLATIONS) {
        // Look for `.from('<table>')` followed within a reasonable window by
        // the forbidden column literal used as a filter/order/select key.
        const re = new RegExp(
          `\\.from\\(\\s*'${rule.table}'\\s*\\)[\\s\\S]{0,600}?${rule.column
            .replace(/'/g, "'")
            .replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}`,
          'm',
        );
        if (re.test(src)) {
          offenders.push(`${path.split('/').pop()} :: ${rule.table} → ${rule.column} (${rule.note})`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('scopes bn_award_beneficiary by bn_award_id', () => {
    for (const [path, src] of Object.entries(srcs)) {
      if (!src.includes(".from('bn_award_beneficiary')")) continue;
      // At least one bn_award_id eq must be present when the table is used.
      const usesBnAwardId = /bn_award_beneficiary[\s\S]{0,400}?\.eq\(\s*'bn_award_id'/.test(src);
      expect(usesBnAwardId, `${path} uses bn_award_beneficiary without bn_award_id scope`).toBe(true);
    }
  });

  it('scopes bn_payment_instruction by award_id (legacy field preserved)', () => {
    for (const [path, src] of Object.entries(srcs)) {
      if (!src.includes(".from('bn_payment_instruction')")) continue;
      const usesAwardId = /bn_payment_instruction[\s\S]{0,400}?\.eq\(\s*'award_id'/.test(src);
      expect(usesAwardId, `${path} uses bn_payment_instruction without award_id scope`).toBe(true);
    }
  });

  it('orders bn_award_suspension_event by entered_at (never created_at)', () => {
    for (const [path, src] of Object.entries(srcs)) {
      if (!src.includes(".from('bn_award_suspension_event')")) continue;
      // If it orders at all against this table, it must use entered_at.
      const badOrder = /bn_award_suspension_event[\s\S]{0,400}?\.order\(\s*'created_at'/.test(src);
      expect(badOrder, `${path} orders bn_award_suspension_event by created_at`).toBe(false);
    }
  });
});
