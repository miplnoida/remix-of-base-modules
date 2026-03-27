import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-correlation-id",
};

const RESEND_API = "https://api.resend.com/emails";

interface EmailAttachment {
  filename: string;
  content: string; // base64 encoded
  contentType?: string;
}

interface SendNotificationRequest {
  notification_log_id?: string;
  recipient_email: string;
  subject: string;
  body: string;
  from_name?: string;
  from_email?: string;
  attachments?: EmailAttachment[];
}

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

async function sendViaResend(
  apiKey: string,
  to: string,
  subject: string,
  html: string,
  fromName: string,
  fromEmail: string,
  attachments?: EmailAttachment[]
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const emailPayload: Record<string, any> = {
      from: `${fromName} <${fromEmail}>`,
      to: [to],
      subject,
      html,
    };

    if (attachments && attachments.length > 0) {
      emailPayload.attachments = attachments.map((att) => ({
        filename: att.filename,
        content: att.content, // Resend accepts base64 strings directly
        content_type: att.contentType || 'application/pdf',
      }));
    }

    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(emailPayload),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data?.message || `HTTP ${res.status}` };
    }
    return { success: true, id: data?.id };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = performance.now();
  const correlationId = req.headers.get("x-correlation-id") || crypto.randomUUID();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { 
      notification_log_id,
      recipient_email, 
      subject, 
      body,
      from_name = "SSBM Internal Audit",
      from_email = "Audit@secureserve.biz"
    }: SendNotificationRequest = await req.json();

    console.log("Sending email notification to:", recipient_email);
    console.log("Subject:", subject);

    await logToSystem(supabase, 'system_technical_logs', {
      api_name: 'send-notification',
      module: 'Notifications',
      severity: 'info',
      status: 'started',
      payload_json: { recipient_email, subject, notification_log_id },
    }, correlationId);

    let sendStatus = 'queued';
    let resendMessageId: string | undefined;
    let failureReason: string | undefined;

    // Try sending via Resend if API key is configured
    if (resendApiKey) {
      const result = await sendViaResend(resendApiKey, recipient_email, subject, body, from_name, from_email);
      if (result.success) {
        sendStatus = 'sent';
        resendMessageId = result.id;
        console.log("Email sent successfully via Resend. ID:", result.id);
      } else {
        sendStatus = 'failed';
        failureReason = result.error;
        console.error("Resend send failed:", result.error);
      }
    } else {
      console.log("No RESEND_API_KEY configured — queuing notification for manual processing.");
    }

    const executionTime = Math.round(performance.now() - startTime);

    // Update or create notification log
    if (notification_log_id) {
      await supabase
        .from('notification_logs')
        .update({
          status: sendStatus,
          resend_message_id: resendMessageId || null,
          sent_at: sendStatus === 'sent' ? new Date().toISOString() : null,
          failure_reason: failureReason || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', notification_log_id);
    } else {
      await supabase
        .from('notification_logs')
        .insert({
          recipient_address: recipient_email,
          subject,
          body,
          channel: 'email',
          status: sendStatus,
          resend_message_id: resendMessageId || null,
          sent_at: sendStatus === 'sent' ? new Date().toISOString() : null,
          failure_reason: failureReason || null,
          created_at: new Date().toISOString(),
        });
    }

    await logToSystem(supabase, 'system_integration_logs', {
      external_service: resendApiKey ? 'Resend' : 'Internal Queue',
      module: 'Notifications',
      api_name: 'send-email',
      request_data: { recipient_email, subject, from_name, from_email },
      response_data: { status: sendStatus, resend_id: resendMessageId },
      status: sendStatus === 'sent' ? 'success' : (sendStatus === 'failed' ? 'error' : 'info'),
      severity: sendStatus === 'failed' ? 'error' : 'info',
      payload_json: { execution_time_ms: executionTime },
    }, correlationId);

    await logToSystem(supabase, 'system_technical_logs', {
      api_name: 'send-notification',
      module: 'Notifications',
      severity: sendStatus === 'failed' ? 'error' : 'info',
      status: sendStatus,
      execution_time_ms: executionTime,
      payload_json: { recipient_email, subject, resend_message_id: resendMessageId },
    }, correlationId);

    return new Response(
      JSON.stringify({ 
        success: sendStatus !== 'failed', 
        message: sendStatus === 'sent' ? 'Email sent successfully' : (sendStatus === 'queued' ? 'Notification queued' : 'Send failed'),
        status: sendStatus,
        resend_id: resendMessageId,
      }),
      {
        status: sendStatus === 'failed' ? 500 : 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    const executionTime = Math.round(performance.now() - startTime);
    console.error("Error in send-notification:", error);

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
