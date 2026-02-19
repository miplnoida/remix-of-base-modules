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

// ── Middleware: Check API Registry (enabled/disabled) ──
async function checkApiRegistry(
  supabase: ReturnType<typeof createClient>,
  endpointPath: string,
  httpMethod: string
): Promise<{ allowed: boolean; registryEntry?: Record<string, unknown> }> {
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
    .select("api_registry_id, api_registry:api_registry!api_key_scope_assignments_api_registry_id_fkey(endpoint_path, http_method)")
    .eq("api_key_id", apiKeyId)
    .eq("is_allowed", true);

  if (error) return false;
  if (!scopes || scopes.length === 0) return true;

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

// ── Route Matching ──
function matchRoute(path: string, method: string): { handler: string; params: Record<string, string> } | null {
  if (path === "/api/v1/health" && method === "GET") {
    return { handler: "health", params: {} };
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
