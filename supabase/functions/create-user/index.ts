import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Verify the caller is authenticated and is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the calling user's JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: callingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !callingUser) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if caller has Admin role
    const { data: callerRoles, error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callingUser.id);
    
    if (rolesError) {
      return new Response(
        JSON.stringify({ error: "Failed to verify permissions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isAdmin = callerRoles?.some(r => r.role === "Admin");
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Insufficient permissions. Admin role required." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the request body
    const {
      email,
      password,
      first_name,
      last_name,
      middle_name,
      title,
      phone,
      gender,
      date_of_birth,
      employee_code,
      office_id,
      department_id,
      roles: assignRoles = []
    } = await req.json();

    if (!email || !password || !first_name || !last_name) {
      return new Response(
        JSON.stringify({ error: "Email, password, first name, and last name are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create the user using admin API (doesn't affect caller's session)
    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: `${first_name} ${last_name}`.trim(),
      },
    });

    if (createError) {
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const newUserId = authData.user.id;

    // Upsert the profile with additional fields
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: newUserId,
        email: email,
        title: title || null,
        first_name,
        last_name,
        middle_name: middle_name || null,
        full_name: `${first_name} ${last_name}`.trim(),
        phone: phone || null,
        gender: gender || null,
        date_of_birth: date_of_birth || null,
        employee_code: employee_code || null,
        office_id: office_id || null,
        department_id: department_id || null,
        is_active: true,
        force_password_change: true,
      });

    if (profileError) {
      console.error("Profile update error:", profileError);
      // Don't fail the whole operation, profile will be updated later
    }

    // Assign roles if provided
    if (assignRoles.length > 0) {
      const roleInserts = assignRoles.map((role: string) => ({
        user_id: newUserId,
        role,
      }));

      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .insert(roleInserts);

      if (roleError) {
        console.error("Role assignment error:", roleError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: newUserId,
          email: authData.user.email,
          full_name: `${first_name} ${last_name}`.trim(),
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Create user error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
