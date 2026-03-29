import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useCanManageAllBatches } from '@/hooks/usePaymentModuleConfig';
import { useQuery } from '@tanstack/react-query';
import { useBatchBehaviorConfig } from '@/hooks/useBatchBehaviorConfig';
import { format } from 'date-fns';
import { toast } from 'sonner';

export interface BatchRow {
  batch_number: string;
  batch_status: string | null;
  batch_date: string | null;
  entered_by: string | null;
  office_code: string | null;
  offset_amount: number | null;
  balance_forward: number | null;
}

export function useBatchSelection(options?: { skipDateFilter?: boolean }) {
  const skipDateFilter = options?.skipDateFilter ?? false;
  const [searchParams] = useSearchParams();
  const batchParam = searchParams.get('batch');
  const { profile } = useSupabaseAuth();
  const { canManageAllBatches, isLoading: permLoading } = useCanManageAllBatches();

  const [selectedBatch, setSelectedBatch] = useState<BatchRow | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [resolved, setResolved] = useState(false);

  // Fetch open batches based on permission
  const { data: openBatches, isLoading: batchesLoading } = useQuery({
    queryKey: ['batch-selection-open', canManageAllBatches, profile?.user_code],
    enabled: !permLoading,
    queryFn: async () => {
      let query = supabase
        .from('cn_batch')
        .select('batch_number, batch_status, batch_date, entered_by, office_code, offset_amount, balance_forward')
        .eq('batch_status', 'O')
        .order('batch_date', { ascending: false });

      if (!canManageAllBatches && profile?.user_code) {
        query = query.eq('entered_by', profile.user_code);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as BatchRow[];
    },
  });

  // Load batch from URL param
  useEffect(() => {
    if (batchParam && !selectedBatch && !resolved) {
      supabase
        .from('cn_batch')
        .select('batch_number, batch_status, batch_date, entered_by, office_code, offset_amount, balance_forward')
        .eq('batch_number', batchParam)
        .single()
        .then(({ data, error }) => {
          if (error || !data) {
            toast.error('Batch not found. Please select a batch.');
            setResolved(true);
            // Will fall through to auto-select / popup logic
          } else {
            setSelectedBatch(data as BatchRow);
            setResolved(true);
          }
        });
    }
  }, [batchParam, selectedBatch, resolved]);

  // Auto-select or show popup once batches are loaded and no URL param
  useEffect(() => {
    if (resolved || batchParam || batchesLoading || permLoading || !openBatches) return;

    if (openBatches.length === 1) {
      // Auto-select the single batch
      setSelectedBatch(openBatches[0]);
      setResolved(true);
    } else if (openBatches.length > 1) {
      setShowPopup(true);
      setResolved(true);
    } else {
      // No batches available
      setResolved(true);
    }
  }, [openBatches, batchesLoading, permLoading, batchParam, resolved]);

  const selectBatch = useCallback((batch: BatchRow) => {
    setSelectedBatch(batch);
    setShowPopup(false);
  }, []);

  const changeBatch = useCallback(() => {
    setSelectedBatch(null);
    setShowPopup(true);
  }, []);

  const { allowCurrentDatePaymentInOldBatch, isLoading: behaviorLoading } = useBatchBehaviorConfig();

  // Date-filtered batches: if config disallows current-date payments in old batches, only show today's batches
  const filteredOpenBatches = useMemo(() => {
    if (!openBatches) return [];
    if (skipDateFilter || allowCurrentDatePaymentInOldBatch) return openBatches;
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    return openBatches.filter(b => {
      if (!b.batch_date) return false;
      const batchDateStr = b.batch_date.substring(0, 10);
      return batchDateStr === todayStr;
    });
  }, [openBatches, skipDateFilter, allowCurrentDatePaymentInOldBatch]);

  const isLoading = permLoading || batchesLoading || behaviorLoading || (!resolved && !!batchParam);
  const noBatchesAvailable = resolved && !selectedBatch && !showPopup && (filteredOpenBatches.length === 0);
  const isReady = !!selectedBatch;

  return {
    selectedBatch,
    openBatches: filteredOpenBatches,
    showPopup,
    setShowPopup,
    selectBatch,
    changeBatch,
    isLoading,
    isReady,
    noBatchesAvailable,
    canManageAllBatches,
  };
}
