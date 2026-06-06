/**
 * useBuilderCanvas — load/save BN product version canvas.
 * Storage: stowed inside bn_product_version.eligibility_config under "_canvas"
 * key to avoid a schema migration. Executable eligibility rules continue to
 * live in the same JSONB but under their existing keys.
 * Audit: logs CREATE/UPDATE events to system_audit_trail via useBnConfigAudit.
 */
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBnConfigAudit } from '@/hooks/bn/useBnConfigAudit';
import { EMPTY_CANVAS, type BuilderCanvas } from './types';

const db = supabase as any;
const CANVAS_KEY = '_canvas';

export function useBuilderCanvas(versionId?: string) {
  const [canvas, setCanvas] = useState<BuilderCanvas>(EMPTY_CANVAS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { logChange } = useBnConfigAudit();

  useEffect(() => {
    let cancelled = false;
    if (!versionId) { setCanvas(EMPTY_CANVAS); return; }
    setLoading(true);
    (async () => {
      try {
        const { data, error } = await db
          .from('bn_product_version')
          .select('eligibility_config')
          .eq('id', versionId)
          .maybeSingle();
        if (error) throw error;
        const cfg = (data?.eligibility_config ?? {}) as any;
        const c = (cfg[CANVAS_KEY] as BuilderCanvas | undefined) ?? EMPTY_CANVAS;
        if (!cancelled) {
          setCanvas({ ...EMPTY_CANVAS, ...c, sections: { ...EMPTY_CANVAS.sections, ...(c.sections ?? {}) } });
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
      // Read current full eligibility_config to preserve executable rules
      const { data } = await db.from('bn_product_version').select('eligibility_config').eq('id', versionId).maybeSingle();
      const before = (data?.eligibility_config ?? {}) as any;
      const after = { ...before, [CANVAS_KEY]: { ...next, updatedAt: new Date().toISOString() } };
      const { error } = await db.from('bn_product_version').update({ eligibility_config: after }).eq('id', versionId);
      if (error) throw error;
      setCanvas(after[CANVAS_KEY]);
      logChange?.({
        entity_type: 'bn_product_version',
        entity_id: versionId,
        action: 'UPDATE',
        before: before[CANVAS_KEY] ?? null,
        after: after[CANVAS_KEY],
        note: 'Builder canvas updated',
      } as any);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? 'Save failed');
      throw e;
    } finally {
      setSaving(false);
    }
  }, [versionId, logChange]);

  return { canvas, setCanvas, save, loading, saving, error };
}
