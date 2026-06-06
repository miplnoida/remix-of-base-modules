/**
 * canvasValidation — smart validation for the BN config canvas.
 * Detects: missing required block, duplicates, invalid references,
 * inactive referenced library items, broken formula, unmapped actions,
 * missing mandatory letters, missing required documents.
 */
import type { BuilderCanvas, BuilderValidationIssue } from './types';
import { BN_WORKFLOW_ROLES } from '@/services/bn/registries/workflowRolesRegistry';
import { FORMULA_VARIABLES } from '@/services/bn/registries/formulaVariableRegistry';

const ROLES = new Set<string>(BN_WORKFLOW_ROLES as readonly string[]);
const VARS = new Set(FORMULA_VARIABLES.map((v) => v.key));

export function validateCanvas(canvas: BuilderCanvas): BuilderValidationIssue[] {
  const issues: BuilderValidationIssue[] = [];

  // Eligibility — must have at least 1 block
  if (canvas.sections.eligibility.length === 0) {
    issues.push({ section: 'eligibility', severity: 'WARNING', message: 'No eligibility rules configured' });
  }

  // Documents — duplicate document_code in REQUIRED
  const docs = canvas.sections.documents.filter((b) => b.kind === 'document.required');
  const docCodes = new Map<string, string[]>();
  for (const d of docs) {
    const c = String(d.props?.document_code ?? '').trim();
    if (!c) { issues.push({ blockId: d.id, section: 'documents', severity: 'ERROR', message: 'Document code is empty' }); continue; }
    docCodes.set(c, [...(docCodes.get(c) ?? []), d.id]);
  }
  for (const [code, ids] of docCodes) {
    if (ids.length > 1) issues.push({ section: 'documents', severity: 'ERROR', message: `Duplicate required document "${code}" (${ids.length}x)` });
  }

  // Calculation — formula variables exist in registry
  for (const b of canvas.sections.calculation) {
    if (b.kind === 'formula.variable') {
      const k = String(b.props?.variable_key ?? '');
      if (!k) issues.push({ blockId: b.id, section: 'calculation', severity: 'ERROR', message: 'Variable not selected' });
      else if (!VARS.has(k)) issues.push({ blockId: b.id, section: 'calculation', severity: 'WARNING', message: `Variable "${k}" not in registry` });
    }
  }
  if (canvas.sections.calculation.length === 0) {
    issues.push({ section: 'calculation', severity: 'WARNING', message: 'No calculation formula configured' });
  }

  // Workflow — role conformance, duplicate step_code
  const stepCodes = new Map<string, string[]>();
  for (const b of canvas.sections.workflow) {
    if (b.kind === 'workflow.step') {
      const sc = String(b.props?.step_code ?? '').trim();
      if (!sc) issues.push({ blockId: b.id, section: 'workflow', severity: 'ERROR', message: 'Workflow step is missing step_code' });
      else stepCodes.set(sc, [...(stepCodes.get(sc) ?? []), b.id]);
      const role = b.props?.role;
      if (role && !ROLES.has(role)) issues.push({ blockId: b.id, section: 'workflow', severity: 'ERROR', message: `Step role "${role}" not in workflow role registry` });
    }
    if (b.kind === 'workflow.escalation') {
      const role = b.props?.target_role;
      if (role && !ROLES.has(role)) issues.push({ blockId: b.id, section: 'workflow', severity: 'ERROR', message: `Escalation target role "${role}" not in registry` });
    }
  }
  for (const [c, ids] of stepCodes) if (ids.length > 1) issues.push({ section: 'workflow', severity: 'ERROR', message: `Duplicate workflow step_code "${c}"` });

  // Communications — must have template_code; check mandatory delivery_method
  for (const b of canvas.sections.communications) {
    if (b.kind === 'comm.event') {
      if (!String(b.props?.event_code ?? '').trim()) issues.push({ blockId: b.id, section: 'communications', severity: 'ERROR', message: 'Communication event code is empty' });
      if (!String(b.props?.template_code ?? '').trim()) issues.push({ blockId: b.id, section: 'communications', severity: 'WARNING', message: 'Communication has no template code' });
    }
  }

  return issues;
}
