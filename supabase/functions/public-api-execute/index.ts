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

  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body = await req.json();
    const { api_registry_id, query_params, path_params, headers: customHeaders, api_key } = body;

    if (!api_registry_id) {
      return new Response(
        JSON.stringify({ error: "Missing api_registry_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify API exists and is enabled
    const { data: apiData, error: apiError } = await serviceClient
      .from("api_registry")
      .select("*")
      .eq("id", api_registry_id)
      .eq("is_enabled", true)
      .single();

    if (apiError || !apiData) {
      return new Response(
        JSON.stringify({ error: "API not found or disabled" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build the target URL
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    let endpointPath = apiData.endpoint_path;

    // Replace path params
    if (path_params && typeof path_params === "object") {
      for (const [key, value] of Object.entries(path_params)) {
        endpointPath = endpointPath.replace(`{${key}}`, encodeURIComponent(String(value)));
      }
    }

    let targetUrl = `${supabaseUrl}/functions/v1/public-api${endpointPath}`;

    // Add query params
    if (query_params && Object.keys(query_params).length > 0) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(query_params)) {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, String(value));
        }
      }
      const qs = params.toString();
      if (qs) targetUrl += (targetUrl.includes("?") ? "&" : "?") + qs;
    }

    // Build headers
    const fetchHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (customHeaders && typeof customHeaders === "object") {
      for (const [key, value] of Object.entries(customHeaders)) {
        if (key && value) fetchHeaders[key] = String(value);
      }
    }

    if (api_key) {
      fetchHeaders["x-api-key"] = api_key;
    }

    const startTime = Date.now();

    let responseStatus = 0;
    let responseBody: unknown = null;
    let isSuccess = false;
    let errorMessage: string | null = null;

    try {
      const response = await fetch(targetUrl, {
        method: apiData.http_method,
        headers: fetchHeaders,
      });
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

    // Log execution
    await serviceClient.from("external_api_execution_logs").insert({
      api_id: api_registry_id,
      request_payload: {
        url: targetUrl,
        method: apiData.http_method,
        headers: { ...fetchHeaders, "x-api-key": api_key ? "[REDACTED]" : undefined },
        query_params,
        path_params,
      },
      response_payload: responseBody,
      http_status_code: responseStatus,
      execution_time_ms: executionTime,
      executed_by: null,
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
