/**
 * Resolves prior-matter links for a given audit inspection (visit) into
 * displayable rows for the "Prior Compliance History" report section.
 *
 * Phase E — pulls active links from ce_audit_prior_matter_links (visit + finding-scope)
 * and joins them against the appropriate source tables so the report can show
 * a meaningful one-liner per matter (number, status, amount, date).
 */
import { supabase } from '@/integrations/supabase/client';
import { listAllLinksForInspection } from '@/services/auditPriorMatterLinkService';
import type { PriorMatterLink, PriorMatterType } from '@/types/employerHistory';

export interface ResolvedPriorMatter {
  link: PriorMatterLink;
  matterType: PriorMatterType;
  /** Display label (e.g., case number, violation number) */
  primaryLabel: string;
  /** Short descriptive line (status / amount / date) */
  detailLine: string;
  /** Optional relevance note recorded by the officer at link time */
  relevanceNote: string | null;
  /** Whether the link was attached at the visit level (vs finding-level) */
  scope: 'visit' | 'finding';
  findingId: string | null;
}

const TABLE_BY_TYPE: Record<PriorMatterType, { table: string; idCol: string }> = {
  CASE:            { table: 'ce_cases',                 idCol: 'id' },
  VIOLATION:       { table: 'ce_violations',            idCol: 'id' },
  ARRANGEMENT:     { table: 'ce_payment_arrangements',  idCol: 'id' },
  LEGAL:           { table: 'ce_legal_proceedings',     idCol: 'id' },
  FOLLOW_UP:       { table: 'ce_case_follow_ups',       idCol: 'id' },
  PAST_INSPECTION: { table: 'ce_inspections',           idCol: 'id' },
  PAST_REPORT:     { table: 'ia_audit_reports',         idCol: 'id' },
  DISPUTE:         { table: 'ce_violation_disputes',    idCol: 'id' },
};

function fmtMoney(v: any): string {
  if (v == null || v === '') return '';
  const n = Number(v);
  if (!Number.isFinite(n)) return '';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);
}

function fmtDate(v: any): string {
  if (!v) return '';
  try {
    return new Date(v).toLocaleDateString();
  } catch { return ''; }
}

function buildDisplay(type: PriorMatterType, row: any, link: PriorMatterLink): { primaryLabel: string; detailLine: string } {
  if (!row) {
    return {
      primaryLabel: link.matter_label || `${type} ${link.matter_id.slice(0, 8)}`,
      detailLine: '(record not found)',
    };
  }
  switch (type) {
    case 'CASE':
      return {
        primaryLabel: row.case_number || link.matter_label || 'Case',
        detailLine: [row.case_type, row.status, fmtMoney(row.total_amount), fmtDate(row.created_at)].filter(Boolean).join(' · '),
      };
    case 'VIOLATION':
      return {
        primaryLabel: row.violation_number || link.matter_label || 'Violation',
        detailLine: [row.violation_type_name || row.violation_type_code, row.severity, row.status, fmtMoney(row.total_amount)].filter(Boolean).join(' · '),
      };
    case 'ARRANGEMENT':
      return {
        primaryLabel: row.arrangement_number || link.matter_label || 'Arrangement',
        detailLine: [row.status, `Debt ${fmtMoney(row.total_debt)}`, `Paid ${fmtMoney(row.total_paid)}`, row.next_due_date ? `Next ${fmtDate(row.next_due_date)}` : ''].filter(Boolean).join(' · '),
      };
    case 'LEGAL':
      return {
        primaryLabel: row.case_number || link.matter_label || 'Legal Proceeding',
        detailLine: [row.stage, row.court, row.next_hearing ? `Hearing ${fmtDate(row.next_hearing)}` : ''].filter(Boolean).join(' · '),
      };
    case 'FOLLOW_UP':
      return {
        primaryLabel: link.matter_label || row.action_type || 'Follow-up',
        detailLine: [row.status, row.priority, row.due_date ? `Due ${fmtDate(row.due_date)}` : ''].filter(Boolean).join(' · '),
      };
    case 'PAST_INSPECTION':
      return {
        primaryLabel: row.inspection_number || link.matter_label || 'Inspection',
        detailLine: [row.status, row.visit_date ? fmtDate(row.visit_date) : '', row.inspector_name].filter(Boolean).join(' · '),
      };
    case 'PAST_REPORT':
      return {
        primaryLabel: row.report_number || link.matter_label || 'Audit Report',
        detailLine: [row.status, row.generated_at ? fmtDate(row.generated_at) : '', row.total_findings != null ? `${row.total_findings} findings` : ''].filter(Boolean).join(' · '),
      };
    case 'DISPUTE':
      return {
        primaryLabel: link.matter_label || 'Dispute',
        detailLine: [row.status, row.raised_at ? fmtDate(row.raised_at) : '', row.dispute_reason].filter(Boolean).join(' · '),
      };
    default:
      return { primaryLabel: link.matter_label || 'Matter', detailLine: '' };
  }
}

export async function fetchResolvedPriorMattersForInspection(inspectionId: string): Promise<ResolvedPriorMatter[]> {
  if (!inspectionId) return [];
  const links = await listAllLinksForInspection(inspectionId);
  if (links.length === 0) return [];

  // Group ids by matter_type for batched queries
  const byType = new Map<PriorMatterType, string[]>();
  for (const l of links) {
    const arr = byType.get(l.matter_type) ?? [];
    arr.push(l.matter_id);
    byType.set(l.matter_type, arr);
  }

  // Fetch all source rows in parallel
  const rowsByType = new Map<PriorMatterType, Map<string, any>>();
  await Promise.all(
    Array.from(byType.entries()).map(async ([type, ids]) => {
      const cfg = TABLE_BY_TYPE[type];
      if (!cfg) return;
      try {
        const { data, error } = await (supabase as any).from(cfg.table).select('*').in(cfg.idCol, ids);
        if (error) throw error;
        const map = new Map<string, any>();
        (data ?? []).forEach((r: any) => map.set(r[cfg.idCol], r));
        rowsByType.set(type, map);
      } catch (e) {
        console.warn(`[priorMatters] failed to load ${type} rows`, e);
        rowsByType.set(type, new Map());
      }
    })
  );

  return links.map((link) => {
    const row = rowsByType.get(link.matter_type)?.get(link.matter_id);
    const display = buildDisplay(link.matter_type, row, link);
    return {
      link,
      matterType: link.matter_type,
      primaryLabel: display.primaryLabel,
      detailLine: display.detailLine,
      relevanceNote: link.relevance_note,
      scope: link.finding_id ? 'finding' : 'visit',
      findingId: link.finding_id,
    };
  });
}
