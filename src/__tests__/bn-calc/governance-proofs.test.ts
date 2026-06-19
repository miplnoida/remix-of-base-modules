/**
 * Governance Final Validation — Proofs 1 & 2.
 *
 * Mocks the supabase client and feeds a deterministic snapshot of formula /
 * product configuration with one row per failure-mode so we can assert the
 * exact classification + recommendation produced by:
 *
 *   - runResolution()         (formulaResolverService)
 *   - runProductValidation()  (productCalcValidationService)
 *
 * Proofs 3 (audit coverage), 4 (immutability) and 5 (snapshot reproducibility)
 * are evidenced via psql in docs/bn/governance-final-proof.md.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  resetSupabaseMock,
  registerTable,
  supabase,
} from '@/test/mocks/supabaseClientMock';

vi.mock('@/integrations/supabase/client', () => ({ supabase }));

beforeEach(() => resetSupabaseMock());

describe('Proof 1 — Formula Resolver classifies every missing-source case', () => {
  it('emits each MISSING_* status exactly once', async () => {
    // One formula version expression referencing six variables — one per
    // failure mode, plus one that should RESOLVE.
    registerTable('bn_formula_template', { selectList: [] });
    registerTable('bn_formula_version', {
      selectList: [
        {
          id: 'fv-proof',
          formula_template_id: 'ft-proof',
          version_no: 1,
          expression:
            '{PROOF_RATE} + {PROOF_MATRIX} + {PROOF_TARIFF} + {PROOF_DF} + {PROOF_PARAM} + {PROOF_PRIOR} + {PROOF_OK}',
          is_active: true,
        },
      ],
    });

    // Variable registry points each variable at a non-existent source code.
    registerTable('bn_formula_variable_registry', {
      selectList: [
        { variable_code: 'PROOF_RATE',   source_type: 'RATE_TABLE',           source_path: 'SEED_MISSING_RATE',   is_active: true },
        { variable_code: 'PROOF_MATRIX', source_type: 'MATRIX',               source_path: 'SEED_MISSING_MATRIX', is_active: true },
        { variable_code: 'PROOF_TARIFF', source_type: 'MEDICAL_TARIFF',       source_path: 'SEED_MISSING_TARIFF', is_active: true },
        { variable_code: 'PROOF_DF',     source_type: 'DERIVED_FACT',         source_path: 'SEED_MISSING_DF',     is_active: true },
        { variable_code: 'PROOF_PARAM',  source_type: 'PRODUCT_PARAMETER',    source_path: 'SEED_MISSING_PARAM',  is_active: true },
        { variable_code: 'PROOF_PRIOR',  source_type: 'PRIOR_FORMULA_RESULT', source_path: 'SEED_MISSING_PRIOR',  is_active: true },
        { variable_code: 'PROOF_OK',     source_type: 'PRODUCT_PARAMETER',    source_path: 'PROOF_OK_PARAM',      is_active: true },
      ],
    });

    // Empty source stores apart from the one row that lets PROOF_OK resolve.
    registerTable('bn_data_field_registry',         { selectList: [] });
    registerTable('bn_derived_fact',                { selectList: [] });
    registerTable('bn_product_parameter', {
      selectList: [
        { code: 'PROOF_OK_PARAM', status: 'APPROVED', default_value: 1, effective_from: null, effective_to: null },
      ],
    });
    registerTable('bn_rate_table',                  { selectList: [] });
    registerTable('bn_rate_table_row',              { selectList: [] });
    registerTable('bn_rate_table_dimension',        { selectList: [] });
    registerTable('bn_medical_tariff_table',        { selectList: [] });
    registerTable('bn_medical_reimbursement_limit', { selectList: [] });
    registerTable('bn_formula_resolution_report',   { insertList: [] });

    const { runResolution } = await import(
      '@/services/bn/governance/formulaResolverService'
    );
    await runResolution();

    const rows = (registerTable as any) && // touch
      (await import('@/test/mocks/supabaseClientMock')).getInserts(
        'bn_formula_resolution_report',
      );
    const flat = rows.flatMap((b: any) => (Array.isArray(b) ? b : [b]));
    const byVar: Record<string, string> = {};
    for (const r of flat) byVar[r.variable_code] = r.status;

    expect(byVar.PROOF_RATE).toBe('MISSING_RATE_TABLE');
    expect(byVar.PROOF_MATRIX).toBe('MISSING_MATRIX_TABLE');
    expect(byVar.PROOF_TARIFF).toBe('MISSING_MEDICAL_TARIFF');
    expect(byVar.PROOF_DF).toBe('MISSING_DERIVED_FACT');
    expect(byVar.PROOF_PARAM).toBe('MISSING_PRODUCT_PARAMETER');
    expect(byVar.PROOF_PRIOR).toBe('MISSING_PRIOR_FORMULA_OUTPUT');
    expect(byVar.PROOF_OK).toBe('RESOLVED');
  });
});

describe('Proof 2 — Product Validator reports exact failure + fix per scenario', () => {
  it('flags missing parameter / rate / matrix / tariff / mapping / sequencing', async () => {
    registerTable('bn_product', {
      selectList: [{ id: 'p1', product_code: 'SEED-PROOF-PROD' }],
    });
    registerTable('bn_product_version', {
      selectList: [
        { id: 'pv1', product_id: 'p1', version_no: 1, status: 'ACTIVE' },
      ],
    });
    // Two bindings — the second one references PRIOR_OUT from the first
    // but with a HIGHER sequence_order on the producer (out-of-order).
    registerTable('bn_product_formula_binding', {
      selectList: [
        { id: 'b-consumer', product_version_id: 'pv1', formula_template_id: 'ft-cons', formula_version_id: 'fv-cons', sequence_order: 1 },
        { id: 'b-producer', product_version_id: 'pv1', formula_template_id: 'PRIOR_OUT', formula_version_id: 'fv-prod', sequence_order: 2 },
      ],
    });
    registerTable('bn_formula_version', {
      selectList: [
        { id: 'fv-cons', formula_template_id: 'ft-cons', governance_status: 'APPROVED', is_active: true,
          expression: '{P_MISS} + {RATE_MISS} + {MAT_MISS} + {TAR_MISS} + {PRIOR_OUT} + {UNMAPPED_VAR}' },
        { id: 'fv-prod', formula_template_id: 'ft-prod', governance_status: 'APPROVED', is_active: true, expression: '1' },
      ],
    });
    // Mappings: deliberately omit UNMAPPED_VAR.
    registerTable('bn_product_formula_variable_mapping', {
      selectList: [
        { binding_id: 'b-consumer', variable_name: 'P_MISS',    source_type: 'PRODUCT_PARAMETER', source_key: 'NOPE_PARAM',  required: true },
        { binding_id: 'b-consumer', variable_name: 'RATE_MISS', source_type: 'RATE_TABLE',        rate_table_code: 'NOPE_RT',  required: true },
        { binding_id: 'b-consumer', variable_name: 'MAT_MISS',  source_type: 'MATRIX',            rate_table_code: 'NOPE_MX',  required: true },
        { binding_id: 'b-consumer', variable_name: 'TAR_MISS',  source_type: 'MEDICAL_TARIFF',    source_key: 'NOPE_TARIFF',   required: true },
        { binding_id: 'b-consumer', variable_name: 'PRIOR_OUT', source_type: 'PRIOR_FORMULA_RESULT', source_key: 'PRIOR_OUT',  required: true },
      ],
    });
    registerTable('bn_rate_table',                  { selectList: [] });
    registerTable('bn_rate_table_row',              { selectList: [] });
    registerTable('bn_rate_table_dimension',        { selectList: [] });
    registerTable('bn_derived_fact',                { selectList: [] });
    registerTable('bn_product_parameter',           { selectList: [] });
    registerTable('bn_data_field_registry',         { selectList: [] });
    registerTable('bn_medical_tariff_table',        { selectList: [] });
    registerTable('bn_medical_reimbursement_limit', { selectList: [] });
    registerTable('bn_product_calc_validation_report', { insertList: [] });

    const { runProductValidation } = await import(
      '@/services/bn/governance/productCalcValidationService',
    );
    const result = await runProductValidation();
    expect(result.invalid).toBe(1);
    expect(result.valid).toBe(0);

    const inserted = (await import('@/test/mocks/supabaseClientMock')).getInserts(
      'bn_product_calc_validation_report',
    );
    const flat = inserted.flatMap((b: any) => (Array.isArray(b) ? b : [b]));
    const row = flat[0];
    const m = row.missing_dependencies as Record<string, any>;

    expect(row.status).toBe('INVALID');
    expect(m.missing_parameters).toContain('NOPE_PARAM');
    expect(m.missing_rate_tables).toContain('NOPE_RT');
    expect(m.missing_matrix_tables).toContain('NOPE_MX');
    expect(m.missing_medical_tariffs).toContain('NOPE_TARIFF');
    expect(m.unmapped_variables.join(',')).toContain('UNMAPPED_VAR');
    expect(m.unordered_prior_results.join(',')).toContain('PRIOR_OUT');
    // Recommendations are deterministic strings
    expect(m.fixes.join('|')).toMatch(/Approve product_parameter "NOPE_PARAM"/);
    expect(m.fixes.join('|')).toMatch(/Create rate_table "NOPE_RT"/);
    expect(m.fixes.join('|')).toMatch(/Create matrix table "NOPE_MX"/);
    expect(m.fixes.join('|')).toMatch(/Add medical tariff "NOPE_TARIFF"/);
    expect(m.fixes.join('|')).toMatch(/Map variable "UNMAPPED_VAR"/);
    expect(m.fixes.join('|')).toMatch(/Reorder bindings so producer of "PRIOR_OUT"/);
  });
});
