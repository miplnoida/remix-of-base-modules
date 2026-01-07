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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Check if any admin users already exist
    const { data: existingAdmins, error: checkError } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "Admin")
      .limit(1);

    if (checkError) {
      return new Response(
        JSON.stringify({ error: "Failed to check existing admins" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (existingAdmins && existingAdmins.length > 0) {
      return new Response(
        JSON.stringify({ error: "Admin user already exists. Use normal user creation." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, password, first_name, last_name } = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Email and password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create the first admin user
    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: `${first_name || 'System'} ${last_name || 'Admin'}`.trim(),
      },
    });

    if (createError) {
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const newUserId = authData.user.id;

    // Upsert profile (insert or update)
    await supabaseAdmin
      .from("profiles")
      .upsert({
        id: newUserId,
        email: email,
        first_name: first_name || 'System',
        last_name: last_name || 'Admin',
        full_name: `${first_name || 'System'} ${last_name || 'Admin'}`.trim(),
        is_active: true,
        force_password_change: false,
      });

    // Assign Admin role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: newUserId, role: "Admin" });

    if (roleError) {
      return new Response(
        JSON.stringify({ error: `User created but role assignment failed: ${roleError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "First admin user created successfully",
        user: { id: newUserId, email: authData.user.email },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Bootstrap admin error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
