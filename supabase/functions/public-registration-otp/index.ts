import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API = "https://api.resend.com/emails";
const OTP_TTL_MINUTES = 10;
const MAX_SENDS_PER_HOUR = 5;
const MAX_VERIFY_ATTEMPTS = 5;

type Channel = "EMAIL" | "PHONE";

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function maskDestination(value: string, channel: Channel): string {
  if (channel === "EMAIL") {
    const [name, domain] = value.split("@");
    return `${name?.slice(0, 2) || "**"}***@${domain || "***"}`;
  }
  const digits = value.replace(/\D/g, "");
  return digits.length <= 4 ? "****" : `${"*".repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function generateOtp(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(100000 + (array[0] % 900000));
}

async function sendEmailOtp(to: string, otp: string): Promise<{ success: boolean; id?: string; error?: string }> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) return { success: false, error: "Email service is not configured" };

  const fromEmail = Deno.env.get("OTP_FROM_EMAIL") || "Audit@secureserve.biz";
  const fromName = Deno.env.get("OTP_FROM_NAME") || "Social Security Board";

  const res = await fetch(RESEND_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: `${fromName} <${fromEmail}>`,
      to: [to],
      subject: "Your Social Security verification code",
      html: `<!doctype html><html><body style="margin:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#1f2937"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:24px"><table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;background:#fff;border-radius:8px;overflow:hidden"><tr><td style="background:#0E5F3A;color:#fff;padding:22px 28px"><strong>Social Security Board</strong><div style="font-size:13px;color:#d8efe2;margin-top:4px">St. Kitts and Nevis</div></td></tr><tr><td style="padding:28px"><h1 style="font-size:22px;margin:0 0 14px">Verify your email</h1><p style="font-size:15px;line-height:1.5;margin:0 0 18px">Use this code to continue setting up your self-service account.</p><div style="font-size:30px;letter-spacing:6px;font-weight:700;background:#f1f5f9;border:1px solid #e5e7eb;border-radius:8px;padding:16px 18px;text-align:center">${otp}</div><p style="font-size:13px;color:#6b7280;margin:20px 0 0">This code expires in ${OTP_TTL_MINUTES} minutes. If you did not request it, you can ignore this email.</p></td></tr></table></td></tr></table></body></html>`,
      text: `Your Social Security verification code is ${otp}. It expires in ${OTP_TTL_MINUTES} minutes.`,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, error: data?.message || `Email send failed (${res.status})` };
  return { success: true, id: data?.id };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const secret = Deno.env.get("LOVABLE_API_KEY") || serviceKey;
  if (!supabaseUrl || !serviceKey || !secret) return json({ error: "Server configuration error" }, 500);

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  const supabase = createClient(supabaseUrl, serviceKey);
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) return json({ error: "Please sign in again before requesting a code." }, 401);

  let body: { action?: string; channel?: Channel; destination?: string; token?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request" }, 400);
  }

  const action = body.action;
  const channel = body.channel;
  const destination = (body.destination || "").trim();
  const userId = authData.user.id;

  if (channel !== "EMAIL" && channel !== "PHONE") return json({ error: "Invalid verification channel" }, 400);
  if (channel === "PHONE") return json({ error: "Phone code delivery is not configured yet. Please use email verification." }, 501);
  if (!destination || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destination)) return json({ error: "Enter a valid email address." }, 400);

  if (action === "send") {
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("external_verification_attempt")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("channel", channel)
      .gte("created_at", since);

    if ((count || 0) >= MAX_SENDS_PER_HOUR) return json({ error: "Too many code requests. Please try again later." }, 429);

    const otp = generateOtp();
    const otpHash = await sha256(`${userId}:${channel}:${destination.toLowerCase()}:${otp}:${secret}`);
    const messageId = crypto.randomUUID();

    const sendResult = await sendEmailOtp(destination, otp);
    await supabase.from("email_send_log").insert({
      message_id: messageId,
      template_name: "public-registration-otp",
      recipient_email: destination,
      status: sendResult.success ? "sent" : "failed",
      error_message: sendResult.error || null,
      metadata: { provider_message_id: sendResult.id || null, user_id: userId },
    });

    if (!sendResult.success) return json({ error: sendResult.error || "Could not send verification code." }, 500);

    await supabase.from("external_verification_attempt").insert({
      user_id: userId,
      channel,
      destination_masked: maskDestination(destination, channel),
      otp_hash: otpHash,
      status: "PENDING",
      expires_at: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString(),
    });

    return json({ success: true });
  }

  if (action === "verify") {
    const submitted = (body.token || "").trim();
    if (!/^\d{6}$/.test(submitted)) return json({ verified: false, error: "Enter the 6-digit code." }, 400);

    const { data: attempt, error } = await supabase
      .from("external_verification_attempt")
      .select("id, otp_hash, attempt_count, expires_at")
      .eq("user_id", userId)
      .eq("channel", channel)
      .eq("status", "PENDING")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !attempt) return json({ verified: false, error: "Code is incorrect or expired." }, 400);

    const submittedHash = await sha256(`${userId}:${channel}:${destination.toLowerCase()}:${submitted}:${secret}`);
    if (submittedHash !== attempt.otp_hash) {
      const nextCount = (attempt.attempt_count || 0) + 1;
      await supabase
        .from("external_verification_attempt")
        .update({ attempt_count: nextCount, status: nextCount >= MAX_VERIFY_ATTEMPTS ? "FAILED" : "PENDING" })
        .eq("id", attempt.id);
      return json({ verified: false, error: "Code is incorrect or expired." }, 400);
    }

    await supabase
      .from("external_verification_attempt")
      .update({ status: "VERIFIED", verified_at: new Date().toISOString() })
      .eq("id", attempt.id);

    return json({ verified: true });
  }

  return json({ error: "Invalid action" }, 400);
});