import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ProcessNotificationsRequest {
  instance_id: string;
  step_id: string;
  action_id?: string;
  trigger: 'step_entry' | 'action_taken';
  action_label?: string;
  action_by?: string;
  action_by_name?: string;
  comments?: string;
}

interface NotificationConfig {
  id: string;
  notification_type: string;
  template_id: string | null;
  module_id: string | null;
  recipient_type: string;
  recipient_role_id: string | null;
  is_enabled: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: ProcessNotificationsRequest = await req.json();
    const { instance_id, step_id, action_id, trigger, action_label, action_by, action_by_name, comments } = body;

    console.log('Processing notifications:', { instance_id, step_id, action_id, trigger });

    if (!instance_id || !step_id || !trigger) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: instance_id, step_id, trigger' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch workflow instance context
    const { data: instance, error: instanceError } = await supabase
      .from('workflow_instances')
      .select('id, workflow_id, workflow_name, source_module, source_record_id, source_record_name, started_by, started_by_name')
      .eq('id', instance_id)
      .single();

    if (instanceError || !instance) {
      console.error('Instance not found:', instanceError);
      return new Response(
        JSON.stringify({ error: 'Workflow instance not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch step info (including step_number and workflow_id for next_step resolution)
    const { data: step, error: stepError } = await supabase
      .from('workflow_steps')
      .select('id, step_name, step_number, workflow_id, approver_type, approver_role_ids, approver_designation_ids, approver_user_ids')
      .eq('id', step_id)
      .single();

    if (stepError || !step) {
      console.error('Step not found:', stepError);
      return new Response(
        JSON.stringify({ error: 'Workflow step not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch notification configurations based on trigger type
    let configs: NotificationConfig[] = [];

    if (trigger === 'step_entry') {
      const { data, error } = await supabase
        .from('workflow_step_notifications')
        .select('id, notification_type, template_id, module_id, recipient_type, recipient_role_id, is_enabled')
        .eq('step_id', step_id)
        .eq('is_enabled', true);

      if (error) {
        console.error('Error fetching step notifications:', error);
      } else {
        configs = (data || []) as NotificationConfig[];
      }
    } else if (trigger === 'action_taken' && action_id) {
      const { data, error } = await supabase
        .from('workflow_action_notifications')
        .select('id, notification_type, template_id, module_id, recipient_type, recipient_role_id, is_enabled')
        .eq('action_id', action_id)
        .eq('is_enabled', true);

      if (error) {
        console.error('Error fetching action notifications:', error);
      } else {
        configs = (data || []) as NotificationConfig[];
      }
    }

    console.log(`Found ${configs.length} notification configs for ${trigger}`);

    if (configs.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No notification configs found', notifications_sent: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build notification link based on source_module
    let notificationLink = '/workflow/approvals';
    const sm = instance.source_module;
    if (sm === 'card_machine_change' || sm === 'CardMachineChange' || sm === 'batch_card_machine_change') {
      notificationLink = '/cashier/card-machine-change-requests';
    } else if (sm === 'receipt_cancel' || sm === 'ReceiptCancel') {
      notificationLink = '/cashier/receipt-cancel-requests';
    } else if (sm === 'insured_person_registration') {
      notificationLink = `/ip-registration/list?highlight=${instance.source_record_id}`;
    }

    let totalNotified = 0;
    const results: Array<{ config_id: string; recipient_count: number; channels: string[] }> = [];

    for (const config of configs) {
      // Resolve recipients based on recipient_type
      const recipientUserIds = await resolveRecipients(
        supabase, config.recipient_type, config.recipient_role_id, step, instance
      );

      if (recipientUserIds.length === 0) {
        console.log(`No recipients found for config ${config.id} (recipient_type: ${config.recipient_type})`);
        continue;
      }

      // Build notification content
      const { title, bodyText } = buildNotificationContent(
        trigger, config.recipient_type, instance, step, action_label, action_by_name || action_by, comments
      );

      // Dispatch based on notification_type
      const notifType = config.notification_type.toLowerCase();

      if (notifType === 'in-app' || notifType === 'in_app' || notifType === 'inapp') {
        const inAppNotifs = recipientUserIds.map(userId => ({
          user_id: userId,
          title,
          body: bodyText,
          link: notificationLink,
          is_read: false,
        }));

        const { error: inAppError } = await supabase
          .from('in_app_notifications')
          .insert(inAppNotifs);

        if (inAppError) {
          console.error('In-app notification insert failed:', inAppError);
        } else {
          totalNotified += recipientUserIds.length;
        }
      }

      if (notifType === 'email' || notifType === 'in-app' || notifType === 'in_app' || notifType === 'inapp') {
        // Queue email notifications
        const emailLogs = recipientUserIds.map(userId => ({
          recipient_user_id: userId,
          channel: 'email',
          subject: title,
          body: bodyText,
          status: 'pending',
          trigger_source: trigger === 'step_entry' ? 'workflow_approval' : 'workflow_result',
          metadata: {
            workflow_instance_id: instance_id,
            step_id,
            action_id: action_id || null,
            trigger,
            notification_config_id: config.id,
          },
        }));

        supabase.from('notification_logs').insert(emailLogs).then(({ error }: any) => {
          if (error) console.log('Email log insert failed (non-critical):', error);
        });
      }

      if (notifType === 'sms') {
        const smsLogs = recipientUserIds.map(userId => ({
          recipient_user_id: userId,
          channel: 'sms',
          subject: title,
          body: bodyText,
          status: 'pending',
          trigger_source: trigger === 'step_entry' ? 'workflow_approval' : 'workflow_result',
          metadata: {
            workflow_instance_id: instance_id,
            step_id,
            action_id: action_id || null,
            trigger,
            notification_config_id: config.id,
          },
        }));

        supabase.from('notification_logs').insert(smsLogs).then(({ error }: any) => {
          if (error) console.log('SMS log insert failed (non-critical):', error);
        });
      }

      if (notifType === 'push') {
        const pushLogs = recipientUserIds.map(userId => ({
          recipient_user_id: userId,
          channel: 'push',
          subject: title,
          body: bodyText,
          status: 'pending',
          trigger_source: trigger === 'step_entry' ? 'workflow_approval' : 'workflow_result',
          metadata: {
            workflow_instance_id: instance_id,
            step_id,
            action_id: action_id || null,
            trigger,
            notification_config_id: config.id,
          },
        }));

        supabase.from('notification_logs').insert(pushLogs).then(({ error }: any) => {
          if (error) console.log('Push log insert failed (non-critical):', error);
        });
      }

      results.push({
        config_id: config.id,
        recipient_count: recipientUserIds.length,
        channels: [config.notification_type],
      });
    }

    console.log(`Notification processing complete: ${totalNotified} recipients notified`);

    return new Response(
      JSON.stringify({
        success: true,
        notifications_sent: totalNotified,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in workflow-process-notifications:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Resolve recipient user IDs based on recipient_type.
 * Supports all approver types including reporting_manager, department_head, etc.
 * via a task-based fallback that reuses the already-resolved assignment.
 */
async function resolveRecipients(
  supabase: any,
  recipientType: string,
  recipientRoleId: string | null,
  step: any,
  instance: any,
): Promise<string[]> {
  const userIds: string[] = [];

  if (recipientType === 'initiator') {
    if (instance.started_by) {
      userIds.push(instance.started_by);
    }
    return userIds;
  }

  if (recipientType === 'specific_role' && recipientRoleId) {
    return await resolveUsersByRoleIds(supabase, [recipientRoleId]);
  }

  // step_approver / current_step_approver: resolve from current step's approver config
  if (recipientType === 'step_approver' || recipientType === 'current_step_approver') {
    await resolveFromStepConfig(supabase, step, userIds);

    // Fallback: resolve from already-assigned workflow tasks
    // Handles reporting_manager, department_head, and any future approver types
    if (userIds.length === 0) {
      console.log(`Standard resolution returned 0 users for approver_type="${step.approver_type}", falling back to task assignment lookup`);
      await resolveFromWorkflowTasks(supabase, instance.id, step.id, userIds);
    }
  }

  // next_step_approver: resolve from the NEXT step's approver config (not current)
  if (recipientType === 'next_step_approver') {
    const nextStepNumber = (step.step_number || 0) + 1;
    const workflowId = step.workflow_id || instance.workflow_id;

    console.log(`Resolving next_step_approver: looking for step_number=${nextStepNumber} in workflow=${workflowId}`);

    const { data: nextStep } = await supabase
      .from('workflow_steps')
      .select('id, step_name, step_number, approver_type, approver_role_ids, approver_designation_ids, approver_user_ids')
      .eq('workflow_id', workflowId)
      .eq('step_number', nextStepNumber)
      .single();

    if (nextStep) {
      console.log(`Found next step: "${nextStep.step_name}" (approver_type: ${nextStep.approver_type})`);
      await resolveFromStepConfig(supabase, nextStep, userIds);

      // Fallback: resolve from already-assigned workflow tasks for next step
      if (userIds.length === 0) {
        console.log(`Standard resolution returned 0 users for next step approver_type="${nextStep.approver_type}", falling back to task lookup`);
        await resolveFromWorkflowTasks(supabase, instance.id, nextStep.id, userIds);
      }
    } else {
      console.log(`No next step found at step_number=${nextStepNumber}, falling back to current step task lookup`);
      // If no next step exists, try resolving from current step tasks as a last resort
      await resolveFromWorkflowTasks(supabase, instance.id, step.id, userIds);
    }
  }

  return [...new Set(userIds)];
}

/**
 * Resolve users from a step's approver configuration (role, user, designation).
 */
async function resolveFromStepConfig(supabase: any, step: any, userIds: string[]): Promise<void> {
  const approverType = step.approver_type || 'role';

  if (approverType === 'user' || approverType === 'specific_users') {
    if (step.approver_user_ids && step.approver_user_ids.length > 0) {
      const { data: validProfiles } = await supabase
        .from('profiles')
        .select('id')
        .in('id', step.approver_user_ids);
      if (validProfiles) {
        userIds.push(...validProfiles.map((p: any) => p.id));
      }
    }
  } else if (approverType === 'role') {
    if (step.approver_role_ids && step.approver_role_ids.length > 0) {
      const resolved = await resolveUsersByRoleIds(supabase, step.approver_role_ids);
      userIds.push(...resolved);
    }
  } else if (approverType === 'designation') {
    if (step.approver_designation_ids && step.approver_designation_ids.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id')
        .in('designation_id', step.approver_designation_ids);
      if (profiles) {
        userIds.push(...profiles.map((p: any) => p.id));
      }
    }
  }
  // For reporting_manager, department_head, etc. — the function intentionally does nothing here;
  // the caller will fall back to resolveFromWorkflowTasks.
}

/**
 * Fallback: resolve recipients from already-assigned workflow tasks.
 * This handles reporting_manager, department_head, and any custom approver types
 * where the task creation logic has already resolved and assigned the correct user.
 */
async function resolveFromWorkflowTasks(supabase: any, instanceId: string, stepId: string, userIds: string[]): Promise<void> {
  const { data: tasks, error } = await supabase
    .from('workflow_tasks')
    .select('assigned_to')
    .eq('instance_id', instanceId)
    .eq('step_id', stepId)
    .in('status', ['Pending', 'InProgress']);

  if (error) {
    console.error('Error fetching workflow tasks for fallback resolution:', error);
    return;
  }

  if (tasks && tasks.length > 0) {
    const assignedIds = tasks.map((t: any) => t.assigned_to).filter(Boolean);
    console.log(`Task-based fallback resolved ${assignedIds.length} recipient(s) from workflow_tasks`);
    userIds.push(...assignedIds);
  } else {
    console.log(`No pending/in-progress tasks found for instance=${instanceId}, step=${stepId}`);
  }
}

/**
 * Resolve user IDs from role IDs using both AspNetUserRoles and user_roles tables.
 */
async function resolveUsersByRoleIds(supabase: any, roleIds: string[]): Promise<string[]> {
  const userIds: string[] = [];

  // 1. Check AspNetUserRoles (legacy)
  const { data: aspNetUserRoles } = await supabase
    .from('AspNetUserRoles')
    .select('UserId')
    .in('RoleId', roleIds);

  if (aspNetUserRoles && aspNetUserRoles.length > 0) {
    const aspNetUserIdSet = [...new Set(aspNetUserRoles.map((ur: any) => ur.UserId))];
    const { data: aspNetUsers } = await supabase
      .from('AspNetUsers')
      .select('Id, Email')
      .in('Id', aspNetUserIdSet);

    if (aspNetUsers && aspNetUsers.length > 0) {
      const emails = aspNetUsers.map((u: any) => u.Email).filter(Boolean);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email')
        .in('email', emails);
      if (profiles) {
        userIds.push(...profiles.map((p: any) => p.id));
      }
    }
  }

  // 2. Check roles table + user_roles
  const { data: rolesData } = await supabase
    .from('roles')
    .select('id, role_name')
    .in('id', roleIds);

  if (rolesData && rolesData.length > 0) {
    const allowedRoleNames = rolesData.map((r: any) => r.role_name);
    const { data: simpleUserRoles } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .in('role', allowedRoleNames);

    if (simpleUserRoles && simpleUserRoles.length > 0) {
      const ids = [...new Set(simpleUserRoles.map((ur: any) => ur.user_id))];
      const { data: validProfiles } = await supabase
        .from('profiles')
        .select('id')
        .in('id', ids);
      if (validProfiles) {
        userIds.push(...validProfiles.map((p: any) => p.id));
      }
    }
  }

  return [...new Set(userIds)];
}

/**
 * Build notification title and body based on trigger type and recipient.
 */
function buildNotificationContent(
  trigger: string,
  recipientType: string,
  instance: any,
  step: any,
  actionLabel?: string,
  actionByName?: string,
  comments?: string,
): { title: string; bodyText: string } {
  const workflowName = instance.workflow_name || 'Workflow';
  const recordRef = instance.source_record_name || instance.source_record_id || '';

  if (trigger === 'step_entry') {
    return {
      title: `Pending Approval: ${workflowName}`,
      bodyText: `Application "${recordRef}" requires your approval at step: ${step.step_name}`,
    };
  }

  // action_taken
  if (recipientType === 'initiator') {
    const label = actionLabel === 'Cancelled' ? 'cancelled/disregarded' : (actionLabel || 'completed').toLowerCase();
    return {
      title: `Request ${actionLabel || 'Completed'}: ${workflowName}`,
      bodyText: `Your request "${recordRef}" has been ${label} by ${actionByName || 'an approver'}.${comments ? ` Comments: ${comments}` : ''}`,
    };
  }

  // For next_step_approver on action_taken (transition notification)
  return {
    title: `Pending Approval: ${workflowName}`,
    bodyText: `Application "${recordRef}" requires your approval at step: ${step.step_name}`,
  };
}
