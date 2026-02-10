import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action } = body;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";

    // ── ACTION: update-outcome ──
    // Called after credential check to update an existing security event
    if (action === "update-outcome") {
      const { eventId, loginSuccess, failureReason, userId } = body;

      if (!eventId) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing eventId" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const updateData: Record<string, unknown> = {
        login_success: loginSuccess === true,
      };
      if (failureReason) updateData.failure_reason = failureReason;
      if (userId) updateData.user_id = userId;

      const { error: updateError } = await supabaseAdmin
        .from("login_security_events")
        .update(updateData)
        .eq("id", eventId);

      if (updateError) {
        console.error("Failed to update security event:", updateError);
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

    // ── DEFAULT ACTION: verify token ──
    const { token, email, deviceFingerprint, userAgent } = body;

    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing verification token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle turnstile unavailable (blocked by iframe/ad-blocker)
    if (token === "turnstile-unavailable") {
      const { data: inserted } = await supabaseAdmin
        .from("login_security_events")
        .insert({
          user_email: email || null,
          ip_address: ip,
          device_fingerprint: deviceFingerprint || null,
          user_agent: userAgent || null,
          verification_result: "skipped",
          risk_level: "medium",
          turnstile_token_valid: false,
          failure_reason: "Turnstile widget unavailable on client (preview/iframe)",
          login_success: false,
        })
        .select("id")
        .single();

      return new Response(
        JSON.stringify({
          success: true, // allow login to proceed
          skipped: true,
          riskLevel: "medium",
          eventId: inserted?.id || null,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const secretKey = Deno.env.get("CLOUDFLARE_TURNSTILE_SECRET_KEY");

    if (!secretKey) {
      console.error("CLOUDFLARE_TURNSTILE_SECRET_KEY not configured");
      // Still log the attempt
      const { data: inserted } = await supabaseAdmin
        .from("login_security_events")
        .insert({
          user_email: email || null,
          ip_address: ip,
          device_fingerprint: deviceFingerprint || null,
          user_agent: userAgent || null,
          verification_result: "skipped",
          risk_level: "medium",
          turnstile_token_valid: false,
          failure_reason: "Server: CLOUDFLARE_TURNSTILE_SECRET_KEY not configured",
          login_success: false,
        })
        .select("id")
        .single();

      return new Response(
        JSON.stringify({ success: true, skipped: true, riskLevel: "medium", eventId: inserted?.id || null }),
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
      const { data: inserted } = await supabaseAdmin
        .from("login_security_events")
        .insert({
          user_email: email || null,
          ip_address: ip,
          device_fingerprint: deviceFingerprint || null,
          user_agent: userAgent || null,
          verification_result: "rate_limited",
          risk_level: "high",
          turnstile_token_valid: false,
          failure_reason: "Rate limit exceeded (>20 attempts in 5 min)",
          login_success: false,
        })
        .select("id")
        .single();

      return new Response(
        JSON.stringify({ success: false, error: "Too many attempts. Please try again later.", eventId: inserted?.id || null }),
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
          response: token,
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

    // Insert security event (login_success starts as false, updated later)
    const { data: inserted } = await supabaseAdmin
      .from("login_security_events")
      .insert({
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
      })
      .select("id")
      .single();

    if (!verifyResult.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Human verification failed. Please try again.",
          riskLevel,
          eventId: inserted?.id || null,
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, riskLevel, eventId: inserted?.id || null }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Turnstile verification error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Verification service error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
