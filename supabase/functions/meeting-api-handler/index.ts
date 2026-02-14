import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

interface MeetingApiRequest {
  action: 'schedule' | 'process_outcome' | 'call_external_api' | 'get_meetings' | 'get_meeting_details' | 'start_meeting' | 'cancel_meeting' | 'reschedule_meeting' | 'close_meeting_approved' | 'close_meeting_rejected'
  meetingId?: string
  applicationReference?: string
  workflowInstanceId?: string
  workflowId?: string
  stepId?: string
  actionConfigId?: string
  meetingType?: string
  meetingDate?: string
  meetingTime?: string
  contactPerson?: string
  contactEmail?: string
  contactPhone?: string
  officeAddress?: string
  remarks?: string
  outcome?: string
  newDate?: string
  newTime?: string
  apiConfigId?: string
  applicationData?: Record<string, any>
  // New fields for department-based scheduling
  officeCode?: string
  departmentId?: string
  assignedUserId?: string
  filters?: {
    status?: string
    dateFrom?: string
    dateTo?: string
    meetingType?: string
  }
}

// Helper to resolve placeholders in templates
function resolvePlaceholders(template: string | object, context: Record<string, any>): any {
  const templateStr = typeof template === 'object' ? JSON.stringify(template) : template
  
  let resolved = templateStr
  
  // Replace all {{placeholder}} patterns
  const placeholderRegex = /\{\{([^}]+)\}\}/g
  resolved = resolved.replace(placeholderRegex, (match, key) => {
    const trimmedKey = key.trim()
    const value = context[trimmedKey]
    return value !== undefined ? String(value) : match
  })
  
  if (typeof template === 'object') {
    try {
      return JSON.parse(resolved)
    } catch {
      return resolved
    }
  }
  
  return resolved
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    let userId: string | null = null
    let userName: string | null = null

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user } } = await supabase.auth.getUser(token)
      if (user) {
        userId = user.id
        // Get user profile for name
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, user_code')
          .eq('id', user.id)
          .single()
        userName = profile?.full_name || profile?.user_code || user.email
      }
    }

    const body: MeetingApiRequest = await req.json()
    console.log('Meeting API request:', body.action)

    switch (body.action) {
      case 'schedule': {
        // Schedule a new meeting
        const { data, error } = await supabase.rpc('schedule_meeting', {
          p_application_reference: body.applicationReference,
          p_workflow_instance_id: body.workflowInstanceId || null,
          p_workflow_id: body.workflowId || null,
          p_step_id: body.stepId || null,
          p_action_config_id: body.actionConfigId || null,
          p_meeting_type: body.meetingType || 'General',
          p_meeting_date: body.meetingDate,
          p_meeting_time: body.meetingTime,
          p_contact_person: body.contactPerson,
          p_contact_email: body.contactEmail || null,
          p_contact_phone: body.contactPhone || null,
          p_office_address: body.officeAddress || null,
          p_remarks: body.remarks || null,
          p_user_id: userId,
          p_user_name: userName
        })

        if (error) {
          console.error('Schedule meeting error:', error)
          throw error
        }

        // Update meeting with new department fields if provided
        if (data?.meeting_id && (body.officeCode || body.departmentId || body.assignedUserId)) {
          await supabase
            .from('meetings')
            .update({
              office_code: body.officeCode || null,
              department_id: body.departmentId || null,
              assigned_user_id: body.assignedUserId || null,
            })
            .eq('id', data.meeting_id)
        }

        // Send in-app notification to assigned person if configured
        if (body.assignedUserId && body.workflowId) {
          const { data: actionConfig } = await supabase
            .from('workflow_action_configurations')
            .select('notify_assigned_person')
            .eq('workflow_id', body.workflowId)
            .eq('step_id', body.stepId)
            .single()

          if (actionConfig?.notify_assigned_person) {
            await supabase.from('in_app_notifications').insert({
              user_id: body.assignedUserId,
              title: 'New Meeting Scheduled',
              message: `A meeting has been scheduled for application ${body.applicationReference} on ${body.meetingDate} at ${body.meetingTime}.`,
              type: 'meeting',
              priority: 'normal',
              link: `/meetings/manage`,
              metadata: { meeting_id: data.meeting_id, meeting_reference: data.meeting_reference },
            })
          }
        }

        // Check if API notification is configured
        if (body.actionConfigId) {
          const { data: config } = await supabase
            .from('workflow_action_configurations')
            .select('requires_api_integration, api_config_id')
            .eq('id', body.actionConfigId)
            .single()

          if (config?.requires_api_integration && config?.api_config_id) {
            await callExternalApi(supabase, data.meeting_id, config.api_config_id, 'SCHEDULED', {
              applicationReference: body.applicationReference,
              meetingReference: data.meeting_reference,
              meetingDate: body.meetingDate,
              meetingTime: body.meetingTime,
              officeAddress: body.officeAddress,
              remarks: body.remarks
            })
          }
        }

        return new Response(JSON.stringify(data), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'start_meeting': {
        // Start a meeting - change status to InProgress
        if (!body.meetingId) {
          throw new Error('Meeting ID is required')
        }

        // Update meeting status
        const { error: updateError } = await supabase
          .from('meetings')
          .update({
            status: 'InProgress',
            updated_at: new Date().toISOString(),
            updated_by: userName?.substring(0, 10) || null
          })
          .eq('id', body.meetingId)

        if (updateError) throw updateError

        // Add history record
        const { data: meeting } = await supabase
          .from('meetings')
          .select('status, meeting_reference')
          .eq('id', body.meetingId)
          .single()

        await supabase.from('meeting_history').insert({
          meeting_id: body.meetingId,
          old_status: 'Scheduled',
          new_status: 'InProgress',
          action_taken: 'STARTED',
          remarks: 'Meeting started',
          performed_by: userId,
          performed_by_name: userName
        })

        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Meeting started',
          meeting_reference: meeting?.meeting_reference
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'cancel_meeting': {
        // Cancel a meeting and create a new workflow instance
        if (!body.meetingId) {
          throw new Error('Meeting ID is required')
        }
        if (!body.remarks) {
          throw new Error('Cancellation remarks are required')
        }

        // Get meeting details
        const { data: meeting, error: meetingError } = await supabase
          .from('meetings')
          .select('*, workflow_instances(workflow_id, workflow_name, source_module, source_record_id, primary_table, primary_key_column, primary_key_value)')
          .eq('id', body.meetingId)
          .single()

        if (meetingError) throw meetingError

        // Update meeting status to Cancelled
        await supabase
          .from('meetings')
          .update({
            status: 'Cancelled',
            outcome: 'Cancel',
            outcome_remarks: body.remarks,
            closed_by: userId,
            closed_by_name: userName,
            closed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            updated_by: userName?.substring(0, 10) || null
          })
          .eq('id', body.meetingId)

        // Add history record
        await supabase.from('meeting_history').insert({
          meeting_id: body.meetingId,
          old_status: meeting.status,
          new_status: 'Cancelled',
          action_taken: 'CANCELLED',
          outcome: 'Cancel',
          remarks: body.remarks,
          performed_by: userId,
          performed_by_name: userName
        })

        // Close the existing workflow instance
        if (meeting.workflow_instance_id) {
          await supabase
            .from('workflow_instances')
            .update({
              status: 'Cancelled',
              completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', meeting.workflow_instance_id)

          // Close any pending tasks
          await supabase
            .from('workflow_tasks')
            .update({
              status: 'Cancelled',
              completed_at: new Date().toISOString()
            })
            .eq('instance_id', meeting.workflow_instance_id)
            .in('status', ['Pending', 'InProgress', 'Paused'])
        }

        // Create a new workflow instance for the same application
        let newInstanceId: string | null = null
        const workflowInstance = meeting.workflow_instances
        
        if (workflowInstance) {
          // Get the first step of the workflow
          const { data: firstStep } = await supabase
            .from('workflow_steps')
            .select('id, step_name')
            .eq('workflow_id', workflowInstance.workflow_id)
            .order('step_number', { ascending: true })
            .limit(1)
            .single()

          if (firstStep) {
            // Create new workflow instance
            const { data: newInstance, error: instanceError } = await supabase
              .from('workflow_instances')
              .insert({
                workflow_id: workflowInstance.workflow_id,
                workflow_name: workflowInstance.workflow_name,
                source_module: workflowInstance.source_module,
                source_record_id: workflowInstance.source_record_id,
                current_step_id: firstStep.id,
                status: 'InProgress',
                started_by: userId,
                started_by_name: userName,
                primary_table: workflowInstance.primary_table,
                primary_key_column: workflowInstance.primary_key_column,
                primary_key_value: workflowInstance.primary_key_value,
                metadata: { restarted_from_cancelled_meeting: meeting.meeting_reference }
              })
              .select('id')
              .single()

            if (!instanceError && newInstance) {
              newInstanceId = newInstance.id

              // Create first task
              await supabase.from('workflow_tasks').insert({
                instance_id: newInstance.id,
                step_id: firstStep.id,
                step_name: firstStep.step_name,
                status: 'Pending'
              })

              // Log the workflow restart
              await supabase.from('workflow_logs').insert({
                instance_id: newInstance.id,
                step_id: firstStep.id,
                step_name: firstStep.step_name,
                action: 'Workflow Restarted',
                new_status: 'InProgress',
                performed_by: userId,
                performed_by_name: userName,
                comments: `Workflow restarted after meeting ${meeting.meeting_reference} was cancelled`
              })
            }
          }
        }

        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Meeting cancelled and workflow restarted',
          new_instance_id: newInstanceId
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'reschedule_meeting': {
        // Reschedule a meeting
        if (!body.meetingId) {
          throw new Error('Meeting ID is required')
        }
        if (!body.newDate || !body.newTime) {
          throw new Error('New date and time are required')
        }
        if (!body.remarks) {
          throw new Error('Rescheduling remarks are required')
        }

        // Get current meeting details
        const { data: meeting, error: meetingError } = await supabase
          .from('meetings')
          .select('*')
          .eq('id', body.meetingId)
          .single()

        if (meetingError) throw meetingError

        // Update current meeting to Rescheduled status
        await supabase
          .from('meetings')
          .update({
            status: 'Rescheduled',
            outcome: 'Reschedule',
            outcome_remarks: body.remarks,
            closed_by: userId,
            closed_by_name: userName,
            closed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            updated_by: userName?.substring(0, 10) || null
          })
          .eq('id', body.meetingId)

        // Add history for old meeting
        await supabase.from('meeting_history').insert({
          meeting_id: body.meetingId,
          old_status: meeting.status,
          new_status: 'Rescheduled',
          action_taken: 'RESCHEDULED',
          outcome: 'Reschedule',
          old_date: meeting.meeting_date,
          old_time: meeting.meeting_time,
          new_date: body.newDate,
          new_time: body.newTime,
          remarks: body.remarks,
          performed_by: userId,
          performed_by_name: userName
        })

        // Generate new meeting reference
        const { data: refData } = await supabase.rpc('generate_meeting_reference')
        const newMeetingRef = refData || `MTG-${Date.now()}`

        // Create new meeting with updated contact/office info from body params
        const { data: newMeeting, error: newMeetingError } = await supabase
          .from('meetings')
          .insert({
            meeting_reference: newMeetingRef,
            application_reference: meeting.application_reference,
            workflow_instance_id: meeting.workflow_instance_id,
            workflow_id: meeting.workflow_id,
            step_id: meeting.step_id,
            action_config_id: meeting.action_config_id,
            meeting_type: meeting.meeting_type,
            status: 'Scheduled',
            meeting_date: body.newDate,
            meeting_time: body.newTime,
            contact_person: body.contactPerson || meeting.contact_person,
            contact_email: body.contactEmail || meeting.contact_email,
            contact_phone: body.contactPhone || meeting.contact_phone,
            office_address: body.officeAddress || meeting.office_address,
            office_code: body.officeCode || meeting.office_code,
            department_id: body.departmentId || meeting.department_id,
            assigned_user_id: body.assignedUserId || meeting.assigned_user_id,
            remarks: body.remarks,
            parent_meeting_id: meeting.id,
            reschedule_count: (meeting.reschedule_count || 0) + 1,
            scheduled_by: userId,
            scheduled_by_name: userName,
            created_by: userName?.substring(0, 10) || null
          })
          .select()
          .single()

        if (newMeetingError) throw newMeetingError

        // Add history for new meeting
        await supabase.from('meeting_history').insert({
          meeting_id: newMeeting.id,
          new_status: 'Scheduled',
          action_taken: 'RESCHEDULED_FROM',
          new_date: body.newDate,
          new_time: body.newTime,
          remarks: `Rescheduled from ${meeting.meeting_reference}`,
          performed_by: userId,
          performed_by_name: userName
        })

        // Update workflow instance metadata with new meeting reference
        if (meeting.workflow_instance_id) {
          const { data: instance } = await supabase
            .from('workflow_instances')
            .select('metadata')
            .eq('id', meeting.workflow_instance_id)
            .single()

          const updatedMetadata = {
            ...(instance?.metadata || {}),
            current_meeting_id: newMeeting.id,
            current_meeting_reference: newMeetingRef
          }

          await supabase
            .from('workflow_instances')
            .update({ metadata: updatedMetadata, updated_at: new Date().toISOString() })
            .eq('id', meeting.workflow_instance_id)
        }

        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Meeting rescheduled successfully',
          new_meeting_id: newMeeting.id,
          new_meeting_reference: newMeetingRef
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'close_meeting_approved': {
        // Close meeting with approval - save application data and execute workflow
        if (!body.meetingId) {
          throw new Error('Meeting ID is required')
        }

        // Get meeting and workflow details
        const { data: meeting, error: meetingError } = await supabase
          .from('meetings')
          .select('*, workflow_instances(*)')
          .eq('id', body.meetingId)
          .single()

        if (meetingError) throw meetingError

        // Save application data if provided
        if (body.applicationData && meeting.workflow_instances) {
          const instance = meeting.workflow_instances
          if (instance.primary_table && instance.primary_key_column && instance.primary_key_value) {
            // Update the primary record with edited data
            const { error: updateError } = await supabase
              .from(instance.primary_table)
              .update({
                ...body.applicationData,
                updated_at: new Date().toISOString(),
                updated_by: userId
              })
              .eq(instance.primary_key_column, instance.primary_key_value)

            if (updateError) {
              console.error('Failed to save application data:', updateError)
              // Don't throw - continue with approval
            }
          }
        }

        // Update meeting status
        await supabase
          .from('meetings')
          .update({
            status: 'Closed',
            outcome: 'ClosedWithApproval',
            outcome_remarks: body.remarks || 'Approved during meeting',
            closed_by: userId,
            closed_by_name: userName,
            closed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            updated_by: userName?.substring(0, 10) || null
          })
          .eq('id', body.meetingId)

        // Add history record
        await supabase.from('meeting_history').insert({
          meeting_id: body.meetingId,
          old_status: meeting.status,
          new_status: 'Closed',
          action_taken: 'APPROVED',
          outcome: 'ClosedWithApproval',
          remarks: body.remarks || 'Application approved',
          performed_by: userId,
          performed_by_name: userName
        })

        // Complete the workflow instance
        if (meeting.workflow_instance_id) {
          await supabase
            .from('workflow_instances')
            .update({
              status: 'Approved',
              completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', meeting.workflow_instance_id)

          // Complete any pending tasks
          await supabase
            .from('workflow_tasks')
            .update({
              status: 'Completed',
              completed_at: new Date().toISOString()
            })
            .eq('instance_id', meeting.workflow_instance_id)
            .in('status', ['Pending', 'InProgress', 'Paused'])

          // Log the workflow completion
          await supabase.from('workflow_logs').insert({
            instance_id: meeting.workflow_instance_id,
            step_id: meeting.step_id,
            action: 'Approved',
            new_status: 'Approved',
            performed_by: userId,
            performed_by_name: userName,
            comments: `Application approved during meeting ${meeting.meeting_reference}`
          })

          // Trigger API if configured
          if (meeting.action_config_id) {
            const { data: outcomeConfig } = await supabase
              .from('workflow_action_outcomes')
              .select('triggers_api, api_config_id')
              .eq('action_config_id', meeting.action_config_id)
              .eq('outcome_code', 'ClosedWithApproval')
              .single()

            if (outcomeConfig?.triggers_api && outcomeConfig?.api_config_id) {
              await callExternalApi(supabase, body.meetingId, outcomeConfig.api_config_id, 'APPROVED', {
                applicationReference: meeting.application_reference,
                meetingReference: meeting.meeting_reference,
                outcome: 'Approved',
                remarks: body.remarks
              })
            }
          }
        }

        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Application approved successfully'
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'close_meeting_rejected': {
        // Close meeting with rejection
        if (!body.meetingId) {
          throw new Error('Meeting ID is required')
        }
        if (!body.remarks) {
          throw new Error('Rejection remarks are required')
        }

        // Get meeting details
        const { data: meeting, error: meetingError } = await supabase
          .from('meetings')
          .select('*')
          .eq('id', body.meetingId)
          .single()

        if (meetingError) throw meetingError

        // Update meeting status
        await supabase
          .from('meetings')
          .update({
            status: 'Rejected',
            outcome: 'ClosedWithRejection',
            outcome_remarks: body.remarks,
            closed_by: userId,
            closed_by_name: userName,
            closed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            updated_by: userName?.substring(0, 10) || null
          })
          .eq('id', body.meetingId)

        // Add history record
        await supabase.from('meeting_history').insert({
          meeting_id: body.meetingId,
          old_status: meeting.status,
          new_status: 'Rejected',
          action_taken: 'REJECTED',
          outcome: 'ClosedWithRejection',
          remarks: body.remarks,
          performed_by: userId,
          performed_by_name: userName
        })

        // Complete the workflow instance as rejected
        if (meeting.workflow_instance_id) {
          await supabase
            .from('workflow_instances')
            .update({
              status: 'Rejected',
              completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', meeting.workflow_instance_id)

          // Complete any pending tasks
          await supabase
            .from('workflow_tasks')
            .update({
              status: 'Completed',
              completed_at: new Date().toISOString()
            })
            .eq('instance_id', meeting.workflow_instance_id)
            .in('status', ['Pending', 'InProgress', 'Paused'])

          // Log the workflow rejection
          await supabase.from('workflow_logs').insert({
            instance_id: meeting.workflow_instance_id,
            step_id: meeting.step_id,
            action: 'Rejected',
            new_status: 'Rejected',
            performed_by: userId,
            performed_by_name: userName,
            comments: body.remarks
          })

          // Trigger API if configured
          if (meeting.action_config_id) {
            const { data: outcomeConfig } = await supabase
              .from('workflow_action_outcomes')
              .select('triggers_api, api_config_id')
              .eq('action_config_id', meeting.action_config_id)
              .eq('outcome_code', 'ClosedWithRejection')
              .single()

            if (outcomeConfig?.triggers_api && outcomeConfig?.api_config_id) {
              await callExternalApi(supabase, body.meetingId, outcomeConfig.api_config_id, 'REJECTED', {
                applicationReference: meeting.application_reference,
                meetingReference: meeting.meeting_reference,
                outcome: 'Rejected',
                remarks: body.remarks
              })
            }
          }
        }

        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Application rejected'
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'process_outcome': {
        // Process meeting outcome
        const { data, error } = await supabase.rpc('process_meeting_outcome', {
          p_meeting_id: body.meetingId,
          p_outcome: body.outcome,
          p_remarks: body.remarks || null,
          p_new_date: body.newDate || null,
          p_new_time: body.newTime || null,
          p_user_id: userId,
          p_user_name: userName
        })

        if (error) {
          console.error('Process outcome error:', error)
          throw error
        }

        // Get meeting for API notification check
        const { data: meeting } = await supabase
          .from('meetings')
          .select('action_config_id, application_reference, meeting_reference')
          .eq('id', body.meetingId)
          .single()

        if (meeting?.action_config_id) {
          // Check if outcome triggers API
          const { data: outcomeConfig } = await supabase
            .from('workflow_action_outcomes')
            .select('triggers_api, api_config_id')
            .eq('action_config_id', meeting.action_config_id)
            .eq('outcome_code', body.outcome)
            .single()

          if (outcomeConfig?.triggers_api && outcomeConfig?.api_config_id) {
            await callExternalApi(supabase, body.meetingId!, outcomeConfig.api_config_id, body.outcome!, {
              applicationReference: meeting.application_reference,
              meetingReference: meeting.meeting_reference,
              outcome: body.outcome,
              remarks: body.remarks
            })
          }
        }

        return new Response(JSON.stringify(data), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'get_meetings': {
        // Get meetings with filters
        let query = supabase
          .from('meetings')
          .select(`
            *,
            workflow_definitions(name),
            workflow_steps(step_name)
          `)
          .order('meeting_date', { ascending: true })
          .order('meeting_time', { ascending: true })

        if (body.filters?.status) {
          query = query.eq('status', body.filters.status)
        }
        if (body.filters?.meetingType) {
          query = query.eq('meeting_type', body.filters.meetingType)
        }
        if (body.filters?.dateFrom) {
          query = query.gte('meeting_date', body.filters.dateFrom)
        }
        if (body.filters?.dateTo) {
          query = query.lte('meeting_date', body.filters.dateTo)
        }

        const { data, error } = await query

        if (error) throw error

        return new Response(JSON.stringify({ meetings: data }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'get_meeting_details': {
        // Get single meeting with full details
        const { data: meeting, error: meetingError } = await supabase
          .from('meetings')
          .select(`
            *,
            workflow_definitions(name, description),
            workflow_steps(step_name, description),
            workflow_action_configurations(
              meeting_type,
              requires_api_integration
            )
          `)
          .eq('id', body.meetingId)
          .single()

        if (meetingError) throw meetingError

        // Get meeting history
        const { data: history } = await supabase
          .from('meeting_history')
          .select('*')
          .eq('meeting_id', body.meetingId)
          .order('performed_at', { ascending: false })

        // Get available outcomes
        let outcomes: any[] = []
        if (meeting.action_config_id) {
          const { data: outcomeData } = await supabase
            .from('workflow_action_outcomes')
            .select('*')
            .eq('action_config_id', meeting.action_config_id)
            .eq('is_active', true)
            .order('display_order')
          outcomes = outcomeData || []
        }

        // Get API logs
        const { data: apiLogs } = await supabase
          .from('meeting_api_logs')
          .select('*')
          .eq('meeting_id', body.meetingId)
          .order('created_at', { ascending: false })

        return new Response(JSON.stringify({
          meeting,
          history: history || [],
          outcomes,
          apiLogs: apiLogs || []
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'call_external_api': {
        // Manually trigger external API call
        if (!body.meetingId || !body.apiConfigId) {
          throw new Error('Meeting ID and API Config ID are required')
        }

        const { data: meeting } = await supabase
          .from('meetings')
          .select('application_reference, meeting_reference, meeting_date, meeting_time, office_address, remarks')
          .eq('id', body.meetingId)
          .single()

        const result = await callExternalApi(supabase, body.meetingId, body.apiConfigId, 'MANUAL', {
          applicationReference: meeting?.application_reference,
          meetingReference: meeting?.meeting_reference,
          meetingDate: meeting?.meeting_date,
          meetingTime: meeting?.meeting_time,
          officeAddress: meeting?.office_address,
          remarks: meeting?.remarks
        })

        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
  } catch (error: unknown) {
    console.error('Meeting API error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

// Helper function to call external APIs
async function callExternalApi(
  supabase: any,
  meetingId: string,
  apiConfigId: string,
  actionType: string,
  context: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  const startTime = Date.now()

  try {
    // Get API configuration
    const { data: apiConfig, error: configError } = await supabase
      .from('workflow_api_configurations')
      .select('*')
      .eq('id', apiConfigId)
      .single()

    if (configError || !apiConfig) {
      throw new Error('API configuration not found')
    }

    // Get secret if configured
    let apiKey: string | null = null
    if (apiConfig.secret_name) {
      // Secrets should be stored in Supabase Vault or environment
      apiKey = Deno.env.get(apiConfig.secret_name) || null
    }

    // Resolve placeholders in body template
    const resolvedBody = apiConfig.body_template 
      ? resolvePlaceholders(apiConfig.body_template, context)
      : null

    // Resolve placeholders in headers
    const resolvedHeaders: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    
    if (apiConfig.headers_template) {
      const parsedHeaders = typeof apiConfig.headers_template === 'string' 
        ? JSON.parse(apiConfig.headers_template) 
        : apiConfig.headers_template
      
      for (const [key, value] of Object.entries(parsedHeaders)) {
        resolvedHeaders[key] = resolvePlaceholders(String(value), { ...context, apiKey })
      }
    }

    // If API key exists and no Authorization header set, add it
    if (apiKey && !resolvedHeaders['Authorization']) {
      resolvedHeaders['Authorization'] = `Bearer ${apiKey}`
    }

    // Resolve URL placeholders
    const resolvedUrl = resolvePlaceholders(apiConfig.endpoint_url, context)

    console.log(`Calling external API: ${apiConfig.http_method} ${resolvedUrl}`)

    // Make the API call with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), (apiConfig.timeout_seconds || 30) * 1000)

    const fetchOptions: RequestInit = {
      method: apiConfig.http_method,
      headers: resolvedHeaders,
      signal: controller.signal
    }

    if (resolvedBody && ['POST', 'PUT', 'PATCH'].includes(apiConfig.http_method)) {
      fetchOptions.body = typeof resolvedBody === 'string' ? resolvedBody : JSON.stringify(resolvedBody)
    }

    const response = await fetch(resolvedUrl, fetchOptions)
    clearTimeout(timeoutId)

    const responseText = await response.text()
    let responseJson: any = null
    try {
      responseJson = JSON.parse(responseText)
    } catch {
      responseJson = { raw: responseText }
    }

    const duration = Date.now() - startTime
    const isSuccess = response.ok

    // Log the API call
    await supabase.from('meeting_api_logs').insert({
      meeting_id: meetingId,
      api_config_id: apiConfigId,
      action_type: actionType,
      request_url: resolvedUrl,
      request_method: apiConfig.http_method,
      request_headers: resolvedHeaders,
      request_payload: resolvedBody,
      response_status: response.status,
      response_payload: responseJson,
      is_success: isSuccess,
      error_message: isSuccess ? null : responseText,
      duration_ms: duration
    })

    // Update meeting API notification status
    if (isSuccess) {
      await supabase
        .from('meetings')
        .update({
          api_notified: true,
          api_notification_at: new Date().toISOString()
        })
        .eq('id', meetingId)
    }

    return { success: isSuccess }
  } catch (error: unknown) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Log the failed attempt
    await supabase.from('meeting_api_logs').insert({
      meeting_id: meetingId,
      api_config_id: apiConfigId,
      action_type: actionType,
      is_success: false,
      error_message: errorMessage,
      duration_ms: duration
    })

    console.error('External API call failed:', errorMessage)
    return { success: false, error: errorMessage }
  }
}
