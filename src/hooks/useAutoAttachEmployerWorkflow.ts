import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { triggerEmployerRegistrationWorkflow } from '@/services/employerWorkflowTriggerService';
import { toast } from 'sonner';

/**
 * Auto-attaches the "Employer Registration Approval Workflow" to any
 * pending (status 'P') employer that lacks a workflow instance.
 * Runs once when the pending employers list is available.
 */
export function useAutoAttachEmployerWorkflow(
  employers: any[],
  userId: string | undefined,
  refetch: () => void,
  isActive: boolean
) {
  const processedRef = useRef(false);
  const processingRef = useRef(false);

  // Reset when tab changes away
  useEffect(() => {
    if (!isActive) {
      processedRef.current = false;
    }
  }, [isActive]);

  useEffect(() => {
    if (!isActive || !employers.length || processedRef.current || processingRef.current) return;

    const pendingEmployers = employers.filter(e => e.status === 'P');
    if (pendingEmployers.length === 0) {
      processedRef.current = true;
      return;
    }

    const regnos = pendingEmployers.map(e => e.regno).filter(Boolean) as string[];
    if (regnos.length === 0) {
      processedRef.current = true;
      return;
    }

    const attach = async () => {
      processingRef.current = true;
      try {
        // Batch check which already have workflow instances
        const { data: existing } = await supabase
          .from('workflow_instances')
          .select('source_record_id')
          .eq('source_module', 'employers')
          .in('source_record_id', regnos);

        const existingSet = new Set((existing || []).map(r => r.source_record_id));
        const missing = pendingEmployers.filter(e => !existingSet.has(e.regno));

        if (missing.length === 0) {
          processedRef.current = true;
          processingRef.current = false;
          return;
        }

        let attached = 0;
        // Process sequentially
        for (const emp of missing) {
          try {
            const result = await triggerEmployerRegistrationWorkflow(
              emp.regno,
              emp.name || emp.trade_name || emp.regno,
              userId
            );
            if (result) attached++;
          } catch (err) {
            console.error(`Failed to attach workflow to ${emp.regno}:`, err);
          }
        }

        if (attached > 0) {
          toast.success(`Attached workflow to ${attached} employer(s)`);
          refetch();
        }
      } catch (err) {
        console.error('Auto-attach workflow error:', err);
      } finally {
        processedRef.current = true;
        processingRef.current = false;
      }
    };

    attach();
  }, [isActive, employers, userId, refetch]);
}
