/**
 * useIARiskCategories
 * Master list of Risk Categories used by the Risk Assessment screen
 * (and any other screens that need a unified taxonomy).
 *
 * Concurrency safety:
 * - DB has UNIQUE(name_norm) WHERE is_active. Two users adding the same value
 *   simultaneously will collapse to one row at the database. The loser's
 *   .upsert() returns no row, so we fall back to a SELECT by name_norm and
 *   return the existing row.
 *
 * Realtime:
 * - Subscribes to ia_risk_categories changes so a category added by another
 *   session appears immediately without a page refresh.
 */
import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuditFields } from '@/hooks/useAuditTrail';
import { logAudit } from '@/services/systemLoggerService';

export interface IARiskCategory {
  id: string;
  name: string;
  name_norm?: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
  created_by?: string | null;
  updated_by?: string | null;
  source_screen?: string | null;
}

const QUERY_KEY = ['ia_risk_categories'] as const;
const NAME_REGEX = /^[A-Za-z0-9 &/_\-]+$/;
const MAX_LEN = 100;

export function validateCategoryName(raw: string): { ok: true; value: string } | { ok: false; reason: string } {
  const value = (raw || '').trim().replace(/\s+/g, ' ');
  if (!value) return { ok: false, reason: 'Category name cannot be empty.' };
  if (value.length > MAX_LEN) return { ok: false, reason: `Category name must be ${MAX_LEN} characters or less.` };
  if (!NAME_REGEX.test(value)) {
    return { ok: false, reason: 'Only letters, digits, spaces and the symbols & / _ - are allowed.' };
  }
  return { ok: true, value };
}

export function useIARiskCategories() {
  const queryClient = useQueryClient();

  // Realtime sync (mounted once per consumer; cheap because supabase channels dedupe internally per name)
  useEffect(() => {
    const channel = supabase
      .channel('ia_risk_categories_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ia_risk_categories' },
        () => queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<IARiskCategory[]> => {
      const { data, error } = await supabase
        .from('ia_risk_categories' as any)
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    staleTime: 30_000,
  });
}

export function useCreateIARiskCategory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { userCode } = useAuditFields();

  return useMutation({
    mutationFn: async (rawName: string): Promise<IARiskCategory> => {
      const v = validateCategoryName(rawName);
      if (!v.ok) {
        throw new Error(v.reason);
      }
      const name = v.value;
      const norm = name.toLowerCase();

      // Short-circuit: existing (case-insensitive) row
      const { data: existing } = await supabase
        .from('ia_risk_categories' as any)
        .select('*')
        .eq('name_norm', norm)
        .eq('is_active', true)
        .maybeSingle();
      if (existing) return existing as any;

      // Insert; rely on UNIQUE(name_norm) for race protection
      const insertPayload = {
        name,
        description: null,
        is_active: true,
        sort_order: 0,
        created_by: userCode || 'SYSTEM',
        updated_by: userCode || 'SYSTEM',
        source_screen: 'audit/risk-assessment',
      };
      const { data: inserted, error: insErr } = await supabase
        .from('ia_risk_categories' as any)
        .insert(insertPayload)
        .select()
        .maybeSingle();

      if (insErr) {
        // 23505 = unique_violation: another session won the race; fetch theirs
        if ((insErr as any).code === '23505') {
          const { data: winner, error: winErr } = await supabase
            .from('ia_risk_categories' as any)
            .select('*')
            .eq('name_norm', norm)
            .eq('is_active', true)
            .single();
          if (winErr) throw winErr;
          return winner as any;
        }
        throw insErr;
      }
      if (!inserted) {
        // No row returned — fall back to lookup
        const { data: winner, error: winErr } = await supabase
          .from('ia_risk_categories' as any)
          .select('*')
          .eq('name_norm', norm)
          .eq('is_active', true)
          .single();
        if (winErr) throw winErr;
        return winner as any;
      }

      // Non-blocking audit log
      void logAudit({
        module: 'InternalAudit',
        entity_type: 'ia_risk_categories',
        entity_id: (inserted as any).id,
        severity: 'info',
        payload_json: {
          action: 'CREATE',
          source_screen: 'audit/risk-assessment',
          name,
          user_code: userCode,
        },
      } as any).catch(() => { /* swallow */ });

      return inserted as any;
    },
    onSuccess: (row) => {
      // Optimistic cache merge
      queryClient.setQueryData<IARiskCategory[]>(QUERY_KEY, (prev) => {
        const list = prev ? [...prev] : [];
        if (!list.some((c) => c.id === row.id)) list.push(row);
        return list.sort((a, b) => a.name.localeCompare(b.name));
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
    onError: (e: any) => {
      const friendly = e?.message?.includes('not configured')
        ? 'Unable to save category. Please try again.'
        : (e?.message || 'Failed to create risk category.');
      toast({ title: 'Could not add category', description: friendly, variant: 'destructive' });
    },
  });
}
