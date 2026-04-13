import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface NotifyRequesterRequest {
  instance_id: string;
  action: 'Approved' | 'Rejected' | 'Cancelled';
  action_by: string;       // user_code of the person who performed the action
  action_by_name?: string; // full name (optional)
  comments?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: NotifyRequesterRequest = await req.json();
    const { instance_id, action, action_by, action_by_name, comments } = body;

    console.log('Notifying requester:', { instance_id, action, action_by });

    if (!instance_id || !action) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: instance_id, action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Look up the workflow instance to find the requester
    const { data: instance, error: instanceError } = await supabase
      .from('workflow_instances')
      .select('started_by, started_by_name, workflow_id, source_module, source_record_id, source_record_name')
      .eq('id', instance_id)
      .single();

    if (instanceError || !instance) {
      console.error('Error fetching workflow instance:', instanceError);
      return new Response(
        JSON.stringify({ error: 'Workflow instance not found', details: instanceError }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requesterId = instance.started_by;
    if (!requesterId) {
      console.log('No requester (started_by) found on workflow instance');
      return new Response(
        JSON.stringify({ success: true, message: 'No requester found', notified: false }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get workflow name
    let workflowName = 'Workflow';
    const { data: workflow } = await supabase
      .from('workflows')
      .select('name')
      .eq('id', instance.workflow_id)
      .single();
    if (workflow?.name) workflowName = workflow.name;

    // Build notification message
    const recordRef = instance.source_record_name || instance.source_record_id || '';
    const actionLabel = action === 'Cancelled' ? 'cancelled/disregarded' : action.toLowerCase();
    const title = `Request ${action}: ${workflowName}`;
    const body_text = `Your request "${recordRef}" has been ${actionLabel} by ${action_by_name || action_by || 'an approver'}.${comments ? ` Comments: ${comments}` : ''}`;

    // Build link based on source_module
    let link = '/workflow/approvals';
    const sm = instance.source_module;
    if (sm === 'card_machine_change' || sm === 'CardMachineChange') {
      link = '/cashier/card-machine-change-requests';
    } else if (sm === 'receipt_cancel' || sm === 'ReceiptCancel') {
      link = '/cashier/receipt-cancel-requests';
    } else if (sm === 'insured_person_registration') {
      link = `/ip-registration/list?highlight=${instance.source_record_id}`;
    }

    // Insert in-app notification
    const { error: inAppError } = await supabase
      .from('in_app_notifications')
      .insert({
        user_id: requesterId,
        title,
        body: body_text,
        link,
        is_read: false,
      });

    if (inAppError) {
      console.error('Error inserting in-app notification:', inAppError);
    }

    // Queue email notification (fire-and-forget)
    await supabase
      .from('notification_logs')
      .insert({
        user_id: requesterId,
        type: 'workflow_result',
        channel: 'email',
        subject: title,
        body: body_text,
        status: 'pending',
        metadata: {
          workflow_instance_id: instance_id,
          action,
          action_by,
          source_module: instance.source_module,
          source_record_id: instance.source_record_id,
        },
      })
      .then(({ error }) => {
        if (error) console.log('Email log insert failed (non-critical):', error);
      });

    console.log(`Requester ${requesterId} notified: ${action}`);

    return new Response(
      JSON.stringify({
        success: true,
        notified: true,
        requester_id: requesterId,
        action,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in workflow-notify-requester:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
