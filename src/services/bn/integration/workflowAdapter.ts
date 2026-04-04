/**
 * BN Workflow Adapter — Bridges to existing workflow engine
 * 
 * Uses the platform's workflow_instances and workflow_steps tables.
 */
import { supabase } from '@/integrations/supabase/client';
import type { IBnWorkflowAdapter, WorkflowStartRequest, WorkflowState } from './contracts';

const db = supabase as any;

export const bnWorkflowAdapter: IBnWorkflowAdapter = {
  async startWorkflow(request: WorkflowStartRequest): Promise<{ instanceId: string }> {
    const { data, error } = await db
      .from('workflow_instances')
      .insert({
        template_key: request.templateKey,
        entity_type: request.entityType,
        entity_id: request.entityId,
        context: request.context,
        initiated_by: request.initiatedBy,
        status: 'active',
        current_step: 'intake',
        step_number: 1,
      })
      .select('id')
      .single();

    if (error) throw error;
    return { instanceId: data.id };
  },

  async completeStep(instanceId, stepId, outcome, data): Promise<void> {
    const { error } = await db
      .from('workflow_step_logs')
      .insert({
        instance_id: instanceId,
        step_id: stepId,
        outcome,
        data: data || {},
        completed_at: new Date().toISOString(),
      });
    if (error) throw error;
  },

  async getWorkflowStatus(instanceId): Promise<WorkflowState> {
    const { data, error } = await db
      .from('workflow_instances')
      .select('id, template_key, current_step, step_number, status, created_at')
      .eq('id', instanceId)
      .single();

    if (error) throw error;

    // Fetch step history
    const { data: steps } = await db
      .from('workflow_step_logs')
      .select('step_id, completed_at, outcome, actor')
      .eq('instance_id', instanceId)
      .order('completed_at');

    return {
      instanceId: data.id,
      templateKey: data.template_key,
      currentStep: data.current_step,
      stepNumber: data.step_number,
      status: data.status,
      startedAt: data.created_at,
      history: (steps ?? []).map((s: any) => ({
        step: s.step_id,
        completedAt: s.completed_at,
        outcome: s.outcome,
        actor: s.actor || '',
      })),
    };
  },

  async cancelWorkflow(instanceId, reason): Promise<void> {
    const { error } = await db
      .from('workflow_instances')
      .update({ status: 'cancelled', cancel_reason: reason })
      .eq('id', instanceId);
    if (error) throw error;
  },
};
