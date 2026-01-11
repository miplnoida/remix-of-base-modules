import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendNotificationRequest {
  notification_log_id?: string;
  recipient_email: string;
  subject: string;
  body: string;
  from_name?: string;
  from_email?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
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

    const { 
      notification_log_id,
      recipient_email, 
      subject, 
      body,
      from_name = "SSBM Workflow System",
      from_email = "onboarding@resend.dev"
    }: SendNotificationRequest = await req.json();

    console.log("Sending email to:", recipient_email);
    console.log("Subject:", subject);

    // Send email via Resend REST API
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${from_name} <${from_email}>`,
        to: [recipient_email],
        subject: subject,
        html: body,
      }),
    });

    const emailResult = await resendResponse.json();
    console.log("Resend response:", emailResult);

    // Update notification log if ID provided
    if (notification_log_id) {
      const updateData: Record<string, any> = {
        sent_at: new Date().toISOString(),
      };

      if (!resendResponse.ok || emailResult.error) {
        updateData.status = 'failed';
        updateData.failure_reason = emailResult.error?.message || emailResult.message || 'Unknown error';
      } else {
        updateData.status = 'sent';
        updateData.external_message_id = emailResult.id;
      }

      const { error: updateError } = await supabase
        .from('notification_logs')
        .update(updateData)
        .eq('id', notification_log_id);

      if (updateError) {
        console.error("Failed to update notification log:", updateError);
      }
    }

    if (!resendResponse.ok || (emailResult as any)?.error) {
      const errMsg = (emailResult as any)?.error?.message || (emailResult as any)?.message || "Failed to send email";
      return new Response(
        JSON.stringify({
          success: false,
          error: errMsg,
          provider_status: resendResponse.status,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message_id: emailResult.id 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error sending notification:", error);
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
