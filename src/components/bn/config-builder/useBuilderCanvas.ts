/**
 * useBuilderCanvas — load/save BN product version canvas to dedicated column.
 * Persisted to bn_product_version.builder_canvas (jsonb) with metadata columns
 * builder_canvas_updated_by / builder_canvas_updated_at.
 * Audit: logs UPDATE events to system_audit_trail via useBnConfigAudit.
 */
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBnConfigAudit } from '@/hooks/bn/useBnConfigAudit';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { EMPTY_CANVAS, type BuilderCanvas } from './types';

const db = supabase as any;

export function useBuilderCanvas(versionId?: string) {
  const [canvas, setCanvas] = useState<BuilderCanvas>(EMPTY_CANVAS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { log } = useBnConfigAudit();
  const { profile } = useSupabaseAuth();
  const userCode = profile?.user_code ?? 'system';

  useEffect(() => {
    let cancelled = false;
    if (!versionId) { setCanvas(EMPTY_CANVAS); return; }
    setLoading(true);
    (async () => {
      try {
        const { data, error } = await db
          .from('bn_product_version')
          .select('builder_canvas, eligibility_config')
          .eq('id', versionId)
          .maybeSingle();
        if (error) throw error;
        // Prefer dedicated column; fall back to legacy eligibility_config._canvas.
        const fromCol = (data?.builder_canvas ?? {}) as Partial<BuilderCanvas>;
        const fromLegacy = (data?.eligibility_config?._canvas ?? {}) as Partial<BuilderCanvas>;
        const c = (fromCol && Object.keys(fromCol).length > 0 ? fromCol : fromLegacy) as Partial<BuilderCanvas>;
        if (!cancelled) {
          setCanvas({
            ...EMPTY_CANVAS,
            ...c,
            sections: { ...EMPTY_CANVAS.sections, ...(c.sections ?? {}) },
          } as BuilderCanvas);
          setError(null);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Failed to load canvas');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [versionId]);

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

  return { canvas, setCanvas, save, loading, saving, error };
}
