const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const envKeys = [
    "SUPABASE_URL",
    "SUPABASE_DB_URL",
    "SUPABASE_DB_HOST",
    "SUPABASE_DB_PORT",
    "SUPABASE_DB_USER",
    "SUPABASE_DB_NAME",
    "SUPABASE_DB_PASSWORD",
    "DATABASE_URL",
    "POSTGRES_URL",
    "PGHOST",
    "PGPORT",
    "PGUSER",
    "PGDATABASE",
  ];

  const result: Record<string, string | null> = {};
  for (const key of envKeys) {
    const val = Deno.env.get(key);
    result[key] = val ?? null;
  }

  // Also try to parse host from SUPABASE_URL
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (supabaseUrl) {
    try {
      const url = new URL(supabaseUrl);
      result["_parsed_supabase_host"] = url.hostname;
      result["_derived_db_host"] = `db.${url.hostname.split(".")[0]}.supabase.co`;
    } catch { /* ignore */ }
  }

  return new Response(JSON.stringify(result, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
