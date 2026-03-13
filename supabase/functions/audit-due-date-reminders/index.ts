import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REMINDER_DAYS = [7, 3, 1];

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const results: any[] = [];

    // Fetch all open/in-progress actions with target dates
    const { data: actions, error: actionsError } = await supabase
      .from('ia_action_tracking')
      .select('*')
      .in('status', ['Not Started', 'In Progress', 'Open'])
      .not('target_date', 'is', null);

    if (actionsError) {
      console.error('Failed to fetch actions:', actionsError);
      throw actionsError;
    }

    for (const action of (actions || [])) {
      const targetDate = new Date(action.target_date);
      const diffMs = targetDate.getTime() - now.getTime();
      const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      let notificationType: string | null = null;

      if (daysRemaining < 0) {
        notificationType = 'overdue';
      } else if (REMINDER_DAYS.includes(daysRemaining)) {
        notificationType = `reminder_${daysRemaining}d`;
      }

      if (!notificationType) continue;

      // Get responsible person's email
      let recipientEmail: string | null = null;
      if (action.responsible_person) {
        // Try profiles table first
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', action.responsible_person)
          .single();
        recipientEmail = profile?.email || null;
      }

      if (!recipientEmail) continue;

      // Send notification
      const subject = daysRemaining < 0
        ? `OVERDUE: Corrective Action Past Due Date`
        : `Reminder: Corrective Action Due in ${daysRemaining} Day${daysRemaining !== 1 ? 's' : ''}`;

      const body = daysRemaining < 0
        ? `<p>The following corrective action is <strong>overdue</strong>.</p>
           <p><strong>Action:</strong> ${action.action_description}</p>
           <p><strong>Due Date:</strong> ${targetDate.toLocaleDateString()}</p>
           <p>Please take immediate action.</p>`
        : `<p>Reminder: A corrective action is due in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}.</p>
           <p><strong>Action:</strong> ${action.action_description}</p>
           <p><strong>Due Date:</strong> ${targetDate.toLocaleDateString()}</p>`;

      // Invoke send-notification
      const notifyRes = await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          recipient_email: recipientEmail,
          subject,
          body,
          from_name: 'SSBM Internal Audit',
        }),
      });

      const notifyResult = await notifyRes.json();
      results.push({
        action_id: action.id,
        type: notificationType,
        days_remaining: daysRemaining,
        recipient: recipientEmail,
        success: notifyResult.success,
      });

      // Update status to Overdue if past due
      if (daysRemaining < 0 && action.status !== 'Overdue') {
        await supabase
          .from('ia_action_tracking')
          .update({ status: 'Overdue' })
          .eq('id', action.id);
      }
    }

    console.log(`Processed ${results.length} reminder notifications`);

    return new Response(
      JSON.stringify({ success: true, processed: results.length, details: results }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in audit-due-date-reminders:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
