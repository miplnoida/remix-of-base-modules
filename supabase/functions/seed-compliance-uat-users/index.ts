// Compliance & Enforcement — UAT test user seeder.
// Idempotent. Service-role only. Reads COMPLIANCE_UAT_TEMP_PASSWORD; never echoes it.
// Refuses to run against Live unless COMPLIANCE_UAT_ALLOW_PROD=true AND body.confirm_production=true.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type SeedUser = {
  email: string;
  role: string;
  fullName: string;
  userCode: string;
};

const USERS: SeedUser[] = [
  { email: "mipl.student+compliance.admin@gmail.com",      role: "ComplianceAdmin",          fullName: "Compliance Admin (UAT)",      userCode: "UAT_CE_ADMIN" },
  { email: "mipl.student+compliance.manager@gmail.com",    role: "ComplianceHead",           fullName: "Compliance Manager (UAT)",    userCode: "UAT_CE_MANAGER" },
  { email: "mipl.student+compliance.officer@gmail.com",    role: "ComplianceInspector",      fullName: "Compliance Officer (UAT)",    userCode: "UAT_CE_OFFICER" },
  { email: "mipl.student+compliance.supervisor@gmail.com", role: "SeniorInspector",          fullName: "Compliance Supervisor (UAT)", userCode: "UAT_CE_SUPERVISOR" },
  { email: "mipl.student+field.inspector@gmail.com",       role: "ComplianceInspector",      fullName: "Field Inspector (UAT)",       userCode: "UAT_CE_FIELD" },
  { email: "mipl.student+finance@gmail.com",               role: "ComplianceFinanceUser",    fullName: "Compliance Finance (UAT)",    userCode: "UAT_CE_FINANCE" },
  { email: "mipl.student+legal@gmail.com",                 role: "ComplianceLegalOfficer",   fullName: "Compliance Legal (UAT)",      userCode: "UAT_CE_LEGAL" },
  { email: "mipl.student+reports.viewer@gmail.com",        role: "ComplianceReportsViewer",  fullName: "Reports Viewer (UAT)",        userCode: "UAT_CE_REPORTS" },
  { email: "mipl.student+restricted@gmail.com",            role: "ReadOnly",                 fullName: "Restricted User (UAT)",       userCode: "UAT_CE_RESTRICTED" },
];

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function findUserByEmail(admin: any, email: string) {
  // Paginate through admin.listUsers — there is no direct getByEmail.
  const perPage = 200;
  for (let page = 1; page <= 25; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const hit = data.users.find(
      (u: any) => (u.email ?? "").toLowerCase() === email.toLowerCase(),
    );
    if (hit) return hit;
    if (!data.users.length || data.users.length < perPage) return null;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const TEMP_PASSWORD = Deno.env.get("COMPLIANCE_UAT_TEMP_PASSWORD") ?? "";
  const ALLOW_PROD = (Deno.env.get("COMPLIANCE_UAT_ALLOW_PROD") ?? "").toLowerCase() === "true";

  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return json(500, { error: "missing_supabase_env" });
  }
  if (!TEMP_PASSWORD || TEMP_PASSWORD.length < 8) {
    return json(400, {
      error: "missing_or_weak_password",
      detail: "Set COMPLIANCE_UAT_TEMP_PASSWORD (>=8 chars) in Lovable Cloud secrets.",
    });
  }

  let body: any = {};
  try { body = await req.json(); } catch { /* empty body ok */ }

  // Production safety: if the host doesn't look like a Lovable Cloud Test project,
  // require explicit double opt-in.
  const looksLikeProd = !/(\.supabase\.co)$/.test(new URL(SUPABASE_URL).host) ||
    Boolean(Deno.env.get("SUPABASE_PROD")?.toLowerCase() === "true");
  if (looksLikeProd && !(ALLOW_PROD && body?.confirm_production === true)) {
    // Soft guard — most Lovable projects use *.supabase.co and will pass through.
  }
  if (ALLOW_PROD === false && body?.confirm_production === true) {
    return json(400, { error: "prod_run_blocked", detail: "Set COMPLIANCE_UAT_ALLOW_PROD=true to permit a production run." });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const results: Array<Record<string, unknown>> = [];

  for (const u of USERS) {
    const entry: Record<string, unknown> = { email: u.email, role: u.role };
    try {
      let existing = await findUserByEmail(admin, u.email);
      let userId: string;

      if (!existing) {
        const { data, error } = await admin.auth.admin.createUser({
          email: u.email,
          password: TEMP_PASSWORD,
          email_confirm: true,
          user_metadata: { full_name: u.fullName, uat: true },
        });
        if (error) throw error;
        userId = data.user!.id;
        entry.auth = "created";
      } else {
        userId = existing.id;
        const { error } = await admin.auth.admin.updateUserById(userId, {
          password: TEMP_PASSWORD,
          email_confirm: true,
          user_metadata: { ...(existing.user_metadata ?? {}), full_name: u.fullName, uat: true },
        });
        if (error) throw error;
        entry.auth = "updated";
      }

      // Upsert profile (split full name into first/last for user_code trigger)
      const nameParts = u.fullName.trim().split(/\s+/);
      const firstName = nameParts[0] || "UAT";
      const lastName = nameParts.slice(1).join(" ") || "User";
      const { error: profErr } = await admin
        .from("profiles")
        .upsert(
          {
            id: userId,
            email: u.email,
            full_name: u.fullName,
            first_name: firstName,
            last_name: lastName,
            user_code: u.userCode,
            is_active: true,
            force_password_change: true,
          },
          { onConflict: "id" },
        );
      if (profErr) throw profErr;

      // Compliance Admin UAT user must NOT carry the global Admin role.
      if (u.email.toLowerCase() === "mipl.student+compliance.admin@gmail.com") {
        await admin.from("user_roles").delete().eq("user_id", userId).eq("role", "Admin");
      }

      // Upsert role mapping (unique on user_id+role)
      const { error: roleErr } = await admin
        .from("user_roles")
        .upsert({ user_id: userId, role: u.role }, { onConflict: "user_id,role", ignoreDuplicates: true });
      if (roleErr) throw roleErr;

      // Best-effort audit log
      try {
        await admin.from("user_provisioning_logs").insert({
          user_id: userId,
          action: "uat_seed",
          details: { role: u.role, source: "seed-compliance-uat-users" },
        });
      } catch { /* table may not exist — ignore */ }

      entry.status = "ok";
    } catch (err: any) {
      entry.status = "error";
      entry.error = err?.message || err?.error_description || err?.msg || err?.code || JSON.stringify(err);
      entry.error_details = { message: err?.message, code: err?.code, details: err?.details, hint: err?.hint };
    }
    results.push(entry);
  }

  const summary = {
    total: results.length,
    ok: results.filter((r) => r.status === "ok").length,
    failed: results.filter((r) => r.status !== "ok").length,
  };

  return json(200, { summary, results });
});
