// Edge Function: c3-template-test-send
// Sends a test email for any active C3 email template (sandbox).
// Server-side variable substitution + ⚠ TEST EMAIL banner + Resend send + audit log.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BodySchema = z.object({
  template_id: z.string().uuid(),
  recipient_email: z.string().email().max(255),
  variables: z.record(z.string(), z.string().max(2000)).default({}),
});

// ── In-memory rate limit: 5 sends / minute / user ──
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60_000;
const userSendLog = new Map<string, number[]>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const arr = (userSendLog.get(userId) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (arr.length >= RATE_LIMIT) return false;
  arr.push(now);
  userSendLog.set(userId, arr);
  return true;
}

function substitute(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{\s*([a-zA-Z_][\w]*)\s*\}\}/g, (_m, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : `{{${key}}}`
  );
}

const TEST_BANNER_HTML = `
<div style="background:#FEF3C7;border:1px solid #F59E0B;color:#92400E;padding:12px 16px;border-radius:8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;margin-bottom:16px;">
  <strong>⚠ TEST EMAIL — Sandbox</strong><br/>
  This is a test email sent from the C3 Email Templates sandbox. Do not act on its contents.
</div>
`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startTime = performance.now();
  const correlationId = crypto.randomUUID();

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    // ── Auth ──
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ success: false, error: "Missing auth token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: userData, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !userData?.user) {
      return new Response(JSON.stringify({ success: false, error: "Invalid auth token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = userData.user;

    // ── Rate limit ──
    if (!checkRateLimit(user.id)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Rate limit exceeded — max ${RATE_LIMIT} test sends per minute. Please wait.`,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Validate body ──
    const raw = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid input", details: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const { template_id, recipient_email, variables } = parsed.data;

    // ── Load template ──
    const { data: tpl, error: tplErr } = await supabase
      .from("c3_email_templates")
      .select("template_key, template_name, subject, html_body, text_body, is_active, is_deleted")
      .eq("id", template_id)
      .maybeSingle();

    if (tplErr || !tpl) {
      return new Response(JSON.stringify({ success: false, error: "Template not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (tpl.is_deleted) {
      return new Response(JSON.stringify({ success: false, error: "Template is deleted" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Resolve user_code for audit ──
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_code, full_name")
      .eq("id", user.id)
      .maybeSingle();
    const userCode = profile?.user_code || user.email || "unknown";

    // ── Substitute + prepend banner ──
    const renderedSubject = `[TEST] ${substitute(tpl.subject || "", variables)}`;
    const renderedBody = TEST_BANNER_HTML + substitute(tpl.html_body || "", variables);
    const renderedText = tpl.text_body ? substitute(tpl.text_body, variables) : undefined;

    // ── Send via Resend ──
    if (!RESEND_API_KEY) {
      await supabase.from("system_technical_logs").insert({
        correlation_id: correlationId,
        api_name: "c3-template-test-send",
        module: "C3 Email Templates",
        entity_type: "email_template",
        entity_id: template_id,
        severity: "error",
        status: "failed",
        user_id: user.id,
        payload_json: { user_code: userCode, recipient_email, template_key: tpl.template_key },
        response_payload: { error: "RESEND_API_KEY missing" },
      });
      return new Response(
        JSON.stringify({ success: false, error: "Email service not configured (RESEND_API_KEY missing)" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendBody: Record<string, unknown> = {
      from: "C3 Sandbox <Audit@secureserve.biz>",
      to: [recipient_email],
      subject: renderedSubject,
      html: renderedBody,
    };
    if (renderedText) resendBody.text = renderedText;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(resendBody),
    });

    const resendJson = await resendRes.json().catch(() => ({}));
    const ok = resendRes.ok;
    const executionTime = Math.round(performance.now() - startTime);

    await supabase.from("system_technical_logs").insert({
      correlation_id: correlationId,
      api_name: "c3-template-test-send",
      module: "C3 Email Templates",
      entity_type: "email_template",
      entity_id: template_id,
      severity: ok ? "info" : "error",
      status: ok ? "success" : "failed",
      user_id: user.id,
      execution_time_ms: executionTime,
      payload_json: {
        user_code: userCode,
        recipient_email,
        template_key: tpl.template_key,
        variables,
      },
      response_payload: ok ? { resend_id: resendJson?.id } : { error: resendJson },
    });

    if (!ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: resendJson?.message || `Resend failed with status ${resendRes.status}`,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, resend_id: resendJson?.id, recipient: recipient_email }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("c3-template-test-send error:", msg);
    await supabase.from("system_technical_logs").insert({
      correlation_id: correlationId,
      api_name: "c3-template-test-send",
      module: "C3 Email Templates",
      severity: "error",
      status: "failed",
      stack_trace: err instanceof Error ? err.stack ?? null : null,
      response_payload: { error: msg },
    });
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
