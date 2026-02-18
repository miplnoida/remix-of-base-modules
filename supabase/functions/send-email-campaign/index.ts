import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-correlation-id",
};

interface CampaignRequest {
  campaign_id?: string;
  name?: string;
  subject?: string;
  html_body?: string;
  plain_body?: string;
  from_name?: string;
  from_email?: string;
  recipient_filter?: string;
  recipient_emails?: string[];
  retry_log_id?: string;
}

interface ResendResult {
  id?: string;
  error?: string;
  statusCode?: number;
}

const RESEND_API = "https://api.resend.com/emails";
const BATCH_SIZE = 50;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function sendViaResend(
  apiKey: string,
  to: string,
  subject: string,
  html: string,
  plain: string | undefined,
  fromName: string,
  fromEmail: string
): Promise<ResendResult> {
  let lastError = "";
  let lastStatus = 0;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(RESEND_API, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${fromName} <${fromEmail}>`,
          to: [to],
          subject,
          html,
          text: plain,
        }),
      });

      lastStatus = res.status;

      if (res.ok) {
        const data = await res.json();
        return { id: data.id };
      }

      const errBody = await res.text();
      let parsedError = errBody;
      try {
        const parsed = JSON.parse(errBody);
        parsedError = parsed.message || parsed.error || errBody;
      } catch (_) {}

      lastError = `[HTTP ${res.status}] ${parsedError}`;
      console.error(`Resend attempt ${attempt} failed (${res.status}):`, parsedError);

      // Retryable: rate-limit or server errors
      if (res.status === 429 || res.status >= 500) {
        await sleep(RETRY_DELAY_MS * attempt);
        continue;
      }

      // 4xx non-retryable (e.g. unverified domain, invalid email, bad API key)
      return { error: lastError, statusCode: res.status };
    } catch (err: any) {
      lastError = err?.message || String(err);
      console.error(`Resend attempt ${attempt} threw:`, lastError);
      await sleep(RETRY_DELAY_MS * attempt);
    }
  }

  return { error: lastError || "All retry attempts exhausted", statusCode: lastStatus };
}

/** Write to system_error_logs - non-blocking */
async function logSystemError(
  supabase: any,
  errorMessage: string,
  errorType: string,
  module: string,
  entityId?: string,
  stackTrace?: string,
  correlationId?: string,
  sessionId?: string,
) {
  try {
    await supabase.from("system_error_logs").insert({
      error_type: errorType,
      error_message: errorMessage,
      stack_trace: stackTrace || null,
      module,
      entity_type: "email_campaign",
      entity_id: entityId || null,
      severity: "error",
      correlation_id: correlationId || null,
      session_id: sessionId || null,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error("Failed to write system_error_logs:", e);
  }
}

/** Write to system_technical_logs - non-blocking */
async function logTechnical(
  supabase: any,
  apiName: string,
  module: string,
  status: "success" | "failed",
  executionMs: number,
  entityId?: string,
  errorDetail?: string,
  correlationId?: string,
) {
  try {
    await supabase.from("system_technical_logs").insert({
      api_name: apiName,
      module,
      entity_type: "email_campaign",
      entity_id: entityId || null,
      execution_time_ms: executionMs,
      status,
      severity: status === "failed" ? "error" : "info",
      stack_trace: errorDetail || null,
      correlation_id: correlationId || null,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error("Failed to write system_technical_logs:", e);
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const correlationId =
    req.headers.get("x-correlation-id") || crypto.randomUUID();
  const startTime = performance.now();

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const resendApiKey = Deno.env.get("RESEND_API_KEY");

  if (!resendApiKey) {
    const errMsg = "RESEND_API_KEY secret is not configured in the backend environment.";
    console.error(errMsg);
    // Still create supabase client with service key to log
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    await logSystemError(supabase, errMsg, "ConfigurationError", "EmailCampaign", undefined, undefined, correlationId);
    return new Response(
      JSON.stringify({ success: false, error: errMsg }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body: CampaignRequest = await req.json();

    // ── RETRY SINGLE FAILED LOG ──────────────────────────────────────────────
    if (body.retry_log_id) {
      const retryStart = performance.now();
      const { data: log, error: logErr } = await supabase
        .from("notification_logs")
        .select("*")
        .eq("id", body.retry_log_id)
        .single();

      if (logErr || !log) {
        const errMsg = `Retry failed: notification log ${body.retry_log_id} not found`;
        await logSystemError(supabase, errMsg, "NotFoundError", "EmailCampaign", body.retry_log_id, undefined, correlationId);
        return new Response(
          JSON.stringify({ success: false, error: "Log not found" }),
          { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      await supabase
        .from("notification_logs")
        .update({ status: "sending", retry_count: (log.retry_count || 0) + 1, last_retry_at: new Date().toISOString() })
        .eq("id", log.id);

      const result = await sendViaResend(
        resendApiKey,
        log.recipient_address,
        log.subject || "(no subject)",
        log.body,
        undefined,
        "SSBM Notifications",
        "noreply@notifications.ssbm.gov.kn"
      );

      const retryMs = Math.round(performance.now() - retryStart);

      if (result.id) {
        await supabase
          .from("notification_logs")
          .update({ status: "sent", resend_message_id: result.id, sent_at: new Date().toISOString(), failure_reason: null })
          .eq("id", log.id);
        await logTechnical(supabase, "resend_retry_email", "EmailCampaign", "success", retryMs, log.id, undefined, correlationId);
        return new Response(
          JSON.stringify({ success: true, resend_id: result.id }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      } else {
        const errMsg = result.error || "All retry attempts exhausted";
        await supabase
          .from("notification_logs")
          .update({ status: "failed", failure_reason: errMsg })
          .eq("id", log.id);
        await logSystemError(supabase, errMsg, "ResendDeliveryError", "EmailCampaign", log.id, undefined, correlationId);
        await logTechnical(supabase, "resend_retry_email", "EmailCampaign", "failed", retryMs, log.id, errMsg, correlationId);
        return new Response(
          JSON.stringify({ success: false, error: errMsg }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // ── RESOLVE CAMPAIGN ─────────────────────────────────────────────────────
    let campaignId: string;
    let name: string;
    let subject: string;
    let htmlBody: string;
    let plainBody: string | undefined;
    let fromName: string;
    let fromEmail: string;
    let recipientFilter: string;
    let customEmails: string[] | undefined;

    if (body.campaign_id) {
      const { data: camp, error } = await supabase
        .from("email_campaigns")
        .select("*")
        .eq("id", body.campaign_id)
        .single();
      if (error || !camp) throw new Error("Campaign not found: " + (error?.message || body.campaign_id));

      campaignId      = camp.id;
      name            = camp.name;
      subject         = camp.subject;
      htmlBody        = camp.html_body;
      plainBody       = camp.plain_body;
      fromName        = camp.from_name;
      fromEmail       = camp.from_email;
      recipientFilter = camp.recipient_filter;
      customEmails    = camp.recipient_emails;
    } else {
      name            = body.name || "Manual Campaign";
      subject         = body.subject || "(no subject)";
      htmlBody        = body.html_body || "<p>(no content)</p>";
      plainBody       = body.plain_body;
      fromName        = body.from_name || "SSBM Notifications";
      fromEmail       = body.from_email || "noreply@notifications.ssbm.gov.kn";
      recipientFilter = body.recipient_filter || "all";
      customEmails    = body.recipient_emails;

      const { data: newCamp, error: createErr } = await supabase
        .from("email_campaigns")
        .insert({
          name, subject, html_body: htmlBody, plain_body: plainBody,
          from_name: fromName, from_email: fromEmail,
          recipient_filter: recipientFilter,
          recipient_emails: customEmails,
          status: "sending",
          triggered_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (createErr || !newCamp) throw new Error("Failed to create campaign: " + createErr?.message);
      campaignId = newCamp.id;
    }

    // Mark campaign as sending
    await supabase
      .from("email_campaigns")
      .update({ status: "sending", triggered_at: new Date().toISOString() })
      .eq("id", campaignId);

    // ── RESOLVE RECIPIENTS ───────────────────────────────────────────────────
    let recipients: { email: string; name: string }[] = [];

    if (recipientFilter === "custom" && customEmails?.length) {
      recipients = customEmails.map((e) => ({ email: e, name: e }));
    } else {
      let query = supabase
        .from("profiles")
        .select("email, full_name")
        .not("email", "is", null);

      if (recipientFilter === "active") {
        query = query.eq("is_active", true);
      }

      const { data: users, error: usersErr } = await query;
      if (usersErr) throw new Error("Failed to fetch recipients: " + usersErr.message);
      recipients = (users || []).map((u: any) => ({ email: u.email, name: u.full_name || u.email }));
    }

    if (recipients.length === 0) {
      const errMsg = "No recipients found matching the selected filter.";
      await supabase
        .from("email_campaigns")
        .update({ status: "failed", error_message: errMsg, completed_at: new Date().toISOString() })
        .eq("id", campaignId);
      await logSystemError(supabase, errMsg, "NoRecipientsError", "EmailCampaign", campaignId, undefined, correlationId);
      return new Response(
        JSON.stringify({ success: false, error: errMsg }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    await supabase
      .from("email_campaigns")
      .update({ total_recipients: recipients.length })
      .eq("id", campaignId);

    // ── SEND IN BATCHES ──────────────────────────────────────────────────────
    let sentCount = 0;
    let failedCount = 0;
    const failedRecipients: { email: string; reason: string }[] = [];

    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);

      for (const recipient of batch) {
        const perStart = performance.now();
        const result = await sendViaResend(
          resendApiKey,
          recipient.email,
          subject,
          htmlBody,
          plainBody,
          fromName,
          fromEmail
        );
        const perMs = Math.round(performance.now() - perStart);

        const isSuccess = !!result.id;
        const failureReason = result.error || null;

        const logEntry = {
          channel: "email" as const,
          recipient_address: recipient.email,
          subject,
          body: htmlBody,
          status: isSuccess ? "sent" : "failed",
          sent_at: isSuccess ? new Date().toISOString() : null,
          failure_reason: failureReason,
          trigger_source: "email_campaign",
          resend_message_id: result.id ?? null,
          campaign_id: campaignId,
          metadata: {
            campaign_name: name,
            from_name: fromName,
            from_email: fromEmail,
            http_status: result.statusCode,
            execution_ms: perMs,
          },
        };

        await supabase.from("notification_logs").insert(logEntry);

        if (isSuccess) {
          sentCount++;
          await logTechnical(supabase, "resend_send_email", "EmailCampaign", "success", perMs, campaignId, undefined, correlationId);
        } else {
          failedCount++;
          failedRecipients.push({ email: recipient.email, reason: failureReason || "Unknown" });

          // Log each failure individually to system_error_logs
          await logSystemError(
            supabase,
            `Email delivery failed to ${recipient.email}: ${failureReason}`,
            "ResendDeliveryError",
            "EmailCampaign",
            campaignId,
            `HTTP ${result.statusCode} - ${failureReason}`,
            correlationId,
          );
          await logTechnical(supabase, "resend_send_email", "EmailCampaign", "failed", perMs, campaignId, failureReason || undefined, correlationId);
        }
      }

      if (i + BATCH_SIZE < recipients.length) {
        await sleep(500);
      }
    }

    const finalStatus = sentCount === 0 ? "failed" : "completed";
    const campaignError = failedCount > 0
      ? `${failedCount} of ${recipients.length} emails failed. First error: ${failedRecipients[0]?.reason}`
      : null;

    await supabase
      .from("email_campaigns")
      .update({
        status: finalStatus,
        sent_count: sentCount,
        failed_count: failedCount,
        completed_at: new Date().toISOString(),
        error_message: campaignError,
      })
      .eq("id", campaignId);

    const executionMs = Math.round(performance.now() - startTime);

    // Log overall campaign technical entry
    await logTechnical(
      supabase,
      "email_campaign_run",
      "EmailCampaign",
      finalStatus === "completed" ? "success" : "failed",
      executionMs,
      campaignId,
      campaignError || undefined,
      correlationId,
    );

    console.log(`Campaign ${campaignId} done. Sent: ${sentCount}, Failed: ${failedCount}, Time: ${executionMs}ms`);

    return new Response(
      JSON.stringify({
        success: finalStatus === "completed",
        campaign_id: campaignId,
        total_recipients: recipients.length,
        sent_count: sentCount,
        failed_count: failedCount,
        failed_details: failedRecipients,
        execution_ms: executionMs,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    const executionMs = Math.round(performance.now() - startTime);
    const errMsg = error?.message || String(error);
    console.error("Campaign fatal error:", errMsg);

    // Write fatal error to monitoring
    await logSystemError(supabase, errMsg, "CampaignFatalError", "EmailCampaign", undefined, error?.stack, correlationId);
    await logTechnical(supabase, "email_campaign_run", "EmailCampaign", "failed", executionMs, undefined, errMsg, correlationId);

    return new Response(
      JSON.stringify({ success: false, error: errMsg }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
