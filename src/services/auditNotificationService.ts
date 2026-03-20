/**
 * Audit Notification Service
 * Triggers structured email notifications for audit lifecycle events
 * via the send-notification edge function.
 */
import { supabase } from '@/integrations/supabase/client';

interface NotifyOptions {
  recipientEmail: string;
  subject: string;
  body: string;
  fromName?: string;
}

async function sendNotification(options: NotifyOptions): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('send-notification', {
      body: {
        recipient_email: options.recipientEmail,
        subject: options.subject,
        body: options.body,
        from_name: options.fromName || 'SSBM Internal Audit',
      },
    });
    if (error) {
      console.error('Notification send error:', error);
      return false;
    }
    return data?.success === true;
  } catch (err) {
    console.error('Notification service error:', err);
    return false;
  }
}

// ── Helper: fetch auditor email by auditor id ──
async function getAuditorEmail(auditorId: string): Promise<string | null> {
  const { data } = await supabase
    .from('ia_auditors')
    .select('email, name')
    .eq('id', auditorId)
    .single();
  return data?.email || null;
}

// ── Helper: fetch department head email ──
async function getDepartmentHeadEmail(departmentId: string): Promise<{ email: string | null; name: string | null }> {
  const { data: dept } = await supabase
    .from('ia_departments')
    .select('head, email, head_profile_id')
    .eq('id', departmentId)
    .single();
  if (dept?.email) return { email: dept.email, name: dept.head };
  if (dept?.head_profile_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', dept.head_profile_id)
      .single();
    return { email: profile?.email || null, name: profile?.full_name || null };
  }
  return { email: null, name: null };
}

// ══════════════════════════════════════════════════════════════
// Plan Lifecycle Notifications
// ══════════════════════════════════════════════════════════════

export async function notifyPlanSubmitted(planId: string, planTitle: string, leadAuditorId?: string) {
  if (!leadAuditorId) return;
  const email = await getAuditorEmail(leadAuditorId);
  if (!email) return;
  await sendNotification({
    recipientEmail: email,
    subject: `Audit Plan Submitted for Review: ${planTitle}`,
    body: `<p>An audit plan has been submitted for your review.</p>
           <p><strong>Plan:</strong> ${planTitle}</p>
           <p>Please log in to the system to review and approve or reject this plan.</p>`,
  });
}

export async function notifyPlanApproved(planId: string, planTitle: string, departmentId?: string, teamMemberIds?: string[]) {
  if (departmentId) {
    const head = await getDepartmentHeadEmail(departmentId);
    if (head.email) {
      await sendNotification({
        recipientEmail: head.email,
        subject: `Audit Plan Approved – Acceptance Required: ${planTitle}`,
        body: `<p>Dear ${head.name || 'Department Head'},</p>
               <p>An audit plan for your department has been approved and requires your acceptance before execution can begin.</p>
               <p><strong>Plan:</strong> ${planTitle}</p>
               <p>Please log in to the system to accept or decline this audit.</p>`,
      });
    }
  }
  if (teamMemberIds?.length) {
    for (const auditorId of teamMemberIds) {
      const email = await getAuditorEmail(auditorId);
      if (email) {
        await sendNotification({
          recipientEmail: email,
          subject: `You have been assigned to audit: ${planTitle}`,
          body: `<p>An audit plan has been approved and you have been assigned as a team member.</p>
                 <p><strong>Plan:</strong> ${planTitle}</p>
                 <p>Please log in to the system to view your assignments.</p>`,
        });
      }
    }
  }
}

export async function notifyDeptAcceptanceRequired(planId: string, planTitle: string, departmentId: string) {
  const head = await getDepartmentHeadEmail(departmentId);
  if (!head.email) return;
  await sendNotification({
    recipientEmail: head.email,
    subject: `Department Acceptance Required: ${planTitle}`,
    body: `<p>Dear ${head.name || 'Department Head'},</p>
           <p>An approved audit plan requires your acceptance before the audit team can begin fieldwork.</p>
           <p><strong>Plan:</strong> ${planTitle}</p>
           <p>Please log in to review the plan and provide your acceptance.</p>`,
  });
}

// ══════════════════════════════════════════════════════════════
// Finding & Action Notifications
// ══════════════════════════════════════════════════════════════

export async function notifyFindingCreated(findingTitle: string, departmentId?: string) {
  if (!departmentId) return;
  const head = await getDepartmentHeadEmail(departmentId);
  if (!head.email) return;
  await sendNotification({
    recipientEmail: head.email,
    subject: `New Audit Finding: ${findingTitle}`,
    body: `<p>Dear ${head.name || 'Department Head'},</p>
           <p>A new audit finding has been recorded for your department.</p>
           <p><strong>Finding:</strong> ${findingTitle}</p>
           <p>Please log in to the system to review and provide a management response.</p>`,
  });
}

export async function notifyActionAssigned(actionDescription: string, responsibleEmail: string, dueDate?: string) {
  await sendNotification({
    recipientEmail: responsibleEmail,
    subject: `Corrective Action Assigned: ${actionDescription.slice(0, 60)}`,
    body: `<p>A corrective action has been assigned to you.</p>
           <p><strong>Action:</strong> ${actionDescription}</p>
           ${dueDate ? `<p><strong>Due Date:</strong> ${new Date(dueDate).toLocaleDateString()}</p>` : ''}
           <p>Please log in to the system to view details and update progress.</p>`,
  });
}

export async function notifyActionOverdue(actionDescription: string, responsibleEmail: string, dueDate: string) {
  await sendNotification({
    recipientEmail: responsibleEmail,
    subject: `OVERDUE: Corrective Action Past Due Date`,
    body: `<p>The following corrective action is now <strong>overdue</strong>.</p>
           <p><strong>Action:</strong> ${actionDescription}</p>
           <p><strong>Due Date:</strong> ${new Date(dueDate).toLocaleDateString()}</p>
           <p>Please take immediate action and update the status in the system.</p>`,
  });
}

export async function notifyActionReminder(actionDescription: string, responsibleEmail: string, dueDate: string, daysRemaining: number) {
  await sendNotification({
    recipientEmail: responsibleEmail,
    subject: `Reminder: Corrective Action Due in ${daysRemaining} Day${daysRemaining !== 1 ? 's' : ''}`,
    body: `<p>This is a reminder that the following corrective action is due soon.</p>
           <p><strong>Action:</strong> ${actionDescription}</p>
           <p><strong>Due Date:</strong> ${new Date(dueDate).toLocaleDateString()}</p>
           <p><strong>Days Remaining:</strong> ${daysRemaining}</p>
           <p>Please ensure you update progress in the system.</p>`,
  });
}

// ══════════════════════════════════════════════════════════════
// Management Response Notifications
// ══════════════════════════════════════════════════════════════

export async function notifyManagementResponseSubmitted(findingId: string, leadAuditorId?: string) {
  if (!leadAuditorId) return;
  const email = await getAuditorEmail(leadAuditorId);
  if (!email) return;
  // Fetch finding title
  const { data: finding } = await supabase
    .from('ia_findings')
    .select('title')
    .eq('id', findingId)
    .single();
  await sendNotification({
    recipientEmail: email,
    subject: `Management Response Submitted: ${finding?.title || 'Finding'}`,
    body: `<p>A management response has been submitted for the following finding.</p>
           <p><strong>Finding:</strong> ${finding?.title || findingId}</p>
           <p>Please log in to the system to review and accept or reject the response.</p>`,
  });
}

// ══════════════════════════════════════════════════════════════
// Report Notifications
// ══════════════════════════════════════════════════════════════

export async function notifyReportGenerated(auditTitle: string, departmentId?: string) {
  if (!departmentId) return;
  const head = await getDepartmentHeadEmail(departmentId);
  if (!head.email) return;
  await sendNotification({
    recipientEmail: head.email,
    subject: `Audit Report Generated: ${auditTitle}`,
    body: `<p>Dear ${head.name || 'Department Head'},</p>
           <p>An audit report has been generated for the following audit engagement.</p>
           <p><strong>Audit:</strong> ${auditTitle}</p>
           <p>Please log in to the system to review the report.</p>`,
  });
}

// ══════════════════════════════════════════════════════════════
// Audit Query Notifications
// ══════════════════════════════════════════════════════════════

export async function notifyQuerySent(question: string, departmentId: string, auditTitle?: string) {
  const head = await getDepartmentHeadEmail(departmentId);
  if (!head.email) return;
  await sendNotification({
    recipientEmail: head.email,
    subject: `Audit Query: ${auditTitle || 'Information Request'}`,
    body: `<p>Dear ${head.name || 'Department Head'},</p>
           <p>The internal audit team has raised a query for your department.</p>
           <p><strong>Question:</strong> ${question}</p>
           ${auditTitle ? `<p><strong>Audit:</strong> ${auditTitle}</p>` : ''}
           <p>Please log in to the system to review and respond.</p>`,
  });
}

export async function notifyQueryResponse(question: string, auditorId?: string) {
  if (!auditorId) return;
  const email = await getAuditorEmail(auditorId);
  if (!email) return;
  await sendNotification({
    recipientEmail: email,
    subject: `Department Response Received`,
    body: `<p>A department has responded to your audit query.</p>
           <p><strong>Query:</strong> ${question.slice(0, 100)}${question.length > 100 ? '...' : ''}</p>
           <p>Please log in to the system to review the response.</p>`,
  });
}

// ══════════════════════════════════════════════════════════════
// Plan Closure Notifications
// ══════════════════════════════════════════════════════════════

export async function notifyPlanClosed(planTitle: string, departmentId: string) {
  const head = await getDepartmentHeadEmail(departmentId);
  if (!head.email) return;
  await sendNotification({
    recipientEmail: head.email,
    subject: `Audit Plan Closed: ${planTitle}`,
    body: `<p>Dear ${head.name || 'Department Head'},</p>
           <p>The following audit plan has been formally closed.</p>
           <p><strong>Plan:</strong> ${planTitle}</p>
           <p>All engagements under this plan have been completed. Please log in to the system to review the closure summary.</p>`,
  });
}
  if (!auditorId) return;
  const email = await getAuditorEmail(auditorId);
  if (!email) return;
  await sendNotification({
    recipientEmail: email,
    subject: `Department Response Received`,
    body: `<p>A department has responded to your audit query.</p>
           <p><strong>Query:</strong> ${question.slice(0, 100)}${question.length > 100 ? '...' : ''}</p>
           <p>Please log in to the system to review the response.</p>`,
  });
}
