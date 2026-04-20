/**
 * Tiny merge-field renderer used by the template editor preview.
 * Replaces {{path.to.value}} tokens with values from the sample context.
 */
export function renderMergeFields(template: string | null | undefined, sample: Record<string, unknown>): string {
  if (!template) return '';
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, path: string) => {
    const parts = path.split('.');
    let cur: any = sample;
    for (const p of parts) {
      if (cur == null) return `{{${path}}}`;
      cur = cur[p];
    }
    return cur == null ? `{{${path}}}` : String(cur);
  });
}

/** Default preview context used when a template hasn't customized one. */
export const DEFAULT_PREVIEW_SAMPLE: Record<string, unknown> = {
  employer: { name: 'Acme Trading Ltd.', regno: 'EMP-00421', email: '[email protected]' },
  inspection: { case_no: 'AUD-2026-0177', visit_date: '12 May 2026', officer: 'J. Walters' },
  case: { due_date: '20 May 2026', amount_due: '$1,240.00' },
  report: { ref: 'RPT-2026-0177', finalized_at: '08 May 2026' },
  organization: { name: 'Social Security Board', address: 'Basseterre, St. Kitts' },
};
