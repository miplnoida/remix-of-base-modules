// EPIC CH-S3 — Sender verification probe (provider + DNS).
//
// Admin-only. Read-only against providers. NEVER sends email.
// NEVER returns or logs the Resend API key.
//
// Actions:
//   - provider_probe   : query Resend domains API (read-only) for the sender's domain
//   - dns_probe        : DNS-over-HTTPS lookup for SPF/DKIM/DMARC/MX
//   - combined_probe   : both, sequentially
//
// Input:
//   { sender_profile_id: string, action: 'provider_probe'|'dns_probe'|'combined_probe',
//     reason: string, dkim_selector?: string }
//
// Every probe writes:
//   - communication_hub_sender_profile (status columns + summary)
//   - communication_hub_control_audit  (source=sender-verification-console)

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-correlation-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

type DnsStatus = "valid" | "invalid" | "pending" | "unknown" | "not_applicable";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}

// ---------- DNS-over-HTTPS ------------------------------------------------
async function dohQuery(name: string, type: string): Promise<string[]> {
  const url = `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`;
  try {
    const r = await fetch(url, { headers: { accept: "application/dns-json" } });
    if (!r.ok) return [];
    const j = await r.json();
    const answers = Array.isArray(j?.Answer) ? j.Answer : [];
    return answers
      .map((a: any) => String(a?.data ?? ""))
      .filter(Boolean);
  } catch {
    return [];
  }
}

function classifySpf(records: string[]): DnsStatus {
  const spf = records.map(r => r.replace(/^"|"$/g, "")).find(r => r.toLowerCase().startsWith("v=spf1"));
  if (!spf) return "invalid";
  // Reasonable positive marker: contains resend or a mechanism
  return /include:|~all|-all|\+all/i.test(spf) ? "valid" : "pending";
}

function classifyDmarc(records: string[]): DnsStatus {
  const dmarc = records.map(r => r.replace(/^"|"$/g, "")).find(r => r.toLowerCase().startsWith("v=dmarc1"));
  if (!dmarc) return "invalid";
  return /p=(none|quarantine|reject)/i.test(dmarc) ? "valid" : "pending";
}

function classifyDkim(records: string[]): DnsStatus {
  if (!records.length) return "invalid";
  const joined = records.join(" ").replace(/"/g, "");
  return /v=dkim1/i.test(joined) && /p=[A-Za-z0-9+/=]+/i.test(joined) ? "valid" : "pending";
}

async function runDnsProbe(domain: string, selector: string | null) {
  const [spfR, dmarcR, mxR] = await Promise.all([
    dohQuery(domain, "TXT"),
    dohQuery(`_dmarc.${domain}`, "TXT"),
    dohQuery(domain, "MX"),
  ]);
  const dkimR = selector
    ? await dohQuery(`${selector}._domainkey.${domain}`, "TXT")
    : [];

  const spf_status = classifySpf(spfR);
  const dmarc_status = classifyDmarc(dmarcR);
  const dkim_status: DnsStatus = selector ? classifyDkim(dkimR) : "unknown";
  const mx_present = mxR.length > 0;

  return {
    ok: true,
    domain,
    selector,
    spf_status,
    dkim_status,
    dmarc_status,
    mx_present,
    // Only safe, non-secret excerpts
    samples: {
      spf: spfR.slice(0, 3).map(s => s.slice(0, 200)),
      dmarc: dmarcR.slice(0, 3).map(s => s.slice(0, 200)),
      dkim_present: dkimR.length,
      mx_count: mxR.length,
    },
  };
}

// ---------- Resend provider probe -----------------------------------------
async function runProviderProbe(domain: string) {
  const key = Deno.env.get("RESEND_API_KEY") ?? "";
  if (!key) {
    return { ok: false, unavailable: true, reason: "provider_probe_unavailable_no_key" };
  }
  try {
    const r = await fetch("https://api.resend.com/domains", {
      headers: { authorization: `Bearer ${key}`, accept: "application/json" },
    });
    const status = r.status;
    if (!r.ok) {
      // Do NOT include response body — could leak account context.
      return { ok: false, unavailable: true, reason: `provider_http_${status}` };
    }
    const j = await r.json();
    const list: any[] = Array.isArray(j?.data) ? j.data : Array.isArray(j) ? j : [];
    const match = list.find((d: any) =>
      String(d?.name ?? "").toLowerCase() === domain.toLowerCase()
    );
    if (!match) {
      return {
        ok: true,
        found: false,
        provider_identity_status: "pending" as const,
        domain_verified: false,
        summary: { checked_at: new Date().toISOString(), domain, provider: "resend", present: false },
      };
    }
    const providerStatus = String(match?.status ?? "").toLowerCase();
    const verified = providerStatus === "verified";
    return {
      ok: true,
      found: true,
      provider_identity_id: String(match?.id ?? "") || null,
      provider_identity_status: verified ? "verified" as const : "pending" as const,
      domain_verified: verified,
      // Safe summary — no keys/tokens
      summary: {
        checked_at: new Date().toISOString(),
        domain,
        provider: "resend",
        present: true,
        status: providerStatus,
        region: match?.region ?? null,
        created_at: match?.created_at ?? null,
      },
    };
  } catch (_e) {
    return { ok: false, unavailable: true, reason: "provider_probe_error" };
  }
}

// -------------------------------------------------------------------------

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  if (!SUPABASE_URL || !SERVICE_ROLE || !ANON_KEY) {
    return json({ ok: false, error: "misconfigured" }, 503);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return json({ ok: false, error: "missing_authorization" }, 401);

  const authClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userRes, error: userErr } = await authClient.auth.getUser();
  if (userErr || !userRes?.user) return json({ ok: false, error: "invalid_token" }, 401);
  const actorUserId = userRes.user.id;

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: isAdmin, error: roleErr } = await admin.rpc("has_role", {
    _user_id: actorUserId, _role: "Admin",
  });
  if (roleErr || isAdmin !== true) {
    return json({ ok: false, error: "forbidden_admin_only" }, 403);
  }

  let body: any;
  try { body = await req.json(); } catch { return json({ ok: false, error: "invalid_json" }, 400); }

  const senderId = String(body?.sender_profile_id ?? "").trim();
  const action = String(body?.action ?? "") as "provider_probe" | "dns_probe" | "combined_probe";
  const reason = String(body?.reason ?? "").trim().slice(0, 500);
  const dkimSelectorIn = body?.dkim_selector != null ? String(body.dkim_selector).trim().slice(0, 100) : null;

  if (!senderId) return json({ ok: false, error: "missing_sender_profile_id" }, 400);
  if (!["provider_probe", "dns_probe", "combined_probe"].includes(action)) {
    return json({ ok: false, error: "invalid_action" }, 400);
  }
  if (!reason) return json({ ok: false, error: "reason_required" }, 400);

  const { data: profile, error: pErr } = await admin
    .from("communication_hub_sender_profile")
    .select("*")
    .eq("id", senderId)
    .maybeSingle();
  if (pErr || !profile) return json({ ok: false, error: "sender_not_found" }, 404);

  const fromEmail = String(profile.from_email);
  const domain = fromEmail.split("@")[1]?.toLowerCase() ?? "";
  if (!domain) return json({ ok: false, error: "invalid_from_email" }, 400);

  const selector = dkimSelectorIn || profile.dkim_selector || null;

  // Snapshot old values for audit
  const oldValues = {
    provider_identity_status: profile.provider_identity_status,
    domain_verified: profile.domain_verified,
    spf_status: profile.spf_status,
    dkim_status: profile.dkim_status,
    dmarc_status: profile.dmarc_status,
    dkim_selector: profile.dkim_selector,
    provider_identity_id: profile.provider_identity_id,
  };

  const patch: Record<string, unknown> = {
    last_checked_at: new Date().toISOString(),
    last_checked_by: actorUserId,
  };
  if (dkimSelectorIn) patch.dkim_selector = dkimSelectorIn;

  const result: Record<string, unknown> = { action, sender_profile_id: senderId, domain };

  // Provider probe
  if (action === "provider_probe" || action === "combined_probe") {
    const p = await runProviderProbe(domain);
    result.provider = p;
    if (p.ok && !("unavailable" in p)) {
      patch.provider_identity_status = p.provider_identity_status;
      patch.domain_verified = p.domain_verified;
      if ("provider_identity_id" in p && p.provider_identity_id) {
        patch.provider_identity_id = p.provider_identity_id;
      }
      patch.provider_last_response_summary = p.summary;
    } else {
      patch.provider_last_response_summary = {
        checked_at: new Date().toISOString(),
        domain,
        provider: "resend",
        unavailable: true,
        reason: (p as any).reason ?? "unavailable",
      };
    }
  }

  // DNS probe
  if (action === "dns_probe" || action === "combined_probe") {
    const d = await runDnsProbe(domain, selector);
    result.dns = d;
    patch.spf_status = d.spf_status;
    patch.dmarc_status = d.dmarc_status;
    if (selector) patch.dkim_status = d.dkim_status;
    // Append DNS summary into verification_notes-adjacent summary via provider summary if not set
    const existingSummary = (patch.provider_last_response_summary as any) ?? profile.provider_last_response_summary ?? {};
    patch.provider_last_response_summary = { ...existingSummary, dns_probe: d.samples, dns_checked_at: new Date().toISOString(), selector };
  }

  // Apply update
  const { error: updErr } = await admin
    .from("communication_hub_sender_profile")
    .update(patch)
    .eq("id", senderId);
  if (updErr) return json({ ok: false, error: "update_failed", detail: updErr.message }, 500);

  // Audit
  const newValues = {
    provider_identity_status: patch.provider_identity_status ?? oldValues.provider_identity_status,
    domain_verified: patch.domain_verified ?? oldValues.domain_verified,
    spf_status: patch.spf_status ?? oldValues.spf_status,
    dkim_status: patch.dkim_status ?? oldValues.dkim_status,
    dmarc_status: patch.dmarc_status ?? oldValues.dmarc_status,
    dkim_selector: patch.dkim_selector ?? oldValues.dkim_selector,
    provider_identity_id: patch.provider_identity_id ?? oldValues.provider_identity_id,
  };
  await admin.from("communication_hub_control_audit").insert({
    setting_key: `sender_profile_probe:${profile.profile_code}`,
    old_value: { ...oldValues, sender_profile_id: senderId, from_email: fromEmail, action },
    new_value: { ...newValues, sender_profile_id: senderId, from_email: fromEmail, action, result_summary: {
      provider_ok: (result as any).provider?.ok ?? null,
      provider_unavailable: (result as any).provider?.unavailable ?? null,
      dns_ok: (result as any).dns?.ok ?? null,
    } },
    reason,
    changed_by: actorUserId,
    source: "sender-verification-console",
  });

  return json({ ok: true, result, patch: newValues });
});
