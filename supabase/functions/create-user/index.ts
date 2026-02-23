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
      // Log security event for invalid token
      await logToSystem(supabaseAdmin, 'system_security_logs', {
        event_type: 'permission_denied',
        module: 'UserManagement',
        api_name: 'create-user',
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
      // Log security event for permission denied
      await logToSystem(supabaseAdmin, 'system_security_logs', {
        event_type: 'permission_denied',
        user_name: callingUser.email,
        module: 'UserManagement',
        api_name: 'create-user',
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
      office_code,
      department_id,
      designation_id,
      roles: assignRoles = []
    } = await req.json();

    if (!email || !password || !first_name || !last_name) {
      return new Response(
        JSON.stringify({ error: "Email, password, first name, and last name are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log technical call start
    await logToSystem(supabaseAdmin, 'system_technical_logs', {
      api_name: 'create-user',
      module: 'UserManagement',
      severity: 'info',
      status: 'started',
      user_id: callingUser.id,
      payload_json: { email, first_name, last_name, roles: assignRoles },
    }, correlationId);

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
      // Log error
      await logToSystem(supabaseAdmin, 'system_error_logs', {
        api_name: 'create-user',
        module: 'UserManagement',
        error_type: 'UserCreationError',
        error_message: createError.message,
        severity: 'error',
        user_id: callingUser.id,
        payload_json: { email },
      }, correlationId);

      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const newUserId = authData.user.id;

    // Resolve office_code: prefer explicit office_code, fall back to office_id for backward compat
    const resolvedOfficeCode = office_code || office_id || null;

    // Upsert the profile with all available fields
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
        office_code: resolvedOfficeCode,
        department_id: department_id || null,
        designation_id: designation_id || null,
        is_active: true,
        force_password_change: true,
      });

    if (profileError) {
      console.error("Profile creation error:", profileError);
      // Profile creation failed — this is critical, return error so admin knows
      // The auth user was created but has no profile — log and report
      await logToSystem(supabaseAdmin, 'system_error_logs', {
        api_name: 'create-user',
        module: 'UserManagement',
        error_type: 'ProfileCreationError',
        error_message: profileError.message,
        severity: 'critical',
        user_id: callingUser.id,
        payload_json: { email, newUserId, profileError: profileError.message },
      }, correlationId);

      return new Response(
        JSON.stringify({ 
          error: `User auth account created but profile creation failed: ${profileError.message}. Please contact support with user ID: ${newUserId}`,
          user_id: newUserId,
          partial: true,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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

    const executionTime = Math.round(performance.now() - startTime);

    // Log business event
    await logToSystem(supabaseAdmin, 'system_business_events', {
      action: 'create',
      entity_type: 'user',
      entity_id: newUserId,
      module: 'UserManagement',
      performed_by: callingUser.email,
      user_id: callingUser.id,
      description: `User ${email} created with roles: ${assignRoles.join(', ') || 'none'}`,
      severity: 'info',
    }, correlationId);

    // Log audit trail
    await logToSystem(supabaseAdmin, 'system_audit_trail', {
      action: 'create',
      entity_type: 'user',
      entity_id: newUserId,
      module: 'UserManagement',
      user_name: callingUser.email,
      user_id: callingUser.id,
      after_value: { email, first_name, last_name, roles: assignRoles },
    }, correlationId);

    // Log technical completion
    await logToSystem(supabaseAdmin, 'system_technical_logs', {
      api_name: 'create-user',
      module: 'UserManagement',
      severity: 'info',
      status: 'success',
      execution_time_ms: executionTime,
      user_id: callingUser.id,
      entity_type: 'user',
      entity_id: newUserId,
      payload_json: { email, newUserId },
    }, correlationId);

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
    const executionTime = Math.round(performance.now() - startTime);
    console.error("Create user error:", error);

    // Try to log error
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      await logToSystem(supabase, 'system_error_logs', {
        api_name: 'create-user',
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