/**
 * Compliance Rule Engine — export helpers.
 *
 * Export: produces a JSON snapshot of all rule configuration.
 * Import: deliberately NOT implemented (too risky for a regulator
 * tool). The wizard exposes "Import — pending" as a TODO so that
 * future implementation can plug into validateConditionExpression /
 * validateFormulaExpression before applying any change.
 */

export interface ComplianceRuleExport {
  version: '1.0';
  generated_at: string;
  generated_by: string | null;
  detection_rules: any[];
  calculation_rules: any[];
  escalation_rules: any[];
  variable_mappings: any[];
}

export function buildRuleExport(
  parts: Omit<ComplianceRuleExport, 'version' | 'generated_at' | 'generated_by'>,
  generatedBy: string | null
): ComplianceRuleExport {
  return {
    version: '1.0',
    generated_at: new Date().toISOString(),
    generated_by: generatedBy,
    ...parts,
  };
}

export function downloadRuleExport(payload: ComplianceRuleExport, filenamePrefix = 'compliance-rules') {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${filenamePrefix}-${stamp}.json`;
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return filename;
}
