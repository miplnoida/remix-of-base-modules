import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function hashKey(key: string): Promise<string> {
  const encoded = new TextEncoder().encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body = await req.json();
    const { api_key } = body;

    if (!api_key || typeof api_key !== "string" || api_key.trim().length === 0) {
      return new Response(
        JSON.stringify({ valid: false, error: "API key is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate the API key
    const keyHash = await hashKey(api_key.trim());
    const { data: keyData, error: keyError } = await supabase
      .from("public_api_keys")
      .select("id, app_name, status, expires_at, key_prefix")
      .eq("key_hash", keyHash)
      .eq("status", "active")
      .single();

    if (keyError || !keyData) {
      return new Response(
        JSON.stringify({ valid: false, error: "Invalid or inactive API key" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check expiry
    if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ valid: false, error: "API key has expired" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get scope assignments for this key
    const { data: scopes } = await supabase
      .from("api_key_scope_assignments")
      .select("api_registry_id")
      .eq("api_key_id", keyData.id)
      .eq("is_allowed", true);

    // Get all enabled API registry entries
    const { data: allApis } = await supabase
      .from("api_registry")
      .select("id, api_name, api_version, http_method, endpoint_path, description, requires_auth, rate_limit_override, is_enabled, category, sort_order, updated_at")
      .eq("is_enabled", true)
      .order("sort_order")
      .order("api_name");

    let permittedApis = allApis || [];

    // If scopes exist, filter to only permitted APIs
    if (scopes && scopes.length > 0) {
      const allowedIds = new Set(scopes.map((s: { api_registry_id: string }) => s.api_registry_id));
      permittedApis = permittedApis.filter((api: { id: string }) => allowedIds.has(api.id));
    }
    // If no scopes assigned, all enabled APIs are accessible (default behavior)

    return new Response(
      JSON.stringify({
        valid: true,
        app_name: keyData.app_name,
        key_prefix: keyData.key_prefix,
        permitted_apis: permittedApis,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ valid: false, error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
