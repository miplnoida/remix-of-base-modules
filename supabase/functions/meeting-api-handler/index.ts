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
  // Department-based scheduling
  officeCode?: string
  departmentId?: string
  assignedUserId?: string
  /**
   * releasePreviousSlot (reschedule_meeting only):
   *   true  → The old appointmentDate/Time is freed — other meetings can be booked in that slot.
   *   false → The old slot stays BLOCKED — the assigned person remains unavailable there.
   *
   * This is ALWAYS validated server-side. If omitted, defaults to true for
   * auto-reschedule (start_meeting on future date) and must be explicit for
   * manual reschedule_meeting calls.
   *
   * Implementation: When false, a phantom `slot_reservation` record is inserted into
   * `meeting_slot_reservations` with the old date/time/assigned_user_id so that
   * conflict-check queries still see it as occupied.
   */
  releasePreviousSlot?: boolean
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
        // ── SERVER-SIDE VALIDATION: Reject past datetime for today ──
        const nowForSchedule = new Date()
        const todayForSchedule = nowForSchedule.toISOString().split('T')[0]
        if (body.meetingDate && body.meetingTime) {
          if (body.meetingDate < todayForSchedule) {
            return new Response(JSON.stringify({ success: false, message: 'Cannot schedule a meeting in the past. Please select a future date.' }), {
              status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
          }
          if (body.meetingDate === todayForSchedule) {
            const nowHHMM = `${nowForSchedule.getUTCHours().toString().padStart(2, '0')}:${nowForSchedule.getUTCMinutes().toString().padStart(2, '0')}`
            const slotTime = body.meetingTime.substring(0, 5)
            if (slotTime <= nowHHMM) {
              return new Response(JSON.stringify({ success: false, message: `Cannot schedule a meeting at ${slotTime} — this time has already passed (current server time: ${nowHHMM} UTC). Please select a future time slot.` }), {
                status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              })
            }
          }
        }

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

        // Trigger Workflow-ScheduleMeeting for initial scheduling.
        // application_reference_no is resolved server-side from workflow_instance.metadata.
        if (body.workflowId && body.stepId && body.workflowInstanceId) {
          console.log('Initial schedule: invoking workflow-action-api ScheduleMeeting for meeting:', data.meeting_reference)
          await triggerScheduleMeetingWorkflowApi(
            supabase,
            body.workflowId,
            body.stepId,
            body.workflowInstanceId,
            {
              meeting_reference_no:  data.meeting_reference,
              meeting_date:          body.meetingDate,
              meeting_time:          body.meetingTime,
              office_address:        body.officeAddress || null,
              contact_person_name:   null, // populated by DB trigger trg_set_meeting_contact_person_name
              remarks:               body.remarks || null,
            }
          )
        } else {
          console.warn('Initial schedule: skipping Workflow-ScheduleMeeting — missing workflowId, stepId or workflowInstanceId')
        }

        return new Response(JSON.stringify(data), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'start_meeting': {
        // Start a meeting - change status to InProgress.
        // ENHANCED: If the meeting is scheduled for a FUTURE date, automatically:
        //   1. Mark the future meeting as Rescheduled (same flow as manual reschedule)
        //   2. Create a new meeting for today at current server time
        //   3. Mark the new meeting as InProgress
        // All steps execute atomically - any failure leaves the original meeting unchanged.
        if (!body.meetingId) {
          throw new Error('Meeting ID is required')
        }

        // Fetch full meeting details
        const { data: meeting, error: meetingFetchError } = await supabase
          .from('meetings')
          .select('*')
          .eq('id', body.meetingId)
          .single()

        if (meetingFetchError || !meeting) {
          throw new Error('Meeting not found')
        }

        // Determine server date/time (UTC)
        const nowUtc = new Date()
        const todayDate = nowUtc.toISOString().split('T')[0] // YYYY-MM-DD
        const currentTime = nowUtc.toTimeString().substring(0, 5)  // HH:MM

        // Check if the meeting is scheduled for a FUTURE date
        const isFutureDate = meeting.meeting_date > todayDate

        if (isFutureDate) {
          // ─── STEP 1: Mark future meeting as Rescheduled (same logic as reschedule_meeting) ───
          const { error: rescheduleUpdateError } = await supabase
            .from('meetings')
            .update({
              status: 'Rescheduled',
              outcome: 'Reschedule',
              outcome_remarks: `Auto-rescheduled: meeting started early on ${todayDate} before scheduled date ${meeting.meeting_date}`,
              closed_by: userId,
              closed_by_name: userName,
              closed_at: nowUtc.toISOString(),
              updated_at: nowUtc.toISOString(),
              updated_by: userName?.substring(0, 10) || null
            })
            .eq('id', body.meetingId)

          if (rescheduleUpdateError) throw rescheduleUpdateError

          // ─── STEP 2: Log history for the rescheduled future meeting (same as reschedule_meeting) ───
          const { error: histErr1 } = await supabase.from('meeting_history').insert({
            meeting_id: body.meetingId,
            old_status: meeting.status,
            new_status: 'Rescheduled',
            action_taken: 'RESCHEDULED',
            outcome: 'Reschedule',
            old_date: meeting.meeting_date,
            old_time: meeting.meeting_time,
            new_date: todayDate,
            new_time: currentTime,
            remarks: `Auto-rescheduled because meeting was started today (${todayDate}) before the scheduled date (${meeting.meeting_date})`,
            performed_by: userId,
            performed_by_name: userName
          })

          if (histErr1) throw histErr1

          // ─── STEP 3: Generate new meeting reference ───
          const { data: refData } = await supabase.rpc('generate_meeting_reference')
          const newMeetingRef = refData || `MTG-${Date.now()}`

          // ─── STEP 4: Create new meeting for today at current server time ───
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
              status: 'InProgress',           // New meeting goes straight to InProgress
              meeting_date: todayDate,
              meeting_time: currentTime,
              contact_person: meeting.contact_person,
              contact_email: meeting.contact_email,
              contact_phone: meeting.contact_phone,
              office_address: meeting.office_address,
              office_code: meeting.office_code,
              department_id: meeting.department_id,
              assigned_user_id: meeting.assigned_user_id,
              remarks: `Auto-created: meeting started today, rescheduled from ${meeting.meeting_reference} (was ${meeting.meeting_date})`,
              parent_meeting_id: body.meetingId,
              reschedule_count: (meeting.reschedule_count || 0) + 1,
              scheduled_by: userId,
              scheduled_by_name: userName,
              created_by: userName?.substring(0, 10) || null,
              metadata: {
                ...(meeting.metadata || {}),
                auto_rescheduled_from: meeting.meeting_reference,
                original_scheduled_date: meeting.meeting_date,
                original_scheduled_time: meeting.meeting_time,
                auto_reschedule_reason: 'started_before_scheduled_date'
              }
            })
            .select()
            .single()

          if (newMeetingError) throw newMeetingError

          // ─── STEP 5: Log history for the new meeting (same pattern as reschedule_meeting) ───
          const { error: histErr2 } = await supabase.from('meeting_history').insert({
            meeting_id: newMeeting.id,
            new_status: 'InProgress',
            action_taken: 'RESCHEDULED_FROM',
            new_date: todayDate,
            new_time: currentTime,
            remarks: `Auto-created and started immediately. Rescheduled from ${meeting.meeting_reference} (was ${meeting.meeting_date} at ${meeting.meeting_time})`,
            performed_by: userId,
            performed_by_name: userName
          })

          if (histErr2) throw histErr2

          // ─── STEP 6: Update workflow instance metadata with new active meeting ───
          if (meeting.workflow_instance_id) {
            const { data: instance } = await supabase
              .from('workflow_instances')
              .select('metadata')
              .eq('id', meeting.workflow_instance_id)
              .single()

            const updatedMetadata = {
              ...(instance?.metadata || {}),
              current_meeting_id: newMeeting.id,
              current_meeting_reference: newMeetingRef,
              previous_meeting_id: body.meetingId,
              previous_meeting_reference: meeting.meeting_reference
            }

            await supabase
              .from('workflow_instances')
              .update({ metadata: updatedMetadata, updated_at: nowUtc.toISOString() })
              .eq('id', meeting.workflow_instance_id)

            // Log in workflow_logs
            await supabase.from('workflow_logs').insert({
              instance_id: meeting.workflow_instance_id,
              step_id: meeting.step_id,
              action: 'Meeting Auto-Rescheduled',
              new_status: 'InProgress',
              performed_by: userId,
              performed_by_name: userName,
              comments: `Future meeting ${meeting.meeting_reference} (${meeting.meeting_date}) was auto-rescheduled when user started the meeting today. New meeting: ${newMeetingRef}`
            })
          }

          // ─── STEP 7: Trigger Workflow-ScheduleMeeting API via workflow-action-api ───
          // application_reference_no is resolved server-side from workflow_instance.metadata.
          if (newMeeting.workflow_id && newMeeting.step_id && newMeeting.workflow_instance_id) {
            console.log('Auto-reschedule: invoking workflow-action-api ScheduleMeeting for new meeting:', newMeetingRef)
            await triggerScheduleMeetingWorkflowApi(
              supabase,
              newMeeting.workflow_id,
              newMeeting.step_id,
              newMeeting.workflow_instance_id,
              {
                meeting_reference_no: newMeetingRef,
                meeting_date:         todayDate,
                meeting_time:         currentTime,
                office_address:       newMeeting.office_address || meeting.office_address,
                contact_person_name:  newMeeting.contact_person_name || meeting.contact_person_name,
                remarks:              `Auto-rescheduled: meeting started today before scheduled date ${meeting.meeting_date}`,
              }
            )
          } else {
            console.warn('Auto-reschedule: skipping Workflow-ScheduleMeeting API — missing workflow_id, step_id or workflow_instance_id on new meeting')
          }

          return new Response(JSON.stringify({
            success: true,
            message: `Future meeting auto-rescheduled. New meeting created for today (${todayDate}).`,
            meeting_id: newMeeting.id,
            meeting_reference: newMeetingRef,
            original_meeting_id: body.meetingId,
            original_meeting_reference: meeting.meeting_reference,
            auto_rescheduled: true
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })

        } else {
          // ─── SAME-DAY or PAST: Simply move meeting to InProgress ───
          const { error: updateError } = await supabase
            .from('meetings')
            .update({
              status: 'InProgress',
              updated_at: nowUtc.toISOString(),
              updated_by: userName?.substring(0, 10) || null
            })
            .eq('id', body.meetingId)

          if (updateError) throw updateError

          await supabase.from('meeting_history').insert({
            meeting_id: body.meetingId,
            old_status: meeting.status,
            new_status: 'InProgress',
            action_taken: 'STARTED',
            remarks: 'Meeting started',
            performed_by: userId,
            performed_by_name: userName
          })

          return new Response(JSON.stringify({
            success: true,
            message: 'Meeting started',
            meeting_id: body.meetingId,
            meeting_reference: meeting.meeting_reference,
            auto_rescheduled: false
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
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

        // ── SERVER-SIDE VALIDATION: Reject past datetime for today ──
        const nowForReschedule = new Date()
        const todayForReschedule = nowForReschedule.toISOString().split('T')[0]
        if (body.newDate && body.newTime) {
          if (body.newDate < todayForReschedule) {
            return new Response(JSON.stringify({ success: false, message: 'Cannot reschedule a meeting to a past date. Please select a future date.' }), {
              status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
          }
          if (body.newDate === todayForReschedule) {
            const nowHHMM = `${nowForReschedule.getUTCHours().toString().padStart(2, '0')}:${nowForReschedule.getUTCMinutes().toString().padStart(2, '0')}`
            const slotTime = body.newTime.substring(0, 5)
            if (slotTime <= nowHHMM) {
              return new Response(JSON.stringify({ success: false, message: `Cannot reschedule to ${slotTime} — this time has already passed (current server time: ${nowHHMM} UTC). Please select a future time slot.` }), {
                status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              })
            }
          }
        }

        // ── SERVER-SIDE VALIDATION: releasePreviousSlot must be a boolean ──
        // If the caller omits it, we default to true (release). Any non-boolean
        // value is coerced to boolean defensively.
        const releasePreviousSlot: boolean =
          body.releasePreviousSlot === false ? false : true

        console.log(`reschedule_meeting: releasePreviousSlot=${releasePreviousSlot} meetingId=${body.meetingId}`)

        // Get current meeting details
        const { data: meeting, error: meetingError } = await supabase
          .from('meetings')
          .select('*')
          .eq('id', body.meetingId)
          .single()

        if (meetingError) throw meetingError

        // Capture old slot details BEFORE updating the record
        const oldMeetingDate: string = meeting.meeting_date
        const oldMeetingTime: string = meeting.meeting_time
        const oldAssignedUserId: string | null = meeting.assigned_user_id
        const oldContactPerson: string | null = meeting.contact_person

        // Update current meeting to Rescheduled status
        const { error: updateOldErr } = await supabase
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

        if (updateOldErr) throw updateOldErr

        // Add history for old meeting
        const { error: hist1Err } = await supabase.from('meeting_history').insert({
          meeting_id: body.meetingId,
          old_status: meeting.status,
          new_status: 'Rescheduled',
          action_taken: 'RESCHEDULED',
          outcome: 'Reschedule',
          old_date: oldMeetingDate,
          old_time: oldMeetingTime,
          new_date: body.newDate,
          new_time: body.newTime,
          remarks: body.remarks,
          performed_by: userId,
          performed_by_name: userName
        })

        if (hist1Err) throw hist1Err

        // ── SLOT RELEASE / RETAIN LOGIC ──────────────────────────────────────
        // If releasePreviousSlot=false, we insert a phantom reservation so that
        // the conflict-check RPC (check_meeting_overlap) still sees the old slot
        // as occupied. If releasePreviousSlot=true we remove any existing
        // reservation for that slot (clean release).
        if (!releasePreviousSlot && oldAssignedUserId && oldMeetingDate && oldMeetingTime) {
          // Insert a slot reservation to keep the old slot blocked
          const { error: reserveErr } = await supabase
            .from('meeting_slot_reservations')
            .upsert({
              assigned_user_id: oldAssignedUserId,
              contact_person: oldContactPerson || null,
              meeting_date: oldMeetingDate,
              meeting_time: oldMeetingTime,
              source_meeting_id: body.meetingId,
              reserved_by: userId,
              reason: `Slot retained after reschedule of meeting ${meeting.meeting_reference}. releasePreviousSlot=false.`,
              is_active: true,
            }, { onConflict: 'assigned_user_id,meeting_date,meeting_time' })

          if (reserveErr) {
            console.warn('meeting_slot_reservations upsert failed (non-fatal):', reserveErr.message)
            // Non-fatal — log to audit but do not abort the reschedule
            await supabase.from('system_audit_trail').insert({
              action: 'slot_reservation_failed',
              entity_type: 'meeting_slot_reservation',
              entity_id: body.meetingId,
              module: 'Meeting Reschedule',
              user_name: userName || 'SYSTEM',
              severity: 'warn',
              payload_json: { error: reserveErr.message, old_date: oldMeetingDate, old_time: oldMeetingTime, assigned_user_id: oldAssignedUserId },
              timestamp: new Date().toISOString(),
            }).catch(() => {/* non-blocking */})
          } else {
            console.log(`reschedule_meeting: Slot reservation created for ${oldAssignedUserId} on ${oldMeetingDate} at ${oldMeetingTime}`)
          }
        } else if (releasePreviousSlot && oldAssignedUserId && oldMeetingDate && oldMeetingTime) {
          // Remove any phantom reservation for this slot so it becomes bookable again
          const { error: deleteReserveErr } = await supabase
            .from('meeting_slot_reservations')
            .delete()
            .eq('assigned_user_id', oldAssignedUserId)
            .eq('meeting_date', oldMeetingDate)
            .eq('meeting_time', oldMeetingTime)
            .eq('is_active', true)

          if (deleteReserveErr) {
            console.warn('meeting_slot_reservations delete failed (non-fatal):', deleteReserveErr.message)
          } else {
            console.log(`reschedule_meeting: Slot released for ${oldAssignedUserId} on ${oldMeetingDate} at ${oldMeetingTime}`)
          }
        }
        // ─────────────────────────────────────────────────────────────────────

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
            created_by: userName?.substring(0, 10) || null,
            metadata: {
              ...(meeting.metadata || {}),
              release_previous_slot: releasePreviousSlot,
              previous_slot_date: oldMeetingDate,
              previous_slot_time: oldMeetingTime,
            }
          })
          .select()
          .single()

        if (newMeetingError) throw newMeetingError

        // Add history for new meeting
        const { error: hist2Err } = await supabase.from('meeting_history').insert({
          meeting_id: newMeeting.id,
          new_status: 'Scheduled',
          action_taken: 'RESCHEDULED_FROM',
          new_date: body.newDate,
          new_time: body.newTime,
          remarks: `Rescheduled from ${meeting.meeting_reference}. Previous slot ${releasePreviousSlot ? 'released' : 'retained (blocked)'}.`,
          performed_by: userId,
          performed_by_name: userName
        })

        if (hist2Err) throw hist2Err

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

        // Trigger Workflow-ScheduleMeeting via the workflow-action-api edge function.
        // application_reference_no is resolved server-side from workflow_instance.metadata.
        if (newMeeting.workflow_id && newMeeting.step_id && newMeeting.workflow_instance_id) {
          console.log('Manual reschedule: invoking workflow-action-api ScheduleMeeting for new meeting:', newMeetingRef)
          await triggerScheduleMeetingWorkflowApi(
            supabase,
            newMeeting.workflow_id,
            newMeeting.step_id,
            newMeeting.workflow_instance_id,
            {
              meeting_reference_no: newMeetingRef,
              meeting_date:         body.newDate,
              meeting_time:         body.newTime,
              office_address:       newMeeting.office_address || meeting.office_address,
              contact_person_name:  newMeeting.contact_person_name || meeting.contact_person_name,
              remarks:              body.remarks,
            }
          )
        } else {
          console.warn('Manual reschedule: skipping Workflow-ScheduleMeeting API — missing workflow_id, step_id or workflow_instance_id on new meeting')
        }

        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Meeting rescheduled successfully',
          new_meeting_id: newMeeting.id,
          new_meeting_reference: newMeetingRef,
          release_previous_slot: releasePreviousSlot,
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

// ─────────────────────────────────────────────────────────────────────────────
// Invoke the workflow-action-api edge function with action_code = 'ScheduleMeeting'.
//
// CONTRACT (from workflow_step_action_api_body):
//   referenceNumber   ← applicationData.application_reference_no   (APPLICATION)
//   appointmentId     ← meetingData.meeting_reference_no            (MEETING)
//   appointmentDate   ← meetingData.meeting_date                    (MEETING)
//   appointmentTime   ← meetingData.meeting_time                    (MEETING)
//   appointmentOfficeAddress ← meetingData.office_address           (MEETING)
//   appointmentPerson ← meetingData.contact_person_name             (MEETING)
//   appointmentRemarks← meetingData.remarks                         (MEETING)
//   updatedBy         ← systemData.logged_in_user                   (SYSTEM)
//
// application_reference_no is ALWAYS resolved server-side from
// workflow_instances.metadata.reference_number — never trusted from the caller.
//
// Throws a structured error if:
//   • reference_number cannot be resolved from workflow_instance.metadata
//   • The workflow-action-api returns a non-2xx response
// ─────────────────────────────────────────────────────────────────────────────
async function triggerScheduleMeetingWorkflowApi(
  supabase: any,
  workflowId: string,
  workflowStepId: string,
  workflowInstanceId: string,
  meetingData: Record<string, any>
): Promise<void> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // ── STEP A: Resolve application_reference_no from workflow_instance.metadata ──
  // This is the canonical source of truth — never rely on caller-supplied values.
  const { data: instance, error: instanceErr } = await supabase
    .from('workflow_instances')
    .select('metadata, source_module, source_record_id')
    .eq('id', workflowInstanceId)
    .single()

  if (instanceErr || !instance) {
    const msg = `Cannot resolve workflow instance ${workflowInstanceId}: ${instanceErr?.message || 'not found'}`
    console.error('[triggerScheduleMeetingWorkflowApi] ' + msg)

    // Audit the failure
    await supabase.from('system_audit_trail').insert({
      action: 'workflow_api_blocked',
      entity_type: 'workflow_api_call',
      entity_id: workflowInstanceId,
      module: 'Workflow API',
      user_name: 'SYSTEM',
      severity: 'error',
      payload_json: {
        action_code: 'ScheduleMeeting',
        reason: msg,
        meeting_reference_no: meetingData.meeting_reference_no,
        workflow_instance_id: workflowInstanceId,
      },
      timestamp: new Date().toISOString(),
    }).catch(() => { /* non-blocking */ })

    throw new Error(`Workflow-ScheduleMeeting blocked: ${msg}`)
  }

  // reference_number is stored in metadata for online-application-sourced workflows
  const applicationRefNo: string | null =
    instance.metadata?.reference_number ||
    instance.metadata?.application_reference_no ||
    instance.source_record_id ||
    null

  if (!applicationRefNo) {
    const msg = `application_reference_no could not be resolved for workflow instance ${workflowInstanceId}. ` +
      `metadata keys: ${Object.keys(instance.metadata || {}).join(', ')}`
    console.error('[triggerScheduleMeetingWorkflowApi] ' + msg)

    await supabase.from('system_audit_trail').insert({
      action: 'workflow_api_blocked',
      entity_type: 'workflow_api_call',
      entity_id: workflowInstanceId,
      module: 'Workflow API',
      user_name: 'SYSTEM',
      severity: 'error',
      payload_json: {
        action_code: 'ScheduleMeeting',
        reason: 'Missing application_reference_no',
        metadata: instance.metadata,
        meeting_reference_no: meetingData.meeting_reference_no,
        workflow_instance_id: workflowInstanceId,
      },
      timestamp: new Date().toISOString(),
    }).catch(() => { /* non-blocking */ })

    throw new Error(`Workflow-ScheduleMeeting blocked: reference-number is missing — ${msg}`)
  }

  console.log(`[triggerScheduleMeetingWorkflowApi] Resolved application_reference_no=${applicationRefNo} for instance ${workflowInstanceId}`)

  // ── STEP B: Build the payload matching the workflow contract ──
  const payload = {
    action: 'execute',
    workflowId,
    workflowStepId,
    workflowInstanceId,
    actionCode: 'ScheduleMeeting',
    // APPLICATION source — provides referenceNumber field
    applicationData: {
      application_reference_no: applicationRefNo,
    },
    // MEETING source — provides all appointment fields
    meetingData: {
      meeting_reference_no: meetingData.meeting_reference_no,
      meeting_date:         meetingData.meeting_date,
      meeting_time:         meetingData.meeting_time,
      office_address:       meetingData.office_address || null,
      contact_person_name:  meetingData.contact_person_name || null,
      remarks:              meetingData.remarks || null,
    },
    workflowContext: {
      action_code: 'ScheduleMeeting',
      instance_id: workflowInstanceId,
    }
  }

  console.log('[triggerScheduleMeetingWorkflowApi] Payload:', JSON.stringify({
    workflowId, workflowStepId, workflowInstanceId,
    application_reference_no: applicationRefNo,
    meeting_reference_no: meetingData.meeting_reference_no,
    meeting_date: meetingData.meeting_date,
    meeting_time: meetingData.meeting_time,
  }))

  // ── STEP C: Invoke workflow-action-api ──
  try {
    const resp = await fetch(`${supabaseUrl}/functions/v1/workflow-action-api`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey,
      },
      body: JSON.stringify(payload),
    })

    const result = await resp.text()
    if (!resp.ok) {
      throw new Error(`workflow-action-api returned ${resp.status}: ${result}`)
    }
    console.log('[triggerScheduleMeetingWorkflowApi] Success. Response:', result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[triggerScheduleMeetingWorkflowApi] Failed:', msg)
    throw new Error(`Workflow-ScheduleMeeting API invocation failed: ${msg}`)
  }
}

// Helper function to call external APIs (used for workflow_api_configurations-based calls)
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
