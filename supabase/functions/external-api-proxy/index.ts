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

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: claims, error: claimsError } = await supabase.auth.getClaims(
    authHeader.replace("Bearer ", "")
  );
  if (claimsError || !claims?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userId = claims.claims.sub;

  try {
    const body = await req.json();
    const {
      api_id,
      endpoint_url,
      http_method,
      headers: customHeaders,
      query_params,
      body: requestBody,
      auth_type,
      api_key,
    } = body;

    if (!api_id || !endpoint_url || !http_method) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: api_id, endpoint_url, http_method" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify API exists and is active
    const { data: apiData, error: apiError } = await supabase
      .from("external_api_master")
      .select("id, is_active, requires_auth, auth_type")
      .eq("id", api_id)
      .single();

    if (apiError || !apiData || !apiData.is_active) {
      return new Response(
        JSON.stringify({ error: "API not found or inactive" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build URL with query params
    let url = endpoint_url;
    if (query_params && Object.keys(query_params).length > 0) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(query_params)) {
        params.append(key, String(value));
      }
      url += (url.includes("?") ? "&" : "?") + params.toString();
    }

    // Build headers
    const fetchHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...(customHeaders || {}),
    };

    if (auth_type === "bearer_token") {
      fetchHeaders["Authorization"] = authHeader;
    } else if (auth_type === "api_key" && api_key) {
      fetchHeaders["x-api-key"] = api_key;
    }

    const startTime = Date.now();

    const fetchOptions: RequestInit = {
      method: http_method,
      headers: fetchHeaders,
    };

    if (["POST", "PUT", "PATCH"].includes(http_method) && requestBody) {
      fetchOptions.body = JSON.stringify(requestBody);
    }

    let responseStatus = 0;
    let responseBody: unknown = null;
    let isSuccess = false;
    let errorMessage: string | null = null;

    try {
      const response = await fetch(url, fetchOptions);
      responseStatus = response.status;
      const responseText = await response.text();
      try {
        responseBody = JSON.parse(responseText);
      } catch {
        responseBody = { raw: responseText };
      }
      isSuccess = response.ok;
      if (!response.ok) {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
    } catch (fetchError) {
      errorMessage = fetchError instanceof Error ? fetchError.message : "Network error";
      responseBody = { error: errorMessage };
    }

    const executionTime = Date.now() - startTime;

    // Log the execution (use service role to bypass RLS for insert)
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await serviceClient.from("external_api_execution_logs").insert({
      api_id,
      request_payload: {
        url,
        method: http_method,
        headers: { ...fetchHeaders, Authorization: "[REDACTED]", "x-api-key": api_key ? "[REDACTED]" : undefined },
        body: requestBody,
      },
      response_payload: responseBody,
      http_status_code: responseStatus,
      execution_time_ms: executionTime,
      executed_by: userId,
      is_success: isSuccess,
      error_message: errorMessage,
    });

    return new Response(
      JSON.stringify({
        status_code: responseStatus,
        response: responseBody,
        execution_time_ms: executionTime,
        is_success: isSuccess,
        error_message: errorMessage,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
