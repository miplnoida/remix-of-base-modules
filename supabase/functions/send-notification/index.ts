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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { 
      notification_log_id,
      recipient_email, 
      subject, 
      body,
      from_name = "SSBM Workflow System",
      from_email = "noreply@system.local"
    }: SendNotificationRequest = await req.json();

    console.log("Queueing email notification to:", recipient_email);
    console.log("Subject:", subject);

    // Log technical call start
    await logToSystem(supabase, 'system_technical_logs', {
      api_name: 'send-notification',
      module: 'Notifications',
      severity: 'info',
      status: 'started',
      payload_json: { recipient_email, subject, notification_log_id },
    }, correlationId);

    const executionTime = Math.round(performance.now() - startTime);

    // Instead of sending via Resend, we queue the notification in the database
    // This allows for future integration with any email provider
    if (notification_log_id) {
      // Update existing notification log to queued status
      const { error: updateError } = await supabase
        .from('notification_logs')
        .update({
          status: 'queued',
          updated_at: new Date().toISOString(),
        })
        .eq('id', notification_log_id);

      if (updateError) {
        console.error("Failed to update notification log:", updateError);
      }
    } else {
      // Create new notification log entry
      const { data: newLog, error: insertError } = await supabase
        .from('notification_logs')
        .insert({
          recipient_address: recipient_email,
          subject: subject,
          body: body,
          channel: 'email',
          status: 'queued',
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        console.error("Failed to create notification log:", insertError);
      }
    }

    // Log integration note (no external service called - just queued)
    await logToSystem(supabase, 'system_integration_logs', {
      external_service: 'Internal Queue',
      module: 'Notifications',
      api_name: 'queue-email',
      request_data: { recipient_email, subject, from_name, from_email },
      response_data: { message: 'Email queued for delivery' },
      status: 'success',
      severity: 'info',
      payload_json: { 
        execution_time_ms: executionTime,
        note: 'Email provider not configured - notification queued for manual processing or future integration',
      },
    }, correlationId);

    // Log technical call completion
    await logToSystem(supabase, 'system_technical_logs', {
      api_name: 'send-notification',
      module: 'Notifications',
      severity: 'info',
      status: 'queued',
      execution_time_ms: executionTime,
      payload_json: { 
        recipient_email, 
        subject, 
        message: 'Notification queued successfully',
      },
    }, correlationId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notification queued successfully',
        status: 'queued',
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    const executionTime = Math.round(performance.now() - startTime);
    console.error("Error queueing notification:", error);

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
