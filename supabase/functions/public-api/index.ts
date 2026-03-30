import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function hashKey(key: string): Promise<string> {
  const encoded = new TextEncoder().encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

// ── Check if path is a C3 History dynamic route ──
function isC3HistoryRoute(path: string): boolean {
  return path.startsWith("/api/v1/C3/") && path.includes("/C3Submitted/");
}

// ── Middleware: Check API Registry (enabled/disabled) ──
async function checkApiRegistry(
  supabase: ReturnType<typeof createClient>,
  endpointPath: string,
  httpMethod: string
): Promise<{ allowed: boolean; registryEntry?: Record<string, unknown> }> {
  // For C3 History dynamic routes, check by category instead of exact path
  if (isC3HistoryRoute(endpointPath) && httpMethod === "GET") {
    const { data, error } = await supabase
      .from("api_registry")
      .select("*")
      .eq("category", "c3-history")
      .eq("http_method", "GET")
      .eq("is_enabled", true)
      .limit(1);
    if (error || !data || data.length === 0) return { allowed: false };
    return { allowed: true, registryEntry: data[0] };
  }

  const { data, error } = await supabase
    .from("api_registry")
    .select("*")
    .eq("endpoint_path", endpointPath)
    .eq("http_method", httpMethod)
    .single();

  if (error || !data) return { allowed: false };
  if (!data.is_enabled) return { allowed: false };
  return { allowed: true, registryEntry: data };
}

// ── Middleware: Validate API Key ──
async function validateApiKey(apiKey: string, supabase: ReturnType<typeof createClient>) {
  const keyHash = await hashKey(apiKey);
  const { data, error } = await supabase
    .from("public_api_keys")
    .select("*")
    .eq("key_hash", keyHash)
    .eq("status", "active")
    .single();
  if (error || !data) return null;
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null;
  return data;
}

// ── Middleware: Rate Limiting ──
async function checkRateLimit(keyId: string, limit: number, supabase: ReturnType<typeof createClient>): Promise<boolean> {
  const now = new Date();
  const windowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), 0, 0).toISOString();
  const { data: existing } = await supabase
    .from("public_api_rate_limits")
    .select("request_count")
    .eq("api_key_id", keyId)
    .eq("window_start", windowStart)
    .single();
  if (existing) {
    if (existing.request_count >= limit) return false;
    await supabase.from("public_api_rate_limits").update({ request_count: existing.request_count + 1 }).eq("api_key_id", keyId).eq("window_start", windowStart);
  } else {
    await supabase.from("public_api_rate_limits").insert({ api_key_id: keyId, window_start: windowStart, request_count: 1 });
  }
  return true;
}

// ── Middleware: Scope-based endpoint authorization ──
async function checkScopeAuthorization(
  supabase: ReturnType<typeof createClient>,
  apiKeyId: string,
  endpointPath: string,
  httpMethod: string
): Promise<boolean> {
  const { data: scopes, error } = await supabase
    .from("api_key_scope_assignments")
    .select("api_registry_id, api_registry:api_registry!api_key_scope_assignments_api_registry_id_fkey(endpoint_path, http_method, category)")
    .eq("api_key_id", apiKeyId)
    .eq("is_allowed", true);

  if (error) return false;
  if (!scopes || scopes.length === 0) return true;

  // For C3 History dynamic routes, check by category
  if (isC3HistoryRoute(endpointPath) && httpMethod === "GET") {
    return scopes.some((s: any) => {
      const reg = s.api_registry;
      return reg && reg.category === "c3-history" && reg.http_method === "GET";
    });
  }

  return scopes.some((s: any) => {
    const reg = s.api_registry;
    return reg && reg.endpoint_path === endpointPath && reg.http_method === httpMethod;
  });
}

function isIpAllowed(allowedIps: string[], requestIp: string): boolean {
  if (!allowedIps || allowedIps.length === 0) return true;
  return allowedIps.includes(requestIp);
}

function logAccess(supabase: ReturnType<typeof createClient>, params: Record<string, unknown>) {
  supabase.from("public_api_access_logs").insert(params).then(() => {});
}

// ── Master Data Table Mapping ──
const MASTER_TABLE_MAP: Record<string, { table: string; label: string; orderBy?: string; searchCol?: string }> = {
  "countries": { table: "tb_country", label: "Countries", orderBy: "description", searchCol: "description" },
  "districts": { table: "tb_district", label: "Districts", orderBy: "description", searchCol: "description" },
  "postal-districts": { table: "tb_postal_district", label: "Postal Districts", orderBy: "description", searchCol: "description" },
  "occupations": { table: "tb_occup", label: "Occupations", orderBy: "short_description", searchCol: "short_description" },
  "industries": { table: "tb_indus", label: "Industries", orderBy: "short_description", searchCol: "short_description" },
  "sectors": { table: "tb_sector", label: "Sectors", orderBy: "description", searchCol: "description" },
  "relations": { table: "tb_relation", label: "Relations", orderBy: "code", searchCol: "description" },
  "dependent-relations": { table: "tb_dependent_relation", label: "Dependent Relations", orderBy: "code", searchCol: "description" },
  "activities": { table: "tb_activity", label: "Activities", orderBy: "code", searchCol: "short_description" },
  "eye-colors": { table: "tb_eye_color", label: "Eye Colors", orderBy: "code", searchCol: "description" },
  "offices": { table: "tb_office", label: "Offices", orderBy: "code", searchCol: "description" },
  "office-departments": { table: "tb_office_departments", label: "Office Departments" },
  "inspectors": { table: "tb_inspector", label: "Inspectors", orderBy: "code", searchCol: "insp_name" },
  "legal-statuses": { table: "tb_legal_status", label: "Legal Statuses", orderBy: "code", searchCol: "description" },
  "c3-statuses": { table: "tb_c3_status", label: "C3 Statuses", orderBy: "code", searchCol: "description" },
  "ssc-rates": { table: "tb_ssc_rates", label: "SSC Rates" },
  "levy-slabs": { table: "tb_levy_slabs", label: "Levy Slabs" },
  "levy-slab-details": { table: "tb_levy_slab_details", label: "Levy Slab Details" },
  "self-emp-rates": { table: "tb_self_emp_contrib_rate", label: "Self-Employment Rates" },
  "vc-rates": { table: "tb_vc_contrib_rate", label: "Voluntary Contribution Rates" },
  "penalties": { table: "tb_penalty", label: "Penalties" },
  "deduction-tax-headers": { table: "tb_deductions_tax_table_header", label: "Deduction Tax Headers" },
  "deduction-tax-details": { table: "tb_deductions_tax_table_details", label: "Deduction Tax Details" },
  "marital-statuses": { table: "tb_marital", label: "Marital Statuses", orderBy: "code", searchCol: "description" },
  "villages": { table: "tb_villages", label: "Villages", orderBy: "description", searchCol: "description" },
  "verification-documents": { table: "tb_verify", label: "Verification Documents", orderBy: "code", searchCol: "description" },
};

// ── Generic Master Data Handler ──
async function handleMasterGet(
  supabase: ReturnType<typeof createClient>,
  tableKey: string,
  queryParams: Record<string, string>
) {
  const config = MASTER_TABLE_MAP[tableKey];
  if (!config) throw { code: "NOT_FOUND", message: "Unknown resource" };

  const page = parseInt(queryParams.page || "1");
  const limit = Math.min(parseInt(queryParams.limit || "500"), 1000);
  const offset = (page - 1) * limit;

  let query = supabase.from(config.table).select("*", { count: "exact" });

  if (queryParams.search && (config.searchCol || config.orderBy)) {
    query = query.ilike(config.searchCol || config.orderBy!, `%${queryParams.search}%`);
  }

  if (config.orderBy) {
    query = query.order(config.orderBy, { ascending: true });
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    status: "success",
    message: `${config.label} retrieved successfully`,
    data,
    meta: { page, limit, total: count || 0 },
  };
}

// ── Health Check ──
async function handleHealth(supabase: ReturnType<typeof createClient>) {
  const { data: enabledApis } = await supabase
    .from("api_registry")
    .select("endpoint_path, http_method")
    .eq("is_enabled", true)
    .order("sort_order");

  return {
    status: "success",
    message: "API is healthy",
    data: {
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      phase: "Phase 1 — Master Data APIs",
      available_endpoints: (enabledApis || []).map((a: { endpoint_path: string; http_method: string }) => ({
        path: a.endpoint_path,
        method: a.http_method,
      })),
    },
  };
}

// ── Module Documents Handler ──
async function handleModuleDocuments(
  supabase: ReturnType<typeof createClient>,
  queryParams: Record<string, string>
) {
  const moduleIdentifier = queryParams.module;
  if (!moduleIdentifier) {
    throw { code: "BAD_REQUEST", message: "Missing required query parameter: module" };
  }

  // Look up module by name
  const { data: mod, error: modErr } = await supabase
    .from("app_modules")
    .select("id, name, display_name")
    .eq("name", moduleIdentifier)
    .single();

  if (modErr || !mod) {
    throw { code: "NOT_FOUND", message: `Module '${moduleIdentifier}' not found` };
  }

  // Fetch active categories
  const { data: categories, error: catErr } = await supabase
    .from("module_doc_categories")
    .select("id, category_name, description, sort_order")
    .eq("module_id", mod.id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (catErr) throw catErr;

  // Fetch active documents for all categories
  const catIds = (categories || []).map((c: any) => c.id);
  let allDocs: any[] = [];
  if (catIds.length > 0) {
    const { data: docs, error: docErr } = await supabase
      .from("module_doc_configs")
      .select("id, category_id, document_name, is_required, allowed_extensions, max_file_size_mb, supportive_docs_rule, sort_order")
      .in("category_id", catIds)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (docErr) throw docErr;
    allDocs = docs || [];
  }

  // Fetch all active child docs for these configs
  const configIds = allDocs.map((d: any) => d.id);
  let allChildDocs: any[] = [];
  if (configIds.length > 0) {
    const { data: children, error: childErr } = await supabase
      .from("module_doc_child_docs")
      .select("id, parent_config_id, parent_alternate_id, doc_type, document_name, description, is_required, allowed_extensions, max_file_size_mb, sort_order")
      .in("parent_config_id", configIds)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (childErr) throw childErr;
    allChildDocs = children || [];
  }

  // Build nested child doc structure
  const buildChildDocs = (configId: string) => {
    const supportive = allChildDocs
      .filter((c: any) => c.parent_config_id === configId && c.doc_type === "supportive" && !c.parent_alternate_id)
      .map(({ id, parent_config_id, parent_alternate_id, ...rest }: any) => rest);

    const alternates = allChildDocs
      .filter((c: any) => c.parent_config_id === configId && c.doc_type === "alternate" && !c.parent_alternate_id)
      .map((alt: any) => {
        const altSupportive = allChildDocs
          .filter((c: any) => c.parent_alternate_id === alt.id && c.doc_type === "supportive")
          .map(({ id, parent_config_id, parent_alternate_id, ...rest }: any) => rest);
        const { id: altId, parent_config_id: _pc, parent_alternate_id: _pa, ...altRest } = alt;
        return { ...altRest, supportive_documents: altSupportive };
      });

    return { supportive_documents: supportive, alternate_documents: alternates };
  };

  // Structure response
  const result = (categories || []).map((cat: any) => ({
    category_name: cat.category_name,
    description: cat.description,
    documents: allDocs
      .filter((d: any) => d.category_id === cat.id)
      .map(({ id, category_id, ...rest }: any) => ({
        ...rest,
        ...buildChildDocs(id),
      })),
  }));

  return {
    status: "success",
    data: {
      module: { id: mod.id, name: mod.name, display_name: mod.display_name },
      categories: result,
    },
  };
}

// ── C3 Ingestion Handlers ──
async function handleC3ReportedInsert(supabase: ReturnType<typeof createClient>, payload: Record<string, unknown>) {
  if (!payload.payer_id) throw { code: "BAD_REQUEST", message: "payer_id is required" };
  if (!payload.payer_type) throw { code: "BAD_REQUEST", message: "payer_type is required" };
  if (!payload.period) throw { code: "BAD_REQUEST", message: "period is required" };
  if (payload.sequence_no == null) throw { code: "BAD_REQUEST", message: "sequence_no is required" };

  const { data, error } = await supabase.rpc("public_api_insert_c3_reported", {
    p_payer_id: String(payload.payer_id),
    p_payer_type: String(payload.payer_type),
    p_period: String(payload.period),
    p_sequence_no: Number(payload.sequence_no),
    p_payer_name: payload.payer_name ? String(payload.payer_name) : null,
    p_payer_address: payload.payer_address ? String(payload.payer_address) : null,
    p_number_employed: payload.number_employed != null ? Number(payload.number_employed) : null,
    p_total_wages: payload.total_wages != null ? Number(payload.total_wages) : null,
    p_nil_return: payload.nil_return != null ? Boolean(payload.nil_return) : false,
    p_notes: payload.notes ? String(payload.notes) : null,
    p_entered_by: payload.entered_by ? String(payload.entered_by) : "API",
    p_received_by: payload.received_by ? String(payload.received_by) : null,
    p_date_received: payload.date_received ? String(payload.date_received) : null,
    p_emp_ss_amt_calc: payload.emp_ss_amt_calc != null ? Number(payload.emp_ss_amt_calc) : null,
    p_emp_levy_amt_calc: payload.emp_levy_amt_calc != null ? Number(payload.emp_levy_amt_calc) : null,
    p_emp_pe_amt_calc: payload.emp_pe_amt_calc != null ? Number(payload.emp_pe_amt_calc) : null,
    p_emp_ss_fines_due: payload.emp_ss_fines_due != null ? Number(payload.emp_ss_fines_due) : null,
    p_emp_levy_penalty_amt: payload.emp_levy_penalty_amt != null ? Number(payload.emp_levy_penalty_amt) : null,
    p_emp_pe_penalty_amt: payload.emp_pe_penalty_amt != null ? Number(payload.emp_pe_penalty_amt) : null,
  });
  if (error) throw error;
  return data;
}

async function handleC3WagesInsert(supabase: ReturnType<typeof createClient>, payload: Record<string, unknown>) {
  if (!payload.ssn) throw { code: "BAD_REQUEST", message: "ssn is required" };
  if (!payload.payer_id) throw { code: "BAD_REQUEST", message: "payer_id is required" };
  if (!payload.payer_type) throw { code: "BAD_REQUEST", message: "payer_type is required" };
  if (payload.sequence_no == null) throw { code: "BAD_REQUEST", message: "sequence_no is required" };
  if (!payload.period) throw { code: "BAD_REQUEST", message: "period is required" };

  const { data, error } = await supabase.rpc("public_api_insert_ip_wages", {
    p_ssn: String(payload.ssn),
    p_payer_id: String(payload.payer_id),
    p_payer_type: String(payload.payer_type),
    p_sequence_no: Number(payload.sequence_no),
    p_period: String(payload.period),
    p_employee_name: payload.employee_name ? String(payload.employee_name) : null,
    p_pay_period: payload.pay_period ? String(payload.pay_period) : null,
    p_wages_paid1: payload.wages_paid1 != null ? Number(payload.wages_paid1) : null,
    p_wages_paid2: payload.wages_paid2 != null ? Number(payload.wages_paid2) : null,
    p_wages_paid3: payload.wages_paid3 != null ? Number(payload.wages_paid3) : null,
    p_wages_paid4: payload.wages_paid4 != null ? Number(payload.wages_paid4) : null,
    p_wages_paid5: payload.wages_paid5 != null ? Number(payload.wages_paid5) : null,
    p_wages_paid6: payload.wages_paid6 != null ? Number(payload.wages_paid6) : null,
    p_wages_paid7: payload.wages_paid7 != null ? Number(payload.wages_paid7) : null,
    p_paid_code1: payload.paid_code1 ? String(payload.paid_code1) : null,
    p_paid_code2: payload.paid_code2 ? String(payload.paid_code2) : null,
    p_paid_code3: payload.paid_code3 ? String(payload.paid_code3) : null,
    p_paid_code4: payload.paid_code4 ? String(payload.paid_code4) : null,
    p_paid_code5: payload.paid_code5 ? String(payload.paid_code5) : null,
    p_paid_code6: payload.paid_code6 ? String(payload.paid_code6) : null,
    p_paid_code7: payload.paid_code7 ? String(payload.paid_code7) : null,
    p_er_ss_amt: payload.er_ss_amt != null ? Number(payload.er_ss_amt) : null,
    p_er_ei_amt: payload.er_ei_amt != null ? Number(payload.er_ei_amt) : null,
    p_er_levy_amt: payload.er_levy_amt != null ? Number(payload.er_levy_amt) : null,
    p_ip_ss_amt: payload.ip_ss_amt != null ? Number(payload.ip_ss_amt) : null,
    p_ip_levy_amt: payload.ip_levy_amt != null ? Number(payload.ip_levy_amt) : null,
    p_ip_pe_amt: payload.ip_pe_amt != null ? Number(payload.ip_pe_amt) : null,
    p_total_wages: payload.total_wages != null ? Number(payload.total_wages) : null,
    p_entered_by: payload.entered_by ? String(payload.entered_by) : "API",
    p_bonus_date: payload.bonus_date ? String(payload.bonus_date) : null,
    p_bonus_exempt_levy: payload.bonus_exempt_levy != null ? Boolean(payload.bonus_exempt_levy) : null,
    p_bonus_holiday_swapped: payload.bonus_holiday_swapped != null ? Boolean(payload.bonus_holiday_swapped) : null,
    p_holiday_start_date: payload.holiday_start_date ? String(payload.holiday_start_date) : null,
    p_holiday_end_date: payload.holiday_end_date ? String(payload.holiday_end_date) : null,
  });
  if (error) throw error;
  return data;
}

async function handleC3Verify(supabase: ReturnType<typeof createClient>, payload: Record<string, unknown>) {
  if (!payload.payer_id) throw { code: "BAD_REQUEST", message: "payer_id is required" };
  if (!payload.payer_type) throw { code: "BAD_REQUEST", message: "payer_type is required" };
  if (payload.sequence_no == null) throw { code: "BAD_REQUEST", message: "sequence_no is required" };
  if (!payload.period) throw { code: "BAD_REQUEST", message: "period is required" };

  const { data, error } = await supabase.rpc("public_api_verify_c3", {
    p_payer_id: String(payload.payer_id),
    p_payer_type: String(payload.payer_type),
    p_sequence_no: Number(payload.sequence_no),
    p_period: String(payload.period),
  });
  if (error) throw error;
  return data;
}

// ── C3 History Handlers ──
async function handleC3Range(
  supabase: ReturnType<typeof createClient>,
  params: Record<string, string>
) {
  const { payerId, payerType, startPeriod, endPeriodAndType } = params;
  // endPeriodAndType = "31-03-2026,EE"
  const commaIdx = endPeriodAndType.lastIndexOf(",");
  if (commaIdx === -1) throw { code: "BAD_REQUEST", message: "Invalid URL format. Expected {endPeriod},{c3Type}" };
  const endPeriod = endPeriodAndType.substring(0, commaIdx);
  const c3Type = endPeriodAndType.substring(commaIdx + 1);

  if (!["ER", "SE"].includes(payerType.toUpperCase())) throw { code: "BAD_REQUEST", message: "payerType must be ER or SE" };
  if (!["EE", "NW"].includes(c3Type.toUpperCase())) throw { code: "BAD_REQUEST", message: "c3Type must be EE or NW" };

  const { data, error } = await supabase.rpc("public_api_c3_range", {
    p_payer_id: payerId,
    p_payer_type: payerType.toUpperCase(),
    p_start_period: startPeriod,
    p_end_period: endPeriod,
    p_c3_type: c3Type.toUpperCase(),
  });
  if (error) throw error;
  if (data && data.error) throw { code: "BAD_REQUEST", message: data.error };
  return data;
}

async function handleC3Detail(
  supabase: ReturnType<typeof createClient>,
  params: Record<string, string>
) {
  const { payerId, detailParams } = params;
  // detailParams = "3,2026,1,ER,EE"
  const parts = detailParams.split(",");
  if (parts.length !== 5) throw { code: "BAD_REQUEST", message: "Invalid URL format. Expected {month},{year},{sequenceNo},{payerType},{c3Type}" };
  const [month, year, sequenceNo, payerType, c3Type] = parts;

  if (!["ER", "SE"].includes(payerType.toUpperCase())) throw { code: "BAD_REQUEST", message: "payerType must be ER or SE" };
  if (!["EE", "NW"].includes(c3Type.toUpperCase())) throw { code: "BAD_REQUEST", message: "c3Type must be EE or NW" };

  const { data, error } = await supabase.rpc("public_api_c3_detail", {
    p_payer_id: payerId,
    p_month: month,
    p_year: year,
    p_sequence_no: sequenceNo,
    p_payer_type: payerType.toUpperCase(),
    p_c3_type: c3Type.toUpperCase(),
  });
  if (error) throw error;
  if (data && data.error) throw { code: "NOT_FOUND", message: data.error };
  return data;
}

async function handleC3LastSubmitted(
  supabase: ReturnType<typeof createClient>,
  params: Record<string, string>
) {
  const { payerId, payerType, seqAndType } = params;
  // seqAndType = "1,NW"
  const commaIdx = seqAndType.lastIndexOf(",");
  if (commaIdx === -1) throw { code: "BAD_REQUEST", message: "Invalid URL format. Expected {sequenceNo},{c3Type}" };
  const sequenceNo = seqAndType.substring(0, commaIdx);
  const c3Type = seqAndType.substring(commaIdx + 1);

  if (!["ER", "SE"].includes(payerType.toUpperCase())) throw { code: "BAD_REQUEST", message: "payerType must be ER or SE" };
  if (!["EE", "NW"].includes(c3Type.toUpperCase())) throw { code: "BAD_REQUEST", message: "c3Type must be EE or NW" };

  const { data, error } = await supabase.rpc("public_api_c3_last_submitted", {
    p_payer_id: payerId,
    p_payer_type: payerType.toUpperCase(),
    p_sequence_no: sequenceNo,
    p_c3_type: c3Type.toUpperCase(),
  });
  if (error) throw error;
  if (data && data.error) throw { code: "NOT_FOUND", message: data.error };
  return data;
}

// ── Route Matching ──
function matchRoute(path: string, method: string): { handler: string; params: Record<string, string> } | null {
  if (path === "/api/v1/health" && method === "GET") {
    return { handler: "health", params: {} };
  }

  if (path === "/api/v1/module-documents" && method === "GET") {
    return { handler: "moduleDocuments", params: {} };
  }

  // C3 Ingestion POST routes
  if (path === "/api/v1/c3-reported" && method === "POST") {
    return { handler: "c3ReportedInsert", params: {} };
  }
  if (path === "/api/v1/c3-wages" && method === "POST") {
    return { handler: "c3WagesInsert", params: {} };
  }
  if (path === "/api/v1/c3-verify" && method === "POST") {
    return { handler: "c3Verify", params: {} };
  }

  // ── C3 History GET routes (BIMA-compatible) ──
  if (method === "GET") {
    // Range API: /api/v1/C3/{payerId}/C3Submitted/{payerType}/range/{startPeriod}/{endPeriod,c3Type}
    const rangeMatch = path.match(/^\/api\/v1\/C3\/([^/]+)\/C3Submitted\/([^/]+)\/range\/([^/]+)\/(.+)$/);
    if (rangeMatch) {
      return {
        handler: "c3Range",
        params: { payerId: rangeMatch[1], payerType: rangeMatch[2], startPeriod: rangeMatch[3], endPeriodAndType: rangeMatch[4] },
      };
    }

    // Detail API: /api/v1/C3/{payerId}/C3Submitted/{month,year,seq,payerType,c3Type}
    // Must check this BEFORE lastSubmitted since both match similar patterns
    const detailMatch = path.match(/^\/api\/v1\/C3\/([^/]+)\/C3Submitted\/(\d+,\d{4},\d+,[A-Za-z]+,[A-Za-z]+)$/);
    if (detailMatch) {
      return {
        handler: "c3Detail",
        params: { payerId: detailMatch[1], detailParams: detailMatch[2] },
      };
    }

    // Last Submitted API: /api/v1/C3/{payerId}/C3Submitted/{payerType}/{sequenceNo,c3Type}
    const lastMatch = path.match(/^\/api\/v1\/C3\/([^/]+)\/C3Submitted\/([^/]+)\/(\d+,[A-Za-z]+)$/);
    if (lastMatch) {
      return {
        handler: "c3LastSubmitted",
        params: { payerId: lastMatch[1], payerType: lastMatch[2], seqAndType: lastMatch[3] },
      };
    }
  }

  const masterMatch = path.match(/^\/api\/v1\/([a-z0-9-]+)\/?$/);
  if (masterMatch && method === "GET") {
    const resource = masterMatch[1];
    if (MASTER_TABLE_MAP[resource]) {
      return { handler: "masterGet", params: { resource } };
    }
  }

  return null;
}

// ── Execute Handler ──
async function executeHandler(
  handlerName: string,
  supabase: ReturnType<typeof createClient>,
  routeParams: Record<string, string>,
  _payload: Record<string, unknown>,
  queryParams: Record<string, string>
) {
  switch (handlerName) {
    case "health":
      return handleHealth(supabase);
    case "masterGet":
      return handleMasterGet(supabase, routeParams.resource, queryParams);
    case "moduleDocuments":
      return handleModuleDocuments(supabase, queryParams);
    case "c3ReportedInsert":
      return handleC3ReportedInsert(supabase, _payload);
    case "c3WagesInsert":
      return handleC3WagesInsert(supabase, _payload);
    case "c3Verify":
      return handleC3Verify(supabase, _payload);
    case "c3Range":
      return handleC3Range(supabase, routeParams);
    case "c3Detail":
      return handleC3Detail(supabase, routeParams);
    case "c3LastSubmitted":
      return handleC3LastSubmitted(supabase, routeParams);
    default:
      throw { code: "NOT_FOUND", message: `Unknown handler: ${handlerName}` };
  }
}

// ── Extract API path from the full request URL ──
// The edge function is mounted at /functions/v1/public-api
// so a request to /functions/v1/public-api/api/v1/countries → apiPath = /api/v1/countries
function extractApiPath(req: Request): string | null {
  const url = new URL(req.url);
  const fullPath = url.pathname;

  // Match everything after /public-api
  const match = fullPath.match(/\/public-api(\/api\/.+)/);
  return match ? match[1] : null;
}

// ── Extract query params from URL ──
function extractQueryParams(req: Request): Record<string, string> {
  const url = new URL(req.url);
  const params: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return params;
}

// ── Core request processing pipeline ──
async function processApiRequest(
  supabase: ReturnType<typeof createClient>,
  apiPath: string,
  httpMethod: string,
  payload: Record<string, unknown>,
  queryParams: Record<string, string>,
  req: Request,
  requestIp: string,
  startTime: number
) {
  let apiKeyId: string | null = null;

  // ── API Registry Check (health always allowed) ──
  if (apiPath !== "/api/v1/health") {
    const registryCheck = await checkApiRegistry(supabase, apiPath, httpMethod);
    if (!registryCheck.allowed) {
      logAccess(supabase, { api_key_id: null, endpoint: apiPath, http_method: httpMethod, request_ip: requestIp, response_status: 404, response_time_ms: Date.now() - startTime, error_message: "Endpoint not found or disabled" });
      return jsonResponse({ status: "error", message: "Not Found", error: { code: "NOT_FOUND" } }, 404);
    }
  }

  // ── Health check — no auth required ──
  if (apiPath === "/api/v1/health" && httpMethod === "GET") {
    const result = await handleHealth(supabase);
    logAccess(supabase, { api_key_id: null, endpoint: apiPath, http_method: httpMethod, request_ip: requestIp, response_status: 200, response_time_ms: Date.now() - startTime });
    return jsonResponse(result);
  }

  // ── API Key Validation ──
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) {
    logAccess(supabase, { api_key_id: null, endpoint: apiPath, http_method: httpMethod, request_ip: requestIp, response_status: 401, response_time_ms: Date.now() - startTime, error_message: "Missing API key" });
    return jsonResponse({ status: "error", message: "Missing API key", error: { code: "UNAUTHORIZED", details: "Provide x-api-key header" } }, 401);
  }

  const keyData = await validateApiKey(apiKey, supabase);
  if (!keyData) {
    logAccess(supabase, { api_key_id: null, endpoint: apiPath, http_method: httpMethod, request_ip: requestIp, response_status: 401, response_time_ms: Date.now() - startTime, error_message: "Invalid or expired API key" });
    return jsonResponse({ status: "error", message: "Invalid API key", error: { code: "UNAUTHORIZED", details: "The provided API key is invalid or has been revoked" } }, 401);
  }

  apiKeyId = keyData.id;

  // ── IP Whitelist ──
  if (!isIpAllowed(keyData.allowed_ip_addresses, requestIp)) {
    logAccess(supabase, { api_key_id: apiKeyId, endpoint: apiPath, http_method: httpMethod, request_ip: requestIp, response_status: 403, response_time_ms: Date.now() - startTime, error_message: "IP not allowed" });
    return jsonResponse({ status: "error", message: "Access denied", error: { code: "FORBIDDEN", details: "IP address not whitelisted" } }, 403);
  }

  // ── Rate Limiting ──
  const withinLimit = await checkRateLimit(apiKeyId, keyData.rate_limit_per_minute, supabase);
  if (!withinLimit) {
    logAccess(supabase, { api_key_id: apiKeyId, endpoint: apiPath, http_method: httpMethod, request_ip: requestIp, response_status: 429, response_time_ms: Date.now() - startTime, error_message: "Rate limit exceeded" });
    return jsonResponse({ status: "error", message: "Rate limit exceeded", error: { code: "RATE_LIMITED", details: `Limit: ${keyData.rate_limit_per_minute} requests/minute` } }, 429);
  }

  // ── Scope-based Endpoint Authorization ──
  const scopeAllowed = await checkScopeAuthorization(supabase, apiKeyId, apiPath, httpMethod);
  if (!scopeAllowed) {
    logAccess(supabase, { api_key_id: apiKeyId, endpoint: apiPath, http_method: httpMethod, request_ip: requestIp, response_status: 403, response_time_ms: Date.now() - startTime, error_message: "Endpoint not in allowed scope" });
    return jsonResponse({ status: "error", message: "Endpoint not authorized for this API key", error: { code: "FORBIDDEN", details: "This API key does not have access to this endpoint" } }, 403);
  }

  // ── Route Matching ──
  const route = matchRoute(apiPath, httpMethod);
  if (!route) {
    logAccess(supabase, { api_key_id: apiKeyId, endpoint: apiPath, http_method: httpMethod, request_ip: requestIp, response_status: 404, response_time_ms: Date.now() - startTime, error_message: "Route not found" });
    return jsonResponse({ status: "error", message: "Endpoint not found", error: { code: "NOT_FOUND" } }, 404);
  }

  // ── Execute ──
  const result = await executeHandler(route.handler, supabase, route.params, payload, queryParams);
  const responseTime = Date.now() - startTime;
  logAccess(supabase, { api_key_id: apiKeyId, endpoint: apiPath, http_method: httpMethod, request_ip: requestIp, response_status: 200, response_time_ms: responseTime });
  return jsonResponse(result);
}

// ── Main Handler ──
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabase = getServiceClient();
  const requestIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("cf-connecting-ip") || "unknown";

  try {
    // ── Mode 1: RESTful URL routing (preferred) ──
    // e.g. GET /functions/v1/public-api/api/v1/countries?page=1&limit=50
    const urlApiPath = extractApiPath(req);
    if (urlApiPath) {
      const queryParams = extractQueryParams(req);
      let payload: Record<string, unknown> = {};
      if (["POST", "PUT", "PATCH"].includes(req.method)) {
        try { payload = await req.json(); } catch { payload = {}; }
      }
      return await processApiRequest(supabase, urlApiPath, req.method, payload, queryParams, req, requestIp, startTime);
    }

    // ── Mode 2: Legacy POST-body routing (backward compatible) ──
    // POST /functions/v1/public-api with { path, method, payload, query }
    if (req.method === "POST") {
      const body = await req.json();
      const { path, method, payload = {}, query = {} } = body;

      if (!path || !method) {
        return jsonResponse({ status: "error", message: "Missing required fields: path, method", error: { code: "BAD_REQUEST" } }, 400);
      }

      return await processApiRequest(supabase, path, method.toUpperCase(), payload, query, req, requestIp, startTime);
    }

    // ── No matching mode ──
    return jsonResponse({
      status: "error",
      message: "Invalid request. Use RESTful URL paths (e.g. GET /api/v1/countries) or POST with {path, method} in body.",
      error: { code: "BAD_REQUEST" },
    }, 400);

  } catch (err: unknown) {
    const responseTime = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : (typeof err === 'object' && err !== null ? JSON.stringify(err) : String(err));
    const errorCode = (err as Record<string, unknown>)?.code === "NOT_FOUND" ? 404 : 500;
    logAccess(supabase, { api_key_id: null, endpoint: "", http_method: req.method, request_ip: requestIp, response_status: errorCode, response_time_ms: responseTime, error_message: errorMessage });
    return jsonResponse({ status: "error", message: "Internal server error", error: { code: "INTERNAL_ERROR", details: errorMessage } }, errorCode);
  }
});
