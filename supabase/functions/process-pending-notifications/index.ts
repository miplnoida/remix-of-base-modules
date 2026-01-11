import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch pending/queued notifications
    const { data: pendingNotifications, error: fetchError } = await supabase
      .from('notification_logs')
      .select('*')
      .in('status', ['queued', 'pending'])
      .eq('channel', 'email')
      .limit(50);

    if (fetchError) {
      throw fetchError;
    }

    console.log(`Found ${pendingNotifications?.length || 0} pending notifications`);

    const results = [];

    for (const notification of pendingNotifications || []) {
      try {
        console.log(`Processing notification ${notification.id} to ${notification.recipient_address}`);

        // Send via Resend REST API
        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "SSBM Workflow System <onboarding@resend.dev>",
            to: [notification.recipient_address],
            subject: notification.subject || "Notification",
            html: notification.body || "",
          }),
        });

        const emailResult = await resendResponse.json();

        if (!resendResponse.ok || emailResult.error) {
          // Update as failed
          await supabase
            .from('notification_logs')
            .update({
              status: 'failed',
              error_message: emailResult.error?.message || emailResult.message || 'Unknown error',
              retry_count: (notification.retry_count || 0) + 1,
              sent_at: new Date().toISOString(),
            })
            .eq('id', notification.id);

          results.push({ id: notification.id, status: 'failed', error: emailResult.error?.message || emailResult.message });
        } else {
          // Update as sent
          await supabase
            .from('notification_logs')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
              external_message_id: emailResult.id,
            })
            .eq('id', notification.id);

          results.push({ id: notification.id, status: 'sent', message_id: emailResult.id });
        }
      } catch (err: any) {
        console.error(`Failed to process notification ${notification.id}:`, err);
        
        await supabase
          .from('notification_logs')
          .update({
            status: 'failed',
            error_message: err.message,
            retry_count: (notification.retry_count || 0) + 1,
          })
          .eq('id', notification.id);

        results.push({ id: notification.id, status: 'failed', error: err.message });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: results.length,
        results 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error processing notifications:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
