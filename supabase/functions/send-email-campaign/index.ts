import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-correlation-id",
};

interface CampaignRequest {
  /** existing campaign id to send, OR compose inline */
  campaign_id?: string;
  /** inline compose fields */
  name?: string;
  subject?: string;
  html_body?: string;
  plain_body?: string;
  from_name?: string;
  from_email?: string;
  /** 'all' | 'active' | 'custom' */
  recipient_filter?: string;
  /** used when recipient_filter === 'custom' */
  recipient_emails?: string[];
  /** retry a failed notification_log */
  retry_log_id?: string;
}

const RESEND_API = "https://api.resend.com/emails";
const BATCH_SIZE = 50; // Resend batch limit
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
): Promise<{ id: string } | null> {
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

      if (res.ok) {
        return await res.json();
      }

      const errBody = await res.text();
      console.error(`Resend attempt ${attempt} failed (${res.status}):`, errBody);

      if (res.status === 429 || res.status >= 500) {
        await sleep(RETRY_DELAY_MS * attempt);
        continue;
      }
      // 4xx non-rate-limit → don't retry
      return null;
    } catch (err) {
      console.error(`Resend attempt ${attempt} threw:`, err);
      await sleep(RETRY_DELAY_MS * attempt);
    }
  }
  return null;
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
    return new Response(
      JSON.stringify({ success: false, error: "RESEND_API_KEY not configured" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body: CampaignRequest = await req.json();

    // ── RETRY SINGLE FAILED LOG ──────────────────────────────────────────────
    if (body.retry_log_id) {
      const { data: log, error: logErr } = await supabase
        .from("notification_logs")
        .select("*")
        .eq("id", body.retry_log_id)
        .single();

      if (logErr || !log) {
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

      if (result) {
        await supabase
          .from("notification_logs")
          .update({ status: "sent", resend_message_id: result.id, sent_at: new Date().toISOString(), failure_reason: null })
          .eq("id", log.id);
        return new Response(
          JSON.stringify({ success: true, resend_id: result.id }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      } else {
        await supabase
          .from("notification_logs")
          .update({ status: "failed", failure_reason: "All retry attempts exhausted" })
          .eq("id", log.id);
        return new Response(
          JSON.stringify({ success: false, error: "Delivery failed after retries" }),
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
      if (error || !camp) throw new Error("Campaign not found");

      campaignId   = camp.id;
      name         = camp.name;
      subject      = camp.subject;
      htmlBody     = camp.html_body;
      plainBody    = camp.plain_body;
      fromName     = camp.from_name;
      fromEmail    = camp.from_email;
      recipientFilter = camp.recipient_filter;
      customEmails = camp.recipient_emails;
    } else {
      // Create campaign record on-the-fly
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
      await supabase
        .from("email_campaigns")
        .update({ status: "failed", error_message: "No recipients found", completed_at: new Date().toISOString() })
        .eq("id", campaignId);
      return new Response(
        JSON.stringify({ success: false, error: "No recipients found" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Update total_recipients
    await supabase
      .from("email_campaigns")
      .update({ total_recipients: recipients.length })
      .eq("id", campaignId);

    // ── SEND IN BATCHES ──────────────────────────────────────────────────────
    let sentCount = 0;
    let failedCount = 0;

    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);

      for (const recipient of batch) {
        const result = await sendViaResend(
          resendApiKey,
          recipient.email,
          subject,
          htmlBody,
          plainBody,
          fromName,
          fromEmail
        );

        const logEntry = {
          channel: "email" as const,
          recipient_address: recipient.email,
          subject,
          body: htmlBody,
          status: result ? "sent" : "failed",
          sent_at: result ? new Date().toISOString() : null,
          failure_reason: result ? null : "Delivery failed after retries",
          trigger_source: "email_campaign",
          resend_message_id: result?.id ?? null,
          campaign_id: campaignId,
          metadata: { campaign_name: name, from_name: fromName, from_email: fromEmail },
        };

        await supabase.from("notification_logs").insert(logEntry);

        if (result) sentCount++;
        else failedCount++;
      }

      // Small pause between batches to respect rate limits
      if (i + BATCH_SIZE < recipients.length) {
        await sleep(500);
      }
    }

    const finalStatus = failedCount === 0 ? "completed" : sentCount === 0 ? "failed" : "completed";

    await supabase
      .from("email_campaigns")
      .update({
        status: finalStatus,
        sent_count: sentCount,
        failed_count: failedCount,
        completed_at: new Date().toISOString(),
      })
      .eq("id", campaignId);

    const executionMs = Math.round(performance.now() - startTime);
    console.log(`Campaign ${campaignId} done. Sent: ${sentCount}, Failed: ${failedCount}, Time: ${executionMs}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        campaign_id: campaignId,
        total_recipients: recipients.length,
        sent_count: sentCount,
        failed_count: failedCount,
        execution_ms: executionMs,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Campaign error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
