import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// SHA-256 hash helper
async function hashKey(key: string): Promise<string> {
  const encoded = new TextEncoder().encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Get admin supabase client (service role)
function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

// ── Middleware: Validate API Key ──────────────────────────────────────
async function validateApiKey(
  apiKey: string,
  supabase: ReturnType<typeof createClient>
) {
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

// ── Middleware: Rate Limiting ─────────────────────────────────────────
async function checkRateLimit(
  keyId: string,
  limit: number,
  supabase: ReturnType<typeof createClient>
): Promise<boolean> {
  const now = new Date();
  const windowStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    now.getHours(),
    now.getMinutes(),
    0,
    0
  ).toISOString();

  // Upsert: increment or create
  const { data: existing } = await supabase
    .from("public_api_rate_limits")
    .select("request_count")
    .eq("api_key_id", keyId)
    .eq("window_start", windowStart)
    .single();

  if (existing) {
    if (existing.request_count >= limit) return false;
    await supabase
      .from("public_api_rate_limits")
      .update({ request_count: existing.request_count + 1 })
      .eq("api_key_id", keyId)
      .eq("window_start", windowStart);
  } else {
    await supabase
      .from("public_api_rate_limits")
      .insert({ api_key_id: keyId, window_start: windowStart, request_count: 1 });
  }
  return true;
}

// ── Middleware: Endpoint Authorization ────────────────────────────────
function isEndpointAllowed(
  allowedEndpoints: string[],
  requestedPath: string
): boolean {
  if (!allowedEndpoints || allowedEndpoints.length === 0) return true;
  return allowedEndpoints.some((pattern) => {
    const regex = new RegExp(
      "^" + pattern.replace(/\*/g, ".*").replace(/\//g, "\\/") + "$"
    );
    return regex.test(requestedPath);
  });
}

// ── Middleware: IP Whitelist ──────────────────────────────────────────
function isIpAllowed(allowedIps: string[], requestIp: string): boolean {
  if (!allowedIps || allowedIps.length === 0) return true;
  return allowedIps.includes(requestIp);
}

// ── Access Logging (non-blocking) ────────────────────────────────────
function logAccess(
  supabase: ReturnType<typeof createClient>,
  params: {
    api_key_id: string | null;
    endpoint: string;
    http_method: string;
    request_ip: string;
    response_status: number;
    response_time_ms: number;
    request_payload_summary?: string;
    error_message?: string;
  }
) {
  // Fire-and-forget
  supabase.from("public_api_access_logs").insert(params).then(() => {});
}

// ── Route Handlers ───────────────────────────────────────────────────

async function handleHealth() {
  return { status: "success", message: "API is healthy", data: { timestamp: new Date().toISOString() } };
}

async function handleGetIpMaster(
  supabase: ReturnType<typeof createClient>,
  params: Record<string, string>
) {
  const page = parseInt(params.page || "1");
  const limit = Math.min(parseInt(params.limit || "50"), 100);
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabase
    .from("ip_master")
    .select("*", { count: "exact" })
    .neq("status", "D")
    .range(offset, offset + limit - 1)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return {
    status: "success",
    message: "Records retrieved successfully",
    data,
    meta: { page, limit, total: count || 0 },
  };
}

async function handleGetIpMasterById(
  supabase: ReturnType<typeof createClient>,
  id: string
) {
  const { data, error } = await supabase
    .from("ip_master")
    .select("*")
    .eq("unique_uuid", id)
    .single();

  if (error) throw error;
  if (!data) throw { code: "NOT_FOUND", message: "Record not found" };
  return { status: "success", message: "Record retrieved", data };
}

async function handleCreateIpMaster(
  supabase: ReturnType<typeof createClient>,
  payload: Record<string, unknown>
) {
  const { data, error } = await supabase
    .from("ip_master")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return { status: "success", message: "Record created", data };
}

async function handleUpdateIpMaster(
  supabase: ReturnType<typeof createClient>,
  id: string,
  payload: Record<string, unknown>
) {
  const { data, error } = await supabase
    .from("ip_master")
    .update(payload)
    .eq("unique_uuid", id)
    .select()
    .single();

  if (error) throw error;
  return { status: "success", message: "Record updated", data };
}

async function handleGetDependents(
  supabase: ReturnType<typeof createClient>,
  ssn: string
) {
  const { data, error } = await supabase
    .from("ip_depend")
    .select("*")
    .eq("ssn", ssn);

  if (error) throw error;
  return { status: "success", message: "Dependents retrieved", data };
}

async function handleCreateDependent(
  supabase: ReturnType<typeof createClient>,
  payload: Record<string, unknown>
) {
  const { data, error } = await supabase
    .from("ip_depend")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return { status: "success", message: "Dependent created", data };
}

async function handleUpdateDependent(
  supabase: ReturnType<typeof createClient>,
  id: string,
  payload: Record<string, unknown>
) {
  const { data, error } = await supabase
    .from("ip_depend")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return { status: "success", message: "Dependent updated", data };
}

async function handleDeleteDependent(
  supabase: ReturnType<typeof createClient>,
  id: string
) {
  const { error } = await supabase.from("ip_depend").delete().eq("id", id);
  if (error) throw error;
  return { status: "success", message: "Dependent deleted", data: null };
}

async function handleGetNotes(
  supabase: ReturnType<typeof createClient>,
  ssn: string
) {
  const { data, error } = await supabase
    .from("ip_notes")
    .select("*")
    .eq("ssn", ssn)
    .order("note_date", { ascending: false });

  if (error) throw error;
  return { status: "success", message: "Notes retrieved", data };
}

async function handleCreateNote(
  supabase: ReturnType<typeof createClient>,
  payload: Record<string, unknown>
) {
  const { data, error } = await supabase
    .from("ip_notes")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return { status: "success", message: "Note created", data };
}

// ── Route Matching ───────────────────────────────────────────────────
function matchRoute(
  path: string,
  method: string
): {
  handler: string;
  params: Record<string, string>;
} | null {
  // Health check
  if (path === "/api/v1/health" && method === "GET") {
    return { handler: "health", params: {} };
  }

  // IP Master routes
  const ipMasterMatch = path.match(/^\/api\/v1\/ip-master\/?$/);
  if (ipMasterMatch) {
    if (method === "GET") return { handler: "getIpMaster", params: {} };
    if (method === "POST") return { handler: "createIpMaster", params: {} };
  }

  const ipMasterIdMatch = path.match(/^\/api\/v1\/ip-master\/([a-zA-Z0-9-]+)$/);
  if (ipMasterIdMatch) {
    if (method === "GET")
      return { handler: "getIpMasterById", params: { id: ipMasterIdMatch[1] } };
    if (method === "PUT")
      return { handler: "updateIpMaster", params: { id: ipMasterIdMatch[1] } };
  }

  // Dependents routes
  const ipDependMatch = path.match(/^\/api\/v1\/ip-depend\/([a-zA-Z0-9-]+)$/);
  if (ipDependMatch) {
    if (method === "GET")
      return { handler: "getDependents", params: { ssn: ipDependMatch[1] } };
    if (method === "PUT")
      return { handler: "updateDependent", params: { id: ipDependMatch[1] } };
    if (method === "DELETE")
      return { handler: "deleteDependent", params: { id: ipDependMatch[1] } };
  }

  const ipDependCreateMatch = path.match(/^\/api\/v1\/ip-depend\/?$/);
  if (ipDependCreateMatch && method === "POST") {
    return { handler: "createDependent", params: {} };
  }

  // Notes routes
  const ipNotesMatch = path.match(/^\/api\/v1\/ip-notes\/([a-zA-Z0-9-]+)$/);
  if (ipNotesMatch && method === "GET") {
    return { handler: "getNotes", params: { ssn: ipNotesMatch[1] } };
  }

  const ipNotesCreateMatch = path.match(/^\/api\/v1\/ip-notes\/?$/);
  if (ipNotesCreateMatch && method === "POST") {
    return { handler: "createNote", params: {} };
  }

  return null;
}

// ── Execute Handler ──────────────────────────────────────────────────
async function executeHandler(
  handlerName: string,
  supabase: ReturnType<typeof createClient>,
  routeParams: Record<string, string>,
  payload: Record<string, unknown>,
  queryParams: Record<string, string>
) {
  switch (handlerName) {
    case "health":
      return handleHealth();
    case "getIpMaster":
      return handleGetIpMaster(supabase, queryParams);
    case "getIpMasterById":
      return handleGetIpMasterById(supabase, routeParams.id);
    case "createIpMaster":
      return handleCreateIpMaster(supabase, payload);
    case "updateIpMaster":
      return handleUpdateIpMaster(supabase, routeParams.id, payload);
    case "getDependents":
      return handleGetDependents(supabase, routeParams.ssn);
    case "createDependent":
      return handleCreateDependent(supabase, payload);
    case "updateDependent":
      return handleUpdateDependent(supabase, routeParams.id, payload);
    case "deleteDependent":
      return handleDeleteDependent(supabase, routeParams.id);
    case "getNotes":
      return handleGetNotes(supabase, routeParams.ssn);
    case "createNote":
      return handleCreateNote(supabase, payload);
    default:
      throw { code: "NOT_FOUND", message: `Unknown handler: ${handlerName}` };
  }
}

// ── Main Handler ─────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabase = getServiceClient();
  const requestIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";

  let apiKeyId: string | null = null;
  let endpoint = "";
  let httpMethod = "";

  try {
    // Parse request body
    if (req.method !== "POST") {
      return jsonResponse(
        {
          status: "error",
          message: "Method not allowed. Use POST with path, method, and payload in body.",
          error: { code: "METHOD_NOT_ALLOWED" },
        },
        405
      );
    }

    const body = await req.json();
    const { path, method, payload = {}, query = {} } = body;

    if (!path || !method) {
      return jsonResponse(
        {
          status: "error",
          message: "Missing required fields: path, method",
          error: { code: "BAD_REQUEST" },
        },
        400
      );
    }

    endpoint = path;
    httpMethod = method.toUpperCase();

    // Skip auth for health check
    if (path === "/api/v1/health" && httpMethod === "GET") {
      const result = await handleHealth();
      logAccess(supabase, {
        api_key_id: null,
        endpoint,
        http_method: httpMethod,
        request_ip: requestIp,
        response_status: 200,
        response_time_ms: Date.now() - startTime,
      });
      return jsonResponse(result);
    }

    // ── API Key Validation ──
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) {
      logAccess(supabase, {
        api_key_id: null,
        endpoint,
        http_method: httpMethod,
        request_ip: requestIp,
        response_status: 401,
        response_time_ms: Date.now() - startTime,
        error_message: "Missing API key",
      });
      return jsonResponse(
        {
          status: "error",
          message: "Missing API key",
          error: { code: "UNAUTHORIZED", details: "Provide x-api-key header" },
        },
        401
      );
    }

    const keyData = await validateApiKey(apiKey, supabase);
    if (!keyData) {
      logAccess(supabase, {
        api_key_id: null,
        endpoint,
        http_method: httpMethod,
        request_ip: requestIp,
        response_status: 401,
        response_time_ms: Date.now() - startTime,
        error_message: "Invalid or expired API key",
      });
      return jsonResponse(
        {
          status: "error",
          message: "Invalid API key",
          error: {
            code: "UNAUTHORIZED",
            details: "The provided API key is invalid or has been revoked",
          },
        },
        401
      );
    }

    apiKeyId = keyData.id;

    // ── IP Whitelist ──
    if (!isIpAllowed(keyData.allowed_ip_addresses, requestIp)) {
      logAccess(supabase, {
        api_key_id: apiKeyId,
        endpoint,
        http_method: httpMethod,
        request_ip: requestIp,
        response_status: 403,
        response_time_ms: Date.now() - startTime,
        error_message: "IP not allowed",
      });
      return jsonResponse(
        {
          status: "error",
          message: "Access denied",
          error: { code: "FORBIDDEN", details: "IP address not whitelisted" },
        },
        403
      );
    }

    // ── Rate Limiting ──
    const withinLimit = await checkRateLimit(
      apiKeyId,
      keyData.rate_limit_per_minute,
      supabase
    );
    if (!withinLimit) {
      logAccess(supabase, {
        api_key_id: apiKeyId,
        endpoint,
        http_method: httpMethod,
        request_ip: requestIp,
        response_status: 429,
        response_time_ms: Date.now() - startTime,
        error_message: "Rate limit exceeded",
      });
      return jsonResponse(
        {
          status: "error",
          message: "Rate limit exceeded",
          error: {
            code: "RATE_LIMITED",
            details: `Limit: ${keyData.rate_limit_per_minute} requests/minute`,
          },
        },
        429
      );
    }

    // ── Endpoint Authorization ──
    if (!isEndpointAllowed(keyData.allowed_endpoints, path)) {
      logAccess(supabase, {
        api_key_id: apiKeyId,
        endpoint,
        http_method: httpMethod,
        request_ip: requestIp,
        response_status: 403,
        response_time_ms: Date.now() - startTime,
        error_message: "Endpoint not allowed for this key",
      });
      return jsonResponse(
        {
          status: "error",
          message: "Endpoint not authorized",
          error: {
            code: "FORBIDDEN",
            details: "This API key does not have access to this endpoint",
          },
        },
        403
      );
    }

    // ── Route Matching ──
    const route = matchRoute(path, httpMethod);
    if (!route) {
      logAccess(supabase, {
        api_key_id: apiKeyId,
        endpoint,
        http_method: httpMethod,
        request_ip: requestIp,
        response_status: 404,
        response_time_ms: Date.now() - startTime,
        error_message: "Route not found",
      });
      return jsonResponse(
        {
          status: "error",
          message: "Endpoint not found",
          error: { code: "NOT_FOUND" },
        },
        404
      );
    }

    // ── Execute ──
    const result = await executeHandler(
      route.handler,
      supabase,
      route.params,
      payload || {},
      query || {}
    );

    const responseTime = Date.now() - startTime;
    logAccess(supabase, {
      api_key_id: apiKeyId,
      endpoint,
      http_method: httpMethod,
      request_ip: requestIp,
      response_status: 200,
      response_time_ms: responseTime,
      request_payload_summary: JSON.stringify(payload || {}).substring(0, 500),
    });

    return jsonResponse(result);
  } catch (err: unknown) {
    const responseTime = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorCode =
      (err as Record<string, unknown>)?.code === "NOT_FOUND" ? 404 : 500;

    logAccess(supabase, {
      api_key_id: apiKeyId,
      endpoint,
      http_method: httpMethod,
      request_ip: requestIp,
      response_status: errorCode,
      response_time_ms: responseTime,
      error_message: errorMessage,
    });

    return jsonResponse(
      {
        status: "error",
        message: "Internal server error",
        error: { code: "INTERNAL_ERROR", details: errorMessage },
      },
      errorCode
    );
  }
});
