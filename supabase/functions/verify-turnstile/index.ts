import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getSupabaseAdmin() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

/** Read Cloudflare config from system_settings */
async function getCloudflareConfig(supabaseAdmin: ReturnType<typeof getSupabaseAdmin>) {
  const { data: rows } = await supabaseAdmin
    .from("system_settings")
    .select("setting_key, setting_value")
    .in("setting_key", ["cloudflare_enabled", "cloudflare_allowed_risk_level"]);

  const config: Record<string, string> = {};
  (rows || []).forEach((r: { setting_key: string; setting_value: string }) => {
    config[r.setting_key] = r.setting_value;
  });

  return {
    enabled: config["cloudflare_enabled"] !== "false", // default ON
    allowedRiskLevel: (config["cloudflare_allowed_risk_level"] || "LOW").toUpperCase(),
  };
}

/** Check if the given risk level is allowed by the configured threshold */
function isRiskAllowed(riskLevel: string, allowedThreshold: string): boolean {
  const levels: Record<string, number> = { low: 1, medium: 2, high: 3 };
  const risk = levels[riskLevel.toLowerCase()] || 1;
  const threshold = levels[allowedThreshold.toLowerCase()] || 1;
  return risk <= threshold;
}

async function insertSecurityEvent(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  eventData: Record<string, unknown>
) {
  const { data } = await supabaseAdmin
    .from("login_security_events")
    .insert(eventData)
    .select("id")
    .single();
  return data?.id || null;
}

// ── ACTION HANDLERS ──

async function handleUpdateOutcome(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  body: Record<string, unknown>
) {
  const { eventId, loginSuccess, failureReason, userId } = body;
  if (!eventId) {
    return new Response(
      JSON.stringify({ success: false, error: "Missing eventId" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const updateData: Record<string, unknown> = { login_success: loginSuccess === true };
  if (failureReason) updateData.failure_reason = failureReason;
  if (userId) updateData.user_id = userId;

  const { error } = await supabaseAdmin
    .from("login_security_events")
    .update(updateData)
    .eq("id", eventId);

  if (error) {
    console.error("Failed to update security event:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Failed to update event" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleGetConfig(supabaseAdmin: ReturnType<typeof getSupabaseAdmin>) {
  const config = await getCloudflareConfig(supabaseAdmin);
  return new Response(
    JSON.stringify({ success: true, ...config }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleVerify(
  req: Request,
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  body: Record<string, unknown>
) {
  const { token, email, deviceFingerprint, userAgent } = body;
  const ip = getClientIp(req);

  if (!token) {
    return new Response(
      JSON.stringify({ success: false, error: "Missing verification token" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Read server-side config
  const config = await getCloudflareConfig(supabaseAdmin);

  // If Cloudflare is disabled via settings, skip verification but log it
  if (!config.enabled) {
    const eventId = await insertSecurityEvent(supabaseAdmin, {
      user_email: email || null,
      ip_address: ip,
      device_fingerprint: deviceFingerprint || null,
      user_agent: userAgent || null,
      verification_result: "skipped",
      risk_level: "low",
      turnstile_token_valid: false,
      failure_reason: "Cloudflare verification disabled via Global Settings",
      login_success: false,
    });

    return new Response(
      JSON.stringify({ success: true, skipped: true, riskLevel: "low", eventId, configDisabled: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Handle turnstile unavailable (blocked by iframe/ad-blocker)
  if (token === "turnstile-unavailable") {
    const eventId = await insertSecurityEvent(supabaseAdmin, {
      user_email: email || null,
      ip_address: ip,
      device_fingerprint: deviceFingerprint || null,
      user_agent: userAgent || null,
      verification_result: "skipped",
      risk_level: "medium",
      turnstile_token_valid: false,
      failure_reason: "Turnstile widget unavailable on client (preview/iframe)",
      login_success: false,
    });

    // Check if medium risk is allowed
    if (!isRiskAllowed("medium", config.allowedRiskLevel)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Human verification is required but unavailable. Please try a different browser.",
          riskLevel: "medium",
          eventId,
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, skipped: true, riskLevel: "medium", eventId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const secretKey = Deno.env.get("CLOUDFLARE_TURNSTILE_SECRET_KEY");

  if (!secretKey) {
    console.error("CLOUDFLARE_TURNSTILE_SECRET_KEY not configured");
    const eventId = await insertSecurityEvent(supabaseAdmin, {
      user_email: email || null,
      ip_address: ip,
      device_fingerprint: deviceFingerprint || null,
      user_agent: userAgent || null,
      verification_result: "skipped",
      risk_level: "medium",
      turnstile_token_valid: false,
      failure_reason: "Server: CLOUDFLARE_TURNSTILE_SECRET_KEY not configured",
      login_success: false,
    });

    return new Response(
      JSON.stringify({ success: true, skipped: true, riskLevel: "medium", eventId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Rate limiting
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { count: recentAttempts } = await supabaseAdmin
    .from("login_security_events")
    .select("*", { count: "exact", head: true })
    .eq("ip_address", ip)
    .gte("created_at", fiveMinutesAgo);

  if ((recentAttempts ?? 0) > 20) {
    const eventId = await insertSecurityEvent(supabaseAdmin, {
      user_email: email || null,
      ip_address: ip,
      device_fingerprint: deviceFingerprint || null,
      user_agent: userAgent || null,
      verification_result: "rate_limited",
      risk_level: "high",
      turnstile_token_valid: false,
      failure_reason: "Rate limit exceeded (>20 attempts in 5 min)",
      login_success: false,
    });

    return new Response(
      JSON.stringify({ success: false, error: "Too many attempts. Please try again later.", eventId }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Verify token with Cloudflare
  const verifyResponse = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: secretKey,
        response: token as string,
        remoteip: ip,
      }),
    }
  );

  const verifyResult = await verifyResponse.json();

  let riskLevel = "low";
  if (!verifyResult.success) {
    riskLevel = "high";
  } else if ((recentAttempts ?? 0) > 10) {
    riskLevel = "medium";
  }

  const eventId = await insertSecurityEvent(supabaseAdmin, {
    user_email: email || null,
    ip_address: ip,
    device_fingerprint: deviceFingerprint || null,
    user_agent: userAgent || null,
    verification_result: verifyResult.success ? "passed" : "failed",
    risk_level: riskLevel,
    turnstile_token_valid: verifyResult.success === true,
    failure_reason: verifyResult.success
      ? null
      : (verifyResult["error-codes"]?.join(", ") || "Verification failed"),
    login_success: false,
    metadata: {
      challenge_ts: verifyResult.challenge_ts,
      hostname: verifyResult.hostname,
      error_codes: verifyResult["error-codes"],
      action: verifyResult.action,
      cdata: verifyResult.cdata,
    },
  });

  if (!verifyResult.success) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Human verification failed. Please try again.",
        riskLevel,
        eventId,
      }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Check risk level against config
  if (!isRiskAllowed(riskLevel, config.allowedRiskLevel)) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Login blocked due to elevated risk level. Please try again later.",
        riskLevel,
        eventId,
        riskBlocked: true,
      }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ success: true, riskLevel, eventId }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// ── MAIN HANDLER ──

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action } = body;
    const supabaseAdmin = getSupabaseAdmin();

    if (action === "update-outcome") {
      return await handleUpdateOutcome(supabaseAdmin, body);
    }

    if (action === "get-config") {
      return await handleGetConfig(supabaseAdmin);
    }

    return await handleVerify(req, supabaseAdmin, body);
  } catch (error) {
    console.error("Turnstile verification error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Verification service error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
