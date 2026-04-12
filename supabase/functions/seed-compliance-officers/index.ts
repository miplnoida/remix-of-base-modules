import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const INSPECTORS = [
  { code: "01", name: "Vincent Sutton", office: "STK", zone_idx: 0 },
  { code: "02", name: "Dexter Richardson", office: "STK", zone_idx: 0 },
  { code: "03", name: "Danielle Brown", office: "STK", zone_idx: 0 },
  { code: "04", name: "Kimmoy Brathwaite", office: "STK", zone_idx: 1 },
  { code: "05", name: "Omar Hodge", office: "STK", zone_idx: 1 },
  { code: "06", name: "Aleks Condell (Dexter)", office: "STK", zone_idx: 1 },
  { code: "07", name: "Patricia Rogers-Lake", office: "STK", zone_idx: 0 },
  { code: "N01", name: "Chase Lawrence", office: "NEV", zone_idx: 2 },
  { code: "N02", name: "Karen Amory", office: "NEV", zone_idx: 2 },
  { code: "N03", name: "Fayola O Tross", office: "NEV", zone_idx: 2 },
  { code: "N04", name: "Sheon Lewis", office: "NEV", zone_idx: 2 },
];

const ZONES = [
  "a1b2c3d4-0001-4000-8000-000000000001", // Z1
  "a1b2c3d4-0002-4000-8000-000000000002", // Z2
  "a1b2c3d4-0003-4000-8000-000000000003", // Z3
];

const OPS_QUEUES = [
  "971e3b60-de1e-49ea-8dc5-7f9c1975667b", // Z1-OPS
  "cb1569f5-df7e-4e10-b5ae-003883e62422", // Z2-OPS
  "96f2cbd2-2cc3-44e3-9588-1133ee2d7ed7", // Z3-OPS
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const results: any[] = [];
    const password = "Admin@123";

    // Step 1: Create Role "Compliance Inspector"
    const roleId = "cc000000-0000-0000-0000-000000000001";
    const { error: roleErr } = await admin.from("roles").upsert({
      id: roleId,
      role_name: "ComplianceInspector",
      description: "Compliance Inspector with full access to the Compliance module",
      is_active: true,
      is_system_role: false,
      mfa_required: false,
      created_by: "SYSTEM",
    }, { onConflict: "id" });

    if (roleErr) {
      results.push({ step: "create_role", error: roleErr.message });
    } else {
      results.push({ step: "create_role", status: "ok", role_id: roleId });
    }

    // Step 2: Grant all compliance module_actions to this role
    const { data: compModules } = await admin
      .from("app_modules")
      .select("id")
      .like("route", "/compliance%");

    const moduleIds = (compModules || []).map((m: any) => m.id);

    const { data: moduleActions } = await admin
      .from("module_actions")
      .select("id, module_id, action_name")
      .in("module_id", moduleIds);

    if (moduleActions && moduleActions.length > 0) {
      // Delete existing role_permissions for this role first
      await admin.from("role_permissions").delete().eq("role_id", roleId);

      const perms = moduleActions.map((ma: any) => ({
        role_id: roleId,
        module_id: ma.module_id,
        action_id: ma.id,
        is_granted: true,
        created_by: "SYSTEM",
      }));

      const { error: permErr } = await admin.from("role_permissions").insert(perms);
      results.push({
        step: "grant_permissions",
        count: perms.length,
        error: permErr?.message || null,
      });
    }

    // Step 3: Create auth users, profiles, ce_inspectors, user_roles, queue_members
    for (const insp of INSPECTORS) {
      const nameParts = insp.name.split(" ");
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(" ");
      const emailSlug = insp.name
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, "")
        .replace(/\s+/g, ".");
      const email = `${emailSlug}@sknbs.org`;
      const userCode = `CI-${insp.code}`;

      // Create auth user
      const { data: authData, error: authErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: insp.name },
      });

      if (authErr) {
        // User might already exist
        if (authErr.message?.includes("already been registered")) {
          // Find existing user
          const { data: { users } } = await admin.auth.admin.listUsers();
          const existing = users?.find((u: any) => u.email === email);
          if (existing) {
            results.push({ inspector: insp.code, email, status: "exists", user_id: existing.id });
            // Still ensure profile, ce_inspectors, etc. exist
            await ensureRecords(admin, existing.id, insp, email, firstName, lastName, userCode, roleId, results);
          } else {
            results.push({ inspector: insp.code, email, error: authErr.message });
          }
          continue;
        }
        results.push({ inspector: insp.code, email, error: authErr.message });
        continue;
      }

      const userId = authData.user.id;
      results.push({ inspector: insp.code, email, status: "created", user_id: userId });

      await ensureRecords(admin, userId, insp, email, firstName, lastName, userCode, roleId, results);
    }

    return new Response(JSON.stringify({ success: true, results }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function ensureRecords(
  admin: any,
  userId: string,
  insp: any,
  email: string,
  firstName: string,
  lastName: string,
  userCode: string,
  roleId: string,
  results: any[]
) {
  // Upsert profile
  const { error: profErr } = await admin.from("profiles").upsert({
    id: userId,
    full_name: insp.name,
    first_name: firstName,
    last_name: lastName,
    email,
    user_code: userCode,
    office_code: insp.office,
    is_active: true,
    force_password_change: false,
  }, { onConflict: "id" });

  if (profErr) {
    results.push({ step: `profile_${insp.code}`, error: profErr.message });
  }

  // Create ce_inspectors record
  const zoneId = ZONES[insp.zone_idx];
  const { data: existingCI } = await admin
    .from("ce_inspectors")
    .select("id")
    .eq("profile_id", userId)
    .maybeSingle();

  if (!existingCI) {
    const { error: ciErr } = await admin.from("ce_inspectors").insert({
      profile_id: userId,
      inspector_code: userCode,
      legacy_inspector_code: insp.code,
      office_code: insp.office,
      primary_zone_id: zoneId,
      status: "ACTIVE",
      max_caseload: 50,
      can_handle_review: insp.code === "01" || insp.code === "N01",
      can_handle_legal: insp.code === "01",
    });
    if (ciErr) {
      results.push({ step: `ce_inspector_${insp.code}`, error: ciErr.message });
    }
  }

  // Get ce_inspector id for queue membership
  const { data: ciRecord } = await admin
    .from("ce_inspectors")
    .select("id")
    .eq("profile_id", userId)
    .maybeSingle();

  if (ciRecord) {
    // Add to zone OPS queue
    const queueId = OPS_QUEUES[insp.zone_idx];
    const { data: existingMember } = await admin
      .from("ce_queue_members")
      .select("id")
      .eq("queue_id", queueId)
      .eq("inspector_id", ciRecord.id)
      .maybeSingle();

    if (!existingMember) {
      const isLead = insp.code === "01" || insp.code === "04" || insp.code === "N01";
      const { error: qmErr } = await admin.from("ce_queue_members").insert({
        queue_id: queueId,
        inspector_id: ciRecord.id,
        role: isLead ? "LEAD" : "MEMBER",
        is_active: true,
      });
      if (qmErr) {
        results.push({ step: `queue_member_${insp.code}`, error: qmErr.message });
      }
    }
  }

  // Assign role
  const { data: existingRole } = await admin
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", roleId)
    .maybeSingle();

  if (!existingRole) {
    const { error: urErr } = await admin.from("user_roles").insert({
      user_id: userId,
      role: roleId,
    });
    if (urErr) {
      results.push({ step: `user_role_${insp.code}`, error: urErr.message });
    }
  }
}
