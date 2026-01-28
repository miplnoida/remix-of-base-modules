import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface NotifyApproversRequest {
  instance_id: string;
  step_id: string;
  task_id: string;
  workflow_name: string;
  source_record_name: string;
  source_module: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Create Supabase client with service role for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: NotifyApproversRequest = await req.json();
    const { instance_id, step_id, task_id, workflow_name, source_record_name, source_module } = body;

    console.log('Notifying approvers for workflow:', { instance_id, step_id, task_id, workflow_name });

    if (!instance_id || !step_id || !task_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: instance_id, step_id, task_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get step configuration
    const { data: step, error: stepError } = await supabase
      .from('workflow_steps')
      .select('step_name, approver_type, approver_role_ids, approver_designation_ids, approver_user_ids')
      .eq('id', step_id)
      .single();

    if (stepError || !step) {
      console.error('Error fetching step:', stepError);
      return new Response(
        JSON.stringify({ error: 'Step not found', details: stepError }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Step configuration:', step);

    // Collect all approver user IDs
    // These will be profile IDs (from profiles table which syncs with auth.users)
    const approverUserIds: string[] = [];
    const approverType = step.approver_type || 'role';

    if (approverType === 'user' || approverType === 'specific_users') {
      // Directly use approver_user_ids (assuming they are profile IDs)
      if (step.approver_user_ids && step.approver_user_ids.length > 0) {
        // Verify these IDs exist in profiles
        const { data: validProfiles } = await supabase
          .from('profiles')
          .select('id')
          .in('id', step.approver_user_ids);
        
        if (validProfiles) {
          approverUserIds.push(...validProfiles.map(p => p.id));
        }
      }
    } else if (approverType === 'role') {
      // Find users with matching roles - check both role systems
      if (step.approver_role_ids && step.approver_role_ids.length > 0) {
        // 1. Check AspNetUserRoles table (legacy ASP.NET Identity)
        const { data: aspNetUserRoles, error: aspNetRolesError } = await supabase
          .from('AspNetUserRoles')
          .select('UserId')
          .in('RoleId', step.approver_role_ids);

        if (!aspNetRolesError && aspNetUserRoles && aspNetUserRoles.length > 0) {
          const aspNetUserIds = [...new Set(aspNetUserRoles.map(ur => ur.UserId))];
          
          // Get emails from AspNetUsers
          const { data: aspNetUsers } = await supabase
            .from('AspNetUsers')
            .select('Id, Email')
            .in('Id', aspNetUserIds);

          if (aspNetUsers && aspNetUsers.length > 0) {
            const emails = aspNetUsers.map(u => u.Email).filter(Boolean);
            
            // Find matching profiles by email
            const { data: profiles } = await supabase
              .from('profiles')
              .select('id, email')
              .in('email', emails);

            if (profiles) {
              approverUserIds.push(...profiles.map(p => p.id));
            }
          }
        }

        // 2. Check user_roles table (app_role enum based)
        // First get role names from the 'roles' table for the given role IDs
        const { data: rolesTableData } = await supabase
          .from('roles')
          .select('id, role_name')
          .in('id', step.approver_role_ids);

        if (rolesTableData && rolesTableData.length > 0) {
          const allowedRoleNames = rolesTableData.map(r => r.role_name);
          
          // Find users in user_roles with matching role names
          const { data: simpleUserRoles } = await supabase
            .from('user_roles')
            .select('user_id, role')
            .in('role', allowedRoleNames);

          if (simpleUserRoles && simpleUserRoles.length > 0) {
            // Verify these user_ids exist in profiles
            const userIdsFromSimpleRoles = [...new Set(simpleUserRoles.map(ur => ur.user_id))];
            const { data: validProfiles } = await supabase
              .from('profiles')
              .select('id')
              .in('id', userIdsFromSimpleRoles);

            if (validProfiles) {
              approverUserIds.push(...validProfiles.map(p => p.id));
            }
          }
        }

        // Remove duplicates
        const uniqueApproverIds = [...new Set(approverUserIds)];
        approverUserIds.length = 0;
        approverUserIds.push(...uniqueApproverIds);
      }
    } else if (approverType === 'designation') {
      // Find users with matching designations (profiles have designation_id)
      if (step.approver_designation_ids && step.approver_designation_ids.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id')
          .in('designation_id', step.approver_designation_ids);

        if (!profilesError && profiles) {
          approverUserIds.push(...profiles.map(p => p.id));
        }
      }
    }

    console.log('Approver user IDs:', approverUserIds);

    if (approverUserIds.length === 0) {
      console.log('No approvers found for this step');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No approvers found for this step configuration',
          notified_count: 0 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the link for the notification based on source_module
    let notificationLink = `/workflow/approvals`;
    if (source_module === 'insured_person_registration') {
      // Get the unique_uuid for IP registration
      const { data: instance } = await supabase
        .from('workflow_instances')
        .select('source_record_id')
        .eq('id', instance_id)
        .single();
      
      if (instance?.source_record_id) {
        notificationLink = `/ip-registration/list?highlight=${instance.source_record_id}`;
      }
    }

    // Create notifications for each approver
    const notifications = approverUserIds.map(userId => ({
      user_id: userId,
      title: `Pending Approval: ${workflow_name}`,
      body: `Application "${source_record_name}" requires your approval at step: ${step.step_name}`,
      link: notificationLink,
      is_read: false,
    }));

    const { error: insertError } = await supabase
      .from('in_app_notifications')
      .insert(notifications);

    if (insertError) {
      console.error('Error inserting notifications:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create notifications', details: insertError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully notified ${approverUserIds.length} approvers`);

    // Optionally, queue email notifications via notification_logs
    // This can be extended based on notification preferences
    const emailLogs = approverUserIds.map(userId => ({
      user_id: userId,
      type: 'workflow_approval',
      channel: 'email',
      subject: `Pending Approval: ${workflow_name}`,
      body: `Application "${source_record_name}" requires your approval at step: ${step.step_name}. Please log in to the system to review and take action.`,
      status: 'pending',
      metadata: {
        workflow_instance_id: instance_id,
        task_id: task_id,
        step_id: step_id,
      },
    }));

    // Insert email logs (fire and forget - don't fail if this fails)
    await supabase
      .from('notification_logs')
      .insert(emailLogs)
      .then(({ error }) => {
        if (error) {
          console.log('Email notification logging failed (non-critical):', error);
        }
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        notified_count: approverUserIds.length,
        approver_ids: approverUserIds,
        step_name: step.step_name,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in workflow-notify-approvers:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
