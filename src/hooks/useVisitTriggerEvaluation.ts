/**
 * useVisitTriggerEvaluation
 *
 * Reactive bridge between the visit workspace and the configurable
 * communication trigger engine. Loads active rules + visit-level dedup
 * info, runs the pure engine, and exposes:
 *
 *   - `decisions`   matched rules (sorted by priority)
 *   - `suggestions` decisions whose mode is SUGGEST and not in cooldown
 *   - `autoActions` decisions whose mode is AUTO_CREATE_DRAFT or AUTO_SEND
 *   - `runAuto()`   executes auto rules — creates a draft (and sends if
 *                   AUTO_SEND + not requires_approval) for each
 *   - `act(rule)`   one-shot executor for a single rule (used by the UI
 *                   "Create draft" button on a suggestion)
 *
 * Template resolution: prefers `rule.template_id`; otherwise falls back
 * to the field-stage→template mapping for the rule's stage, narrowed to
 * `rule.comm_type`; otherwise picks any active template of that type.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { TriggerContext, TriggerDecision, CommTriggerRule } from '@/types/commTriggerRule';
import { commTriggerRuleService } from '@/services/commTriggerRuleService';
import { fieldStageTemplateMapService } from '@/services/fieldStageTemplateMapService';
import { auditCommunicationTemplateService } from '@/services/auditCommunicationTemplateService';
import { auditCommunicationService } from '@/services/auditCommunicationService';
import type { AuditCommunicationTemplate } from '@/types/auditCommunication';

interface Options {
  inspectionId: string | null | undefined;
  employerId: string | null | undefined;
  employerName?: string;
  visitContext: Omit<TriggerContext, 'existingByType'>;
  userCode?: string;
  /** Disable network calls (e.g. during loading). */
  enabled?: boolean;
}

export interface VisitTriggerActResult {
  status: 'created' | 'sent' | 'skipped' | 'failed';
  communicationId?: string;
  message?: string;
}

async function resolveTemplateForRule(rule: CommTriggerRule): Promise<AuditCommunicationTemplate | null> {
  if (rule.template_id) {
    try {
      const t = await auditCommunicationTemplateService.getById(rule.template_id);
      if (t && t.is_active) return t;
    } catch { /* fall through */ }
  }
  // Stage-mapped templates narrowed to the comm_type.
  try {
    const mapped = await fieldStageTemplateMapService.listForStage(rule.field_stage);
    const narrowed = mapped.filter((t) => t.comm_type === rule.comm_type);
    if (narrowed.length > 0) return narrowed[0];
    if (mapped.length > 0) return mapped[0];
  } catch { /* fall through */ }
  // Last-resort: any active template of this type.
  try {
    const all = await auditCommunicationTemplateService.list({ activeOnly: true });
    const m = all.find((t) => t.comm_type === rule.comm_type);
    if (m) return m;
  } catch { /* ignore */ }
  return null;
}

export function useVisitTriggerEvaluation({
  inspectionId, employerId, employerName, visitContext, userCode, enabled = true,
}: Options) {
  const [decisions, setDecisions] = useState<TriggerDecision[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Stable JSON view of the visit context — we only need to re-run when
  // a meaningful field changes.
  const ctxKey = useMemo(() => JSON.stringify(visitContext), [visitContext]);

  useEffect(() => {
    if (!enabled || !inspectionId) {
      setDecisions([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    commTriggerRuleService
      .evaluateForVisit(inspectionId, JSON.parse(ctxKey))
      .then((d) => { if (!cancelled) setDecisions(d); })
      .catch((e) => { if (!cancelled) setError(e?.message || 'Failed to evaluate triggers'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [enabled, inspectionId, ctxKey, refreshKey]);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const suggestions = useMemo(
    () => decisions.filter((d) => d.rule.trigger_mode === 'SUGGEST' && !d.skipped),
    [decisions],
  );
  const autoActions = useMemo(
    () => decisions.filter((d) => d.rule.trigger_mode !== 'SUGGEST' && !d.skipped),
    [decisions],
  );
  const skipped = useMemo(() => decisions.filter((d) => d.skipped), [decisions]);

  /** Execute a single rule. Returns a result; UI can toast accordingly. */
  const act = useCallback(async (rule: CommTriggerRule): Promise<VisitTriggerActResult> => {
    if (!inspectionId || !employerId) {
      return { status: 'skipped', message: 'Visit is not initialised yet.' };
    }
    const tpl = await resolveTemplateForRule(rule);
    if (!tpl) {
      return { status: 'skipped', message: `No active template for ${rule.comm_type}. Configure one in Settings or the field-stage mapping.` };
    }
    try {
      const draft = await auditCommunicationService.createDraft({
        inspectionId,
        employerId,
        templateId: tpl.id,
        contextData: {
          employer_name: employerName || employerId,
          visit_date: new Date().toISOString().slice(0, 10),
          field_stage: rule.field_stage,
          rule_code: rule.rule_code,
        },
        createdBy: userCode,
      });
      // AUTO_SEND only when the rule explicitly opts out of approval.
      if (rule.trigger_mode === 'AUTO_SEND' && !rule.requires_approval) {
        try {
          // Auto-approve then send (best-effort; requires `approve` API on service).
          // If the service rejects, we leave the draft in place for manual review.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const svc = auditCommunicationService as any;
          if (typeof svc.approveAll === 'function') await svc.approveAll(draft.id, userCode);
          await auditCommunicationService.send(draft.id, userCode);
          return { status: 'sent', communicationId: draft.id };
        } catch (e: any) {
          return { status: 'created', communicationId: draft.id, message: `Draft created; auto-send blocked: ${e?.message || e}` };
        }
      }
      return { status: 'created', communicationId: draft.id };
    } catch (e: any) {
      return { status: 'failed', message: e?.message || 'Failed to create draft' };
    }
  }, [inspectionId, employerId, employerName, userCode]);

  /**
   * Run all current AUTO_* decisions in priority order. Each result is
   * appended to `lastAutoRun` so the caller can summarise.
   */
  const runAuto = useCallback(async (): Promise<VisitTriggerActResult[]> => {
    const out: VisitTriggerActResult[] = [];
    for (const d of autoActions) {
      out.push(await act(d.rule));
    }
    return out;
  }, [autoActions, act]);

  return {
    decisions, suggestions, autoActions, skipped,
    loading, error, refresh,
    act, runAuto,
  };
}
