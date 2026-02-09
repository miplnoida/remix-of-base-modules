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
    const { token, email, deviceFingerprint, userAgent } = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing verification token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const secretKey = Deno.env.get("CLOUDFLARE_TURNSTILE_SECRET_KEY");

    // Get client IP from headers
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";

    // Create Supabase admin client for logging
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Handle case where Turnstile was unavailable on client (e.g. blocked by iframe/ad-blocker)
    if (token === "turnstile-unavailable") {
      await supabaseAdmin.from("login_security_events").insert({
        user_email: email || null,
        ip_address: ip,
        device_fingerprint: deviceFingerprint || null,
        user_agent: userAgent || null,
        verification_result: "skipped",
        risk_level: "medium",
        turnstile_token_valid: false,
        failure_reason: "Turnstile widget unavailable on client",
      });

      return new Response(
        JSON.stringify({ success: false, error: "Verification unavailable", riskLevel: "medium" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!secretKey) {
      console.error("CLOUDFLARE_TURNSTILE_SECRET_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Verification service misconfigured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limiting: check recent attempts from this IP
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { count: recentAttempts } = await supabaseAdmin
      .from("login_security_events")
      .select("*", { count: "exact", head: true })
      .eq("ip_address", ip)
      .gte("created_at", fiveMinutesAgo);

    if ((recentAttempts ?? 0) > 20) {
      // Log rate limit hit
      await supabaseAdmin.from("login_security_events").insert({
        user_email: email || null,
        ip_address: ip,
        device_fingerprint: deviceFingerprint || null,
        user_agent: userAgent || null,
        verification_result: "rate_limited",
        risk_level: "high",
        turnstile_token_valid: false,
        failure_reason: "Rate limit exceeded (>20 attempts in 5 min)",
      });

      return new Response(
        JSON.stringify({ success: false, error: "Too many attempts. Please try again later." }),
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

    // Determine risk level
    let riskLevel = "low";
    if (!verifyResult.success) {
      riskLevel = "high";
    } else if ((recentAttempts ?? 0) > 10) {
      riskLevel = "medium";
    }

    // Log the verification event
    await supabaseAdmin.from("login_security_events").insert({
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
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, riskLevel }),
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
