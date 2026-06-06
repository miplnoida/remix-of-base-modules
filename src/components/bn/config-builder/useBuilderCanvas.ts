/**
 * useBuilderCanvas — load/save BN product version canvas to dedicated column.
 * Persisted to bn_product_version.builder_canvas (jsonb) with metadata columns
 * builder_canvas_updated_by / builder_canvas_updated_at.
 *
 * Hydration: when the stored canvas is empty (or missing), the hook auto-
 * imports existing normalized rows (bn_eligibility_rule, bn_calculation_rule,
 * bn_doc_requirement, bn_comm_mapping, bn_timeline_rule) so the Visual Builder
 * always reflects what is actually configured for the selected version.
 *
 * Audit: logs UPDATE events to system_audit_trail via useBnConfigAudit.
 */
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBnConfigAudit } from '@/hooks/bn/useBnConfigAudit';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { EMPTY_CANVAS, type BuilderCanvas } from './types';
import { hydrateCanvasFromNormalized, canvasIsEmpty } from '@/services/bn/canvasHydrationService';

const db = supabase as any;

export function useBuilderCanvas(versionId?: string) {
  const [canvas, setCanvas] = useState<BuilderCanvas>(EMPTY_CANVAS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hydratedFromTables, setHydratedFromTables] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { log } = useBnConfigAudit();
  const { profile } = useSupabaseAuth();
  const userCode = profile?.user_code ?? 'system';

  const load = useCallback(async (forceHydrate = false) => {
    if (!versionId) { setCanvas(EMPTY_CANVAS); return; }
    setLoading(true);
    try {
      const { data, error } = await db
        .from('bn_product_version')
        .select('builder_canvas, eligibility_config')
        .eq('id', versionId)
        .maybeSingle();
      if (error) throw error;
      const fromCol = (data?.builder_canvas ?? {}) as Partial<BuilderCanvas>;
      const fromLegacy = (data?.eligibility_config?._canvas ?? {}) as Partial<BuilderCanvas>;
      const stored = (fromCol && Object.keys(fromCol).length > 0 ? fromCol : fromLegacy) as Partial<BuilderCanvas>;
      const merged: BuilderCanvas = {
        ...EMPTY_CANVAS,
        ...stored,
        sections: { ...EMPTY_CANVAS.sections, ...(stored.sections ?? {}) },
      } as BuilderCanvas;

      if (forceHydrate || canvasIsEmpty(merged)) {
        const hydrated = await hydrateCanvasFromNormalized(versionId);
        setCanvas(hydrated);
        setHydratedFromTables(true);
      } else {
        setCanvas(merged);
        setHydratedFromTables(false);
      }
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load canvas');
    } finally {
      setLoading(false);
    }
  }, [versionId]);

  useEffect(() => {
    let cancelled = false;
    (async () => { if (!cancelled) await load(false); })();
    return () => { cancelled = true; };
  }, [load]);

  const save = useCallback(async (next: BuilderCanvas) => {
    if (!versionId) return;
    setSaving(true);
    try {
      const { data: before } = await db.from('bn_product_version').select('builder_canvas').eq('id', versionId).maybeSingle();
      const payload = { ...next, updatedAt: new Date().toISOString() };
      const { error } = await db.from('bn_product_version').update({
        builder_canvas: payload,
        builder_canvas_updated_by: userCode,
        builder_canvas_updated_at: new Date().toISOString(),
      }).eq('id', versionId);
      if (error) throw error;
      setCanvas(payload);
      setHydratedFromTables(false);
      log({
        entityType: 'bn_product_version',
        entityId: versionId,
        action: 'UPDATE',
        before: before?.builder_canvas ?? null,
        after: payload,
        notes: 'Builder canvas updated',
      });
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? 'Save failed');
      throw e;
    } finally {
      setSaving(false);
    }
  }, [versionId, log, userCode]);

  const reimport = useCallback(() => load(true), [load]);

  return { canvas, setCanvas, save, reimport, loading, saving, hydratedFromTables, error };
}
