// Compliance Mobile API — dispatcher for ~40 compliance endpoints
// Auth: (X-API-Key + Authorization: Bearer <JWT>)
// Generic resource router for ce_* tables + custom field-ops handlers.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key, x-device-id",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function service() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

async function sha256(t: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
  return Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join("");
}

async function validateApiKey(apiKey: string, sb: ReturnType<typeof createClient>) {
  const hash = await sha256(apiKey);
  const { data } = await sb
    .from("public_api_keys")
    .select("id, status, expires_at, rate_limit_per_minute")
    .eq("key_hash", hash)
    .eq("status", "active")
    .maybeSingle();
  if (!data) return null;
  if (data.expires_at && new Date(data.expires_at as string) < new Date()) return null;
  return data;
}

// ── Whitelisted resources (table → allowed methods) ──
// SELECT-only resources are read-only mirrors; SELECT+INSERT+UPDATE for writeables.
const RESOURCES: Record<string, {
  table: string;
  methods: ("GET" | "POST" | "PATCH")[];
  pk?: string;
  // Optional column restriction for writes (security)
  writableColumns?: string[];
}> = {
  // Cases
  "cases": { table: "ce_cases", methods: ["GET", "POST", "PATCH"] },
  "case-violations": { table: "ce_case_violations", methods: ["GET", "POST"] },
  // Violations
  "violations": { table: "ce_violations", methods: ["GET", "POST", "PATCH"] },
  "violation-types": { table: "ce_violation_types", methods: ["GET"] },
  // Inspections (Field Ops)
  "inspections": { table: "ce_inspections", methods: ["GET", "POST", "PATCH"] },
  "audit-plans": { table: "ce_audit_plans", methods: ["GET"] },
  "plan-items": { table: "ce_plan_items", methods: ["GET", "PATCH"] },
  // Notices
  "notices": { table: "ce_notices", methods: ["GET", "POST", "PATCH"] },
  "notice-templates": { table: "ce_notice_templates", methods: ["GET"] },
  // Legal
  "legal-recommendations": { table: "ce_legal_recommendations", methods: ["GET", "PATCH"] },
  "legal-referrals": { table: "ce_legal_referrals", methods: ["GET", "POST", "PATCH"] },
  // Risk
  "risk-profiles": { table: "ce_risk_profiles", methods: ["GET"] },
  "risk-bands": { table: "ce_risk_bands", methods: ["GET"] },
  // Arrangements
  "payment-arrangements": { table: "ce_payment_arrangements", methods: ["GET"] },
  // Lookups
  "officers": { table: "ce_officers", methods: ["GET"] },
  "zones": { table: "ce_zones", methods: ["GET"] },
};

async function audit(sb: any, row: Record<string, unknown>) {
  try { await sb.from("ce_mobile_audit_log").insert(row); } catch { /* swallow */ }
}

function applyFilters(query: any, params: URLSearchParams) {
  const reserved = new Set(["page", "limit", "order", "select"]);
  for (const [key, value] of params.entries()) {
    if (reserved.has(key)) continue;
    // Operator suffix: field:gte, field:lte, field:like, field:in
    const [field, op] = key.split(":");
    switch (op) {
      case "gte": query = query.gte(field, value); break;
      case "lte": query = query.lte(field, value); break;
      case "gt": query = query.gt(field, value); break;
      case "lt": query = query.lt(field, value); break;
      case "like": query = query.ilike(field, `%${value}%`); break;
      case "in": query = query.in(field, value.split(",")); break;
      default: query = query.eq(field, value);
    }
  }
  return query;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sb = service();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const ua = req.headers.get("user-agent") || "";
  const url = new URL(req.url);

  // strip /functions/v1/compliance-mobile-api
  const path = url.pathname.replace(/^.*\/compliance-mobile-api/, "") || "/";
  const startedAt = Date.now();

  // ── Auth: API key (app) ──
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) return json({ error: "Missing x-api-key header" }, 401);
  const keyData = await validateApiKey(apiKey, sb);
  if (!keyData) return json({ error: "Invalid API key" }, 401);

  // ── Auth: JWT (officer) ──
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Missing officer JWT in Authorization header" }, 401);
  }
  const token = authHeader.slice(7);
  const { data: claimsRes, error: claimsErr } = await sb.auth.getClaims(token);
  if (claimsErr || !claimsRes?.claims) return json({ error: "Invalid or expired JWT" }, 401);
  const userId = claimsRes.claims.sub as string;
  const officerCtx = await sb.rpc("ce_mobile_get_officer_context", { p_user_id: userId });
  const officer = (officerCtx?.data || {}) as any;
  if (!officer.user_id || officer.is_active === false) {
    return json({ error: "Officer not active" }, 403);
  }
  const userCode = officer.user_code as string;

  try {
    // ── Special endpoints ──
    // GET /me — officer profile
    if (path === "/me" && req.method === "GET") {
      return json({ officer });
    }

    // POST /inspections/:id/check-in
    const checkInMatch = path.match(/^\/inspections\/([0-9a-f-]+)\/check-in$/i);
    if (checkInMatch && req.method === "POST") {
      const id = checkInMatch[1];
      const body = await req.json().catch(() => ({}));
      const { lat, lng, gps_unavailable_reason } = body;
      const { data, error } = await sb.from("ce_inspections").update({
        check_in_time: new Date().toISOString(),
        actual_start: new Date().toISOString(),
        location_lat: lat ?? null,
        location_lng: lng ?? null,
        gps_unavailable_reason: gps_unavailable_reason ?? null,
        status: "IN_PROGRESS",
        updated_by: userCode,
        updated_at: new Date().toISOString(),
      }).eq("id", id).select().single();
      if (error) return json({ error: error.message }, 400);
      await audit(sb, {
        user_id: userId, user_code: userCode, action: "inspection_check_in",
        endpoint_path: path, http_method: "POST", entity_type: "ce_inspections",
        entity_id: id, request_ip: ip, user_agent: ua, status_code: 200,
        metadata: { lat, lng },
      });
      return json({ inspection: data });
    }

    // POST /inspections/:id/check-out
    const checkOutMatch = path.match(/^\/inspections\/([0-9a-f-]+)\/check-out$/i);
    if (checkOutMatch && req.method === "POST") {
      const id = checkOutMatch[1];
      const body = await req.json().catch(() => ({}));
      const { findings_summary, employees_interviewed, wage_books_reviewed, employer_signature_data } = body;
      const { data, error } = await sb.from("ce_inspections").update({
        check_out_time: new Date().toISOString(),
        actual_end: new Date().toISOString(),
        findings_summary, employees_interviewed, wage_books_reviewed, employer_signature_data,
        status: "COMPLETED",
        session_closed_at: new Date().toISOString(),
        updated_by: userCode,
        updated_at: new Date().toISOString(),
      }).eq("id", id).select().single();
      if (error) return json({ error: error.message }, 400);
      await audit(sb, {
        user_id: userId, user_code: userCode, action: "inspection_check_out",
        endpoint_path: path, http_method: "POST", entity_type: "ce_inspections",
        entity_id: id, request_ip: ip, user_agent: ua, status_code: 200,
      });
      return json({ inspection: data });
    }

    // POST /inspections/:id/evidence — append a photo/document to JSONB
    const evidenceMatch = path.match(/^\/inspections\/([0-9a-f-]+)\/evidence$/i);
    if (evidenceMatch && req.method === "POST") {
      const id = evidenceMatch[1];
      const body = await req.json().catch(() => ({}));
      const { kind, url: fileUrl, caption, lat, lng } = body;
      if (!kind || !fileUrl) return json({ error: "kind and url required" }, 400);
      const column = kind === "photo" ? "photos" : "documents_collected";
      const { data: current } = await sb.from("ce_inspections").select(`${column}`).eq("id", id).single();
      const arr = Array.isArray((current as any)?.[column]) ? (current as any)[column] : [];
      arr.push({
        url: fileUrl, caption: caption || null, lat: lat || null, lng: lng || null,
        uploaded_by: userCode, uploaded_at: new Date().toISOString(),
      });
      const { error } = await sb.from("ce_inspections").update({
        [column]: arr, updated_by: userCode, updated_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) return json({ error: error.message }, 400);
      await audit(sb, {
        user_id: userId, user_code: userCode, action: "inspection_evidence_added",
        endpoint_path: path, http_method: "POST", entity_type: "ce_inspections",
        entity_id: id, request_ip: ip, user_agent: ua, status_code: 200,
        metadata: { kind },
      });
      return json({ ok: true, count: arr.length });
    }

    // GET /my/inspections — assigned to current officer
    if (path === "/my/inspections" && req.method === "GET") {
      let q = sb.from("ce_inspections").select("*").eq("inspector_id", userCode);
      q = applyFilters(q, url.searchParams);
      const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
      const page = Math.max(parseInt(url.searchParams.get("page") || "1"), 1);
      q = q.order("scheduled_date", { ascending: true })
        .range((page - 1) * limit, page * limit - 1);
      const { data, error } = await q;
      if (error) return json({ error: error.message }, 400);
      return json({ data, page, limit });
    }

    // GET /my/cases — assigned cases
    if (path === "/my/cases" && req.method === "GET") {
      let q = sb.from("ce_cases").select("*").eq("assigned_officer_id", userCode);
      q = applyFilters(q, url.searchParams);
      const { data, error } = await q.order("opened_date", { ascending: false }).limit(200);
      if (error) return json({ error: error.message }, 400);
      return json({ data });
    }

    // GET /employers/:regno/360 — employer 360 lookup
    const empMatch = path.match(/^\/employers\/([^/]+)\/360$/);
    if (empMatch && req.method === "GET") {
      const regno = empMatch[1];
      const [emp, cases, violations, inspections, notices] = await Promise.all([
        sb.from("er_master").select("regno,name,trade_name,hq_addr1,hq_addr2,phone,email,status").eq("regno", regno).maybeSingle(),
        sb.from("ce_cases").select("*").eq("employer_id", regno).limit(50),
        sb.from("ce_violations").select("*").eq("employer_id", regno).limit(50),
        sb.from("ce_inspections").select("*").eq("employer_id", regno).limit(50),
        sb.from("ce_notices").select("*").eq("employer_id", regno).limit(50),
      ]);
      return json({
        employer: emp.data, cases: cases.data, violations: violations.data,
        inspections: inspections.data, notices: notices.data,
      });
    }

    // ── Generic resource routing: /:resource and /:resource/:id ──
    const segments = path.split("/").filter(Boolean);
    if (segments.length >= 1) {
      const resource = segments[0];
      const id = segments[1];
      const cfg = RESOURCES[resource];
      if (!cfg) return json({ error: `Unknown resource '${resource}'` }, 404);
      if (!cfg.methods.includes(req.method as any)) {
        return json({ error: `${req.method} not allowed on ${resource}` }, 405);
      }

      const pk = cfg.pk || "id";

      if (req.method === "GET") {
        if (id) {
          const { data, error } = await sb.from(cfg.table).select("*").eq(pk, id).maybeSingle();
          if (error) return json({ error: error.message }, 400);
          if (!data) return json({ error: "Not found" }, 404);
          return json({ data });
        }
        let q = sb.from(cfg.table).select("*", { count: "exact" });
        q = applyFilters(q, url.searchParams);
        const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
        const page = Math.max(parseInt(url.searchParams.get("page") || "1"), 1);
        const order = url.searchParams.get("order") || "";
        if (order) {
          const [field, dir] = order.split(":");
          q = q.order(field, { ascending: (dir || "asc") === "asc" });
        }
        q = q.range((page - 1) * limit, page * limit - 1);
        const { data, error, count } = await q;
        if (error) return json({ error: error.message }, 400);
        return json({ data, page, limit, total: count });
      }

      if (req.method === "POST") {
        const body = await req.json().catch(() => ({}));
        const insertRow = { ...body, created_by: userCode, updated_by: userCode };
        const { data, error } = await sb.from(cfg.table).insert(insertRow).select().single();
        if (error) return json({ error: error.message }, 400);
        await audit(sb, {
          user_id: userId, user_code: userCode, action: `${resource}_create`,
          endpoint_path: path, http_method: "POST", entity_type: cfg.table,
          entity_id: (data as any)?.id, request_ip: ip, user_agent: ua, status_code: 200,
        });
        return json({ data });
      }

      if (req.method === "PATCH" && id) {
        const body = await req.json().catch(() => ({}));
        const updateRow = { ...body, updated_by: userCode, updated_at: new Date().toISOString() };
        const { data, error } = await sb.from(cfg.table).update(updateRow).eq(pk, id).select().single();
        if (error) return json({ error: error.message }, 400);
        await audit(sb, {
          user_id: userId, user_code: userCode, action: `${resource}_update`,
          endpoint_path: path, http_method: "PATCH", entity_type: cfg.table,
          entity_id: id, request_ip: ip, user_agent: ua, status_code: 200,
        });
        return json({ data });
      }
    }

    return json({ error: "Endpoint not found" }, 404);
  } catch (e: any) {
    return json({ error: "Internal error", details: e?.message || String(e) }, 500);
  } finally {
    // Lightweight perf trace (not awaited above) — best-effort
    void (Date.now() - startedAt);
  }
});
