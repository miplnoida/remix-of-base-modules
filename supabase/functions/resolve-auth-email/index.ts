import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // First check if there's a profile with this email
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .eq("email", email)
      .single();

    if (profileError || !profile) {
      // No profile found — let the normal login flow handle it
      return new Response(
        JSON.stringify({ auth_email: email }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if the auth user has a different email
    const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.admin.getUserById(profile.id);

    if (authError || !authUser) {
      return new Response(
        JSON.stringify({ auth_email: email }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If emails differ, sync the profile email to match auth and return auth email
    if (authUser.email && authUser.email !== email) {
      // Sync the profile email to auth email
      await supabaseAdmin
        .from("profiles")
        .update({ email: authUser.email, updated_at: new Date().toISOString() })
        .eq("id", profile.id);

      console.log(`Synced profile email from "${email}" to "${authUser.email}" for user ${profile.id}`);

      return new Response(
        JSON.stringify({ auth_email: authUser.email, synced: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ auth_email: email }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Resolve auth email error:", error);
    return new Response(
      JSON.stringify({ auth_email: null, error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
