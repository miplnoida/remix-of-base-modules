import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SeedUser {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: string;
}

const SEED_USERS: SeedUser[] = [
  {
    email: "inspector@secureserve.gov",
    password: "Admin@123",
    first_name: "Test",
    last_name: "Inspector",
    role: "ComplianceInspector",
  },
  {
    email: "sinspector@secureserve.gov",
    password: "Admin@123",
    first_name: "Test",
    last_name: "Senior Inspector",
    role: "SeniorInspector",
  },
  {
    email: "compliancehead@secureserve.gov",
    password: "Admin@123",
    first_name: "Test",
    last_name: "Compliance Head",
    role: "ComplianceHead",
  },
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const admin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const results: Array<{
      email: string;
      role: string;
      status: "created" | "already_exists" | "role_assigned" | "error";
      user_id?: string;
      message?: string;
    }> = [];

    for (const u of SEED_USERS) {
      try {
        // Try to find existing user by listing (admin API)
        const { data: existing } = await admin.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        });
        const found = existing?.users?.find(
          (x) => (x.email || "").toLowerCase() === u.email.toLowerCase(),
        );

        let userId: string;
        let createdNow = false;

        if (found) {
          userId = found.id;
          // Always reset password + ensure email is confirmed so the
          // mobile API login works with the documented credentials.
          await admin.auth.admin.updateUserById(userId, {
            password: u.password,
            email_confirm: true,
            user_metadata: {
              full_name: `${u.first_name} ${u.last_name}`.trim(),
            },
          });
        } else {
          const { data: created, error: createErr } = await admin.auth.admin.createUser({
            email: u.email,
            password: u.password,
            email_confirm: true,
            user_metadata: {
              full_name: `${u.first_name} ${u.last_name}`.trim(),
            },
          });
          if (createErr || !created.user) {
            results.push({
              email: u.email,
              role: u.role,
              status: "error",
              message: createErr?.message || "createUser failed",
            });
            continue;
          }
          userId = created.user.id;
          createdNow = true;
        }

        // Upsert profile
        await admin.from("profiles").upsert({
          id: userId,
          email: u.email,
          first_name: u.first_name,
          last_name: u.last_name,
          full_name: `${u.first_name} ${u.last_name}`.trim(),
          is_active: true,
          force_password_change: false,
        });

        // Assign role (idempotent — unique key prevents dupes)
        const { error: roleErr } = await admin
          .from("user_roles")
          .upsert(
            { user_id: userId, role: u.role },
            { onConflict: "user_id,role", ignoreDuplicates: true },
          );

        if (roleErr) {
          results.push({
            email: u.email,
            role: u.role,
            status: "error",
            user_id: userId,
            message: `Role assignment failed: ${roleErr.message}`,
          });
          continue;
        }

        results.push({
          email: u.email,
          role: u.role,
          user_id: userId,
          status: createdNow ? "created" : "already_exists",
        });
      } catch (e) {
        results.push({
          email: u.email,
          role: u.role,
          status: "error",
          message: e instanceof Error ? e.message : String(e),
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        password: "Admin@123",
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("seed-compliance-test-users error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
