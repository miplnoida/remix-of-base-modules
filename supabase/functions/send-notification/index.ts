import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-correlation-id",
};

interface SendNotificationRequest {
  notification_log_id?: string;
  recipient_email: string;
  subject: string;
  body: string;
  from_name?: string;
  from_email?: string;
}

// Helper function to log to system tables
async function logToSystem(
  supabase: any,
  tableName: string,
  data: Record<string, any>,
  correlationId: string
) {
  try {
    await supabase.from(tableName).insert({
      ...data,
      correlation_id: correlationId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`Failed to log to ${tableName}:`, error);
  }
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = performance.now();
  const correlationId = req.headers.get("x-correlation-id") || crypto.randomUUID();

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

    // Log technical call start
    await logToSystem(supabase, 'system_technical_logs', {
      api_name: 'send-notification',
      module: 'Notifications',
      severity: 'info',
      status: 'started',
      payload_json: { recipient_email, subject, notification_log_id },
    }, correlationId);

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
    const executionTime = Math.round(performance.now() - startTime);
    console.log("Resend response:", emailResult);

    // Log integration call
    await logToSystem(supabase, 'system_integration_logs', {
      external_service: 'Resend',
      module: 'Notifications',
      api_name: 'send-email',
      request_data: { recipient_email, subject, from_name, from_email },
      response_data: emailResult,
      status: resendResponse.ok ? 'success' : 'failed',
      severity: resendResponse.ok ? 'info' : 'error',
      payload_json: { 
        execution_time_ms: executionTime,
        http_status: resendResponse.status,
      },
    }, correlationId);

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

    // Log technical call completion
    await logToSystem(supabase, 'system_technical_logs', {
      api_name: 'send-notification',
      module: 'Notifications',
      severity: resendResponse.ok ? 'info' : 'error',
      status: resendResponse.ok ? 'success' : 'failed',
      execution_time_ms: executionTime,
      payload_json: { 
        recipient_email, 
        subject, 
        message_id: emailResult.id,
        http_status: resendResponse.status,
      },
    }, correlationId);

    if (!resendResponse.ok || (emailResult as any)?.error) {
      const errMsg = (emailResult as any)?.error?.message || (emailResult as any)?.message || "Failed to send email";
      
      // Log error
      await logToSystem(supabase, 'system_error_logs', {
        api_name: 'send-notification',
        module: 'Notifications',
        error_type: 'EmailSendError',
        error_message: errMsg,
        severity: 'error',
        payload_json: { 
          recipient_email, 
          http_status: resendResponse.status,
          response: emailResult,
        },
      }, correlationId);

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
    const executionTime = Math.round(performance.now() - startTime);
    console.error("Error sending notification:", error);

    // Try to log error
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      await logToSystem(supabase, 'system_error_logs', {
        api_name: 'send-notification',
        module: 'Notifications',
        error_type: error?.name || 'NotificationError',
        error_message: error.message,
        stack_trace: error?.stack,
        severity: 'critical',
        payload_json: { execution_time_ms: executionTime },
      }, correlationId);
    } catch (logError) {
      console.error("Failed to log error:", logError);
    }

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