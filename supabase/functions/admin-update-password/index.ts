import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-correlation-id",
};

// Helper function to log to system tables
async function logToSystem(
  supabase: any,
  tableName: string,
  data: Record<string, any>,
  correlationId: string
) {
  try {
    await supabase.from(tableName).insert({
      ...data,
      correlation_id: correlationId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`Failed to log to ${tableName}:`, error);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = performance.now();
  const correlationId = req.headers.get("x-correlation-id") || crypto.randomUUID();

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
      await logToSystem(supabaseAdmin, 'system_security_logs', {
        event_type: 'permission_denied',
        module: 'UserManagement',
        api_name: 'admin-update-password',
        severity: 'warning',
        success: false,
        payload_json: { reason: 'Invalid token' },
      }, correlationId);

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
      await logToSystem(supabaseAdmin, 'system_security_logs', {
        event_type: 'permission_denied',
        user_name: callingUser.email,
        module: 'UserManagement',
        api_name: 'admin-update-password',
        severity: 'warning',
        success: false,
        user_id: callingUser.id,
        payload_json: { reason: 'Admin role required' },
      }, correlationId);

      return new Response(
        JSON.stringify({ error: "Insufficient permissions. Admin role required." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the request body
    const { identity_user_id, new_password } = await req.json();

    if (!identity_user_id || !new_password) {
      return new Response(
        JSON.stringify({ error: "identity_user_id and new_password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find the Supabase auth user ID from the user_identity_map
    const { data: identityMap, error: mapError } = await supabaseAdmin
      .from("user_identity_map")
      .select("supabase_auth_id, identity_user_id")
      .eq("identity_user_id", identity_user_id)
      .single();

    if (mapError || !identityMap) {
      // If no mapping found, try to find by looking at profiles table directly
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("id, email")
        .eq("id", identity_user_id)
        .single();

      if (profileError || !profile) {
        return new Response(
          JSON.stringify({ error: "User not found in identity map or profiles" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // The identity_user_id is actually the Supabase auth user ID
      const supabaseAuthUserId = identity_user_id;

      // Update the password using admin API
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        supabaseAuthUserId,
        { password: new_password }
      );

      if (updateError) {
        await logToSystem(supabaseAdmin, 'system_error_logs', {
          api_name: 'admin-update-password',
          module: 'UserManagement',
          error_type: 'PasswordUpdateError',
          error_message: updateError.message,
          severity: 'error',
          user_id: callingUser.id,
          payload_json: { target_user_id: identity_user_id },
        }, correlationId);

        return new Response(
          JSON.stringify({ error: updateError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update the profiles table to track password change
      await supabaseAdmin
        .from("profiles")
        .update({
          last_password_change: new Date().toISOString(),
          force_password_change: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", supabaseAuthUserId);

      const executionTime = Math.round(performance.now() - startTime);

      // Log the successful password update
      await logToSystem(supabaseAdmin, 'system_audit_trail', {
        action: 'update',
        entity_type: 'user_password',
        entity_id: supabaseAuthUserId,
        module: 'UserManagement',
        user_name: callingUser.email,
        user_id: callingUser.id,
        description: `Password updated for user ${profile.email}`,
      }, correlationId);

      await logToSystem(supabaseAdmin, 'system_technical_logs', {
        api_name: 'admin-update-password',
        module: 'UserManagement',
        severity: 'info',
        status: 'success',
        execution_time_ms: executionTime,
        user_id: callingUser.id,
        entity_type: 'user',
        entity_id: supabaseAuthUserId,
      }, correlationId);

      return new Response(
        JSON.stringify({ success: true, message: "Password updated successfully" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // We have a mapping, use the supabase_auth_id
    const supabaseAuthUserId = identityMap.supabase_auth_id;

    if (!supabaseAuthUserId) {
      return new Response(
        JSON.stringify({ error: "No Supabase auth ID found for this user. User may need to be migrated." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update the password using admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      supabaseAuthUserId,
      { password: new_password }
    );

    if (updateError) {
      await logToSystem(supabaseAdmin, 'system_error_logs', {
        api_name: 'admin-update-password',
        module: 'UserManagement',
        error_type: 'PasswordUpdateError',
        error_message: updateError.message,
        severity: 'error',
        user_id: callingUser.id,
        payload_json: { target_user_id: identity_user_id, supabase_auth_id: supabaseAuthUserId },
      }, correlationId);

      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update the AspNetUsers table to track password change
    await supabaseAdmin
      .from("AspNetUsers")
      .update({
        last_password_change: new Date().toISOString(),
        force_password_change: false,
        updated_at: new Date().toISOString(),
      })
      .eq("Id", identity_user_id);

    // Also update profiles if exists
    await supabaseAdmin
      .from("profiles")
      .update({
        last_password_change: new Date().toISOString(),
        force_password_change: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", supabaseAuthUserId);

    const executionTime = Math.round(performance.now() - startTime);

    // Log the successful password update
    await logToSystem(supabaseAdmin, 'system_audit_trail', {
      action: 'update',
      entity_type: 'user_password',
      entity_id: identity_user_id,
      module: 'UserManagement',
      user_name: callingUser.email,
      user_id: callingUser.id,
      description: `Password updated for user ID ${identity_user_id}`,
    }, correlationId);

    await logToSystem(supabaseAdmin, 'system_technical_logs', {
      api_name: 'admin-update-password',
      module: 'UserManagement',
      severity: 'info',
      status: 'success',
      execution_time_ms: executionTime,
      user_id: callingUser.id,
      entity_type: 'user',
      entity_id: identity_user_id,
    }, correlationId);

    return new Response(
      JSON.stringify({ success: true, message: "Password updated successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const executionTime = Math.round(performance.now() - startTime);
    console.error("Admin update password error:", error);

    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      await logToSystem(supabase, 'system_error_logs', {
        api_name: 'admin-update-password',
        module: 'UserManagement',
        error_type: error instanceof Error ? error.name : 'UnknownError',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        stack_trace: error instanceof Error ? error.stack : undefined,
        severity: 'critical',
        payload_json: { execution_time_ms: executionTime },
      }, correlationId);
    } catch (logError) {
      console.error("Failed to log error:", logError);
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
