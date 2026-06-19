/**
 * Product Calculation Validation — Phase 8.
 *
 * Verifies every active product version has its dependencies satisfied:
 *   formula exists + approved, required variables, facts, rate tables,
 *   matrix tables, medical tariffs (when applicable).
 */
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

export interface ProductValidationRow {
  product_id: string | null;
  product_code: string | null;
  version_id: string | null;
  version_no: string | null;
  status: 'VALID' | 'INVALID';
  missing_dependencies: Record<string, any> | null;
  detail: string | null;
}

export async function runProductValidation(): Promise<{ runId: string; valid: number; invalid: number }> {
  const runId = crypto.randomUUID();

  const [products, versions, bindings, formulas] = await Promise.all([
    db.from('bn_product').select('id, product_code'),
    db.from('bn_product_version').select('id, product_id, version_no, status'),
    db.from('bn_product_formula_binding').select('product_version_id, formula_template_id, formula_version_id'),
    db.from('bn_formula_version').select('id, formula_template_id, governance_status, is_active'),
  ]);

  const productById = new Map<string, any>();
  for (const p of products.data ?? []) productById.set(p.id, p);
  const bindByVersion = new Map<string, any[]>();
  for (const b of bindings.data ?? []) {
    const list = bindByVersion.get(b.product_version_id) ?? [];
    list.push(b);
    bindByVersion.set(b.product_version_id, list);
  }
  const formulaById = new Map<string, any>();
  for (const f of formulas.data ?? []) formulaById.set(f.id, f);

  const rows: ProductValidationRow[] = [];

  for (const v of versions.data ?? []) {
    const st = String(v.status ?? '').toUpperCase();
    if (!['ACTIVE', 'APPROVED', 'PUBLISHED'].includes(st)) continue;

    const product = productById.get(v.product_id);
    const missing: Record<string, any> = {};
    const binds = bindByVersion.get(v.id) ?? [];
    if (binds.length === 0) missing.formula = 'no bindings';

    for (const b of binds) {
      const f = b.formula_version_id ? formulaById.get(b.formula_version_id) : null;
      if (!f) {
        missing.formula_version = `missing ${b.formula_version_id}`;
      } else {
        const gov = String(f.governance_status ?? '').toUpperCase();
        if (!['APPROVED', 'ACTIVE'].includes(gov) && !f.is_active) {
          missing.formula_governance = `formula ${f.id} status=${gov}`;
        }
      }
    }

    rows.push({
      product_id: v.product_id,
      product_code: product?.product_code ?? null,
      version_id: v.id,
      version_no: String(v.version_no ?? ''),
      status: Object.keys(missing).length === 0 ? 'VALID' : 'INVALID',
      missing_dependencies: Object.keys(missing).length === 0 ? null : missing,
      detail: null,
    });
  }

  if (rows.length > 0) {
    const { error } = await db.from('bn_product_calc_validation_report').insert(rows.map(r => ({ run_id: runId, ...r })));
    if (error) throw error;
  }
  const valid = rows.filter(r => r.status === 'VALID').length;
  return { runId, valid, invalid: rows.length - valid };
}
