import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-correlation-id",
};

const RESEND_API = "https://api.resend.com/emails";

/* ── helpers ── */

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

interface EmailAttachment {
  filename: string;
  content: string;
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
  metadata?: Record<string, unknown>;
  trigger_source?: string;
  triggered_by?: string;
  template_id?: string;
}

async function logToSystem(
  supabase: ReturnType<typeof createClient>,
  tableName: string,
  data: Record<string, unknown>,
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
  attachments?: EmailAttachment[],
  maxRetries = 2
): Promise<{ success: boolean; id?: string; error?: string; retries: number }> {
  const emailPayload: Record<string, unknown> = {
    from: `${fromName} <${fromEmail}>`,
    to: [to],
    subject,
    html,
  };

  if (attachments && attachments.length > 0) {
    emailPayload.attachments = attachments.map((att) => ({
      filename: att.filename,
      content: att.content,
      content_type: att.contentType || "application/pdf",
    }));
  }

  let lastError = "";
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(RESEND_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(emailPayload),
      });
      const data = await res.json();

      if (res.ok) {
        return { success: true, id: data?.id, retries: attempt };
      }

      // Transient errors: 429 (rate limit) or 5xx — retry
      if ((res.status === 429 || res.status >= 500) && attempt < maxRetries) {
        const backoffMs = Math.pow(2, attempt) * 1000; // 1s, 2s
        console.warn(
          `Resend returned ${res.status}, retrying in ${backoffMs}ms (attempt ${attempt + 1}/${maxRetries})`
        );
        await sleep(backoffMs);
        lastError = data?.message || `HTTP ${res.status}`;
        continue;
      }

      return {
        success: false,
        error: data?.message || `HTTP ${res.status}`,
        retries: attempt,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (attempt < maxRetries) {
        const backoffMs = Math.pow(2, attempt) * 1000;
        console.warn(`Resend fetch error, retrying in ${backoffMs}ms:`, msg);
        await sleep(backoffMs);
        lastError = msg;
        continue;
      }
      return { success: false, error: msg, retries: attempt };
    }
  }
  return { success: false, error: lastError, retries: maxRetries };
}

/* ── handler ── */

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = performance.now();
  const correlationId =
    req.headers.get("x-correlation-id") || crypto.randomUUID();

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
      from_email = "Audit@secureserve.biz",
      attachments,
      metadata,
      trigger_source,
      triggered_by,
      template_id,
    }: SendNotificationRequest = await req.json();

    console.log("Sending email notification to:", recipient_email);

    // Validate email format
    if (!recipient_email || !isValidEmail(recipient_email)) {
      const errorMsg = !recipient_email
        ? "No recipient email provided"
        : `Invalid email format: ${recipient_email}`;

      // Still log the failed attempt
      await supabase.from("notification_logs").insert({
        recipient_address: recipient_email || "unknown",
        subject,
        body,
        channel: "email",
        status: "failed",
        failure_reason: errorMsg,
        trigger_source: trigger_source || null,
        triggered_by: triggered_by || null,
        template_id: template_id || null,
        metadata: metadata || null,
        created_at: new Date().toISOString(),
      } as Record<string, unknown>);

      return new Response(
        JSON.stringify({
          success: false,
          status: "failed",
          error: errorMsg,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    await logToSystem(
      supabase,
      "system_technical_logs",
      {
        api_name: "send-notification",
        module: "Notifications",
        severity: "info",
        status: "started",
        payload_json: { recipient_email, subject, notification_log_id, trigger_source },
      },
      correlationId
    );

    let sendStatus = "queued";
    let resendMessageId: string | undefined;
    let failureReason: string | undefined;
    let retryCount = 0;

    // Send via Resend if API key is configured
    if (resendApiKey) {
      const result = await sendViaResend(
        resendApiKey,
        recipient_email,
        subject,
        body,
        from_name,
        from_email,
        attachments
      );
      retryCount = result.retries;

      if (result.success) {
        sendStatus = "sent";
        resendMessageId = result.id;
        console.log("Email sent successfully via Resend. ID:", result.id);
      } else {
        sendStatus = "failed";
        failureReason = result.error;
        console.error("Resend send failed:", result.error);
      }
    } else {
      console.log(
        "No RESEND_API_KEY configured — queuing notification for manual processing."
      );
    }

    const executionTime = Math.round(performance.now() - startTime);

    // Update or create notification log with full metadata
    if (notification_log_id) {
      await supabase
        .from("notification_logs")
        .update({
          status: sendStatus,
          resend_message_id: resendMessageId || null,
          sent_at: sendStatus === "sent" ? new Date().toISOString() : null,
          failure_reason: failureReason || null,
          retry_count: retryCount,
          last_retry_at: retryCount > 0 ? new Date().toISOString() : null,
          metadata: metadata || null,
          trigger_source: trigger_source || null,
          triggered_by: triggered_by || null,
          template_id: template_id || null,
        } as Record<string, unknown>)
        .eq("id", notification_log_id);
    } else {
      await supabase.from("notification_logs").insert({
        recipient_address: recipient_email,
        subject,
        body,
        channel: "email",
        status: sendStatus,
        resend_message_id: resendMessageId || null,
        sent_at: sendStatus === "sent" ? new Date().toISOString() : null,
        failure_reason: failureReason || null,
        retry_count: retryCount,
        last_retry_at: retryCount > 0 ? new Date().toISOString() : null,
        metadata: metadata || null,
        trigger_source: trigger_source || null,
        triggered_by: triggered_by || null,
        template_id: template_id || null,
        created_at: new Date().toISOString(),
      } as Record<string, unknown>);
    }

    await logToSystem(
      supabase,
      "system_integration_logs",
      {
        external_service: resendApiKey ? "Resend" : "Internal Queue",
        module: "Notifications",
        api_name: "send-email",
        request_data: { recipient_email, subject, from_name, from_email, trigger_source },
        response_data: {
          status: sendStatus,
          resend_id: resendMessageId,
          retries: retryCount,
        },
        status:
          sendStatus === "sent"
            ? "success"
            : sendStatus === "failed"
            ? "error"
            : "info",
        severity: sendStatus === "failed" ? "error" : "info",
        payload_json: { execution_time_ms: executionTime },
      },
      correlationId
    );

    await logToSystem(
      supabase,
      "system_technical_logs",
      {
        api_name: "send-notification",
        module: "Notifications",
        severity: sendStatus === "failed" ? "error" : "info",
        status: sendStatus,
        execution_time_ms: executionTime,
        payload_json: {
          recipient_email,
          subject,
          resend_message_id: resendMessageId,
          retries: retryCount,
        },
      },
      correlationId
    );

    return new Response(
      JSON.stringify({
        success: sendStatus !== "failed",
        message:
          sendStatus === "sent"
            ? "Email sent successfully"
            : sendStatus === "queued"
            ? "Notification queued"
            : "Send failed",
        status: sendStatus,
        resend_id: resendMessageId,
        error: failureReason,
      }),
      {
        status: sendStatus === "failed" ? 500 : 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    const executionTime = Math.round(performance.now() - startTime);
    const errMsg = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? error.stack : undefined;
    console.error("Error in send-notification:", error);

    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      await logToSystem(
        supabase,
        "system_error_logs",
        {
          api_name: "send-notification",
          module: "Notifications",
          error_type:
            error instanceof Error ? error.name : "NotificationError",
          error_message: errMsg,
          stack_trace: errStack,
          severity: "critical",
          payload_json: { execution_time_ms: executionTime },
        },
        correlationId
      );
    } catch (logError) {
      console.error("Failed to log error:", logError);
    }

    return new Response(
      JSON.stringify({ success: false, status: "failed", error: errMsg }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
