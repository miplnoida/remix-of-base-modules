import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate admin API key
  const apiKey = req.headers.get("x-admin-api-key");
  const expectedKey = Deno.env.get("WIZ_ADMIN_API_KEY");
  if (!apiKey || apiKey !== expectedKey) {
    return jsonResponse({ status: "error", error: "Invalid or missing API key" }, 401);
  }

  // Also require auth for audit trail
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse({ status: "error", error: "Unauthorized" }, 401);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Verify the calling user
  const anonClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: claims, error: claimsError } = await anonClient.auth.getClaims(
    authHeader.replace("Bearer ", "")
  );
  if (claimsError || !claims?.claims) {
    return jsonResponse({ status: "error", error: "Unauthorized" }, 401);
  }

  try {
    const body = await req.json();
    const { action, params = {} } = body;

    if (!action) {
      return jsonResponse({ status: "error", error: "Missing action" }, 400);
    }

    switch (action) {
      // ─── 1. GET EMPLOYER LIST ────────────────────────────
      case "get_employer_list": {
        const {
          search = "",
          sort_col = "registration_number",
          sort_dir = "asc",
          page_offset = 0,
          page_limit = 10,
        } = params;

        const validCols = ["registration_number", "registration_date", "contact_person", "company_name", "email"];
        if (!validCols.includes(sort_col)) {
          return jsonResponse({ status: "error", error: `Invalid sort_col. Must be one of: ${validCols.join(", ")}` }, 400);
        }
        const limit = Math.min(page_limit, 100);

        // Use RPC if available, otherwise direct query
        const { data, error, count } = await supabase
          .from("c3_companies")
          .select("*, c3_users(id), c3_employees(id)", { count: "exact" })
          .eq("is_deleted", false)
          .or(search ? `company_name.ilike.%${search}%,registration_number.ilike.%${search}%` : "id.gt.0")
          .order(sort_col, { ascending: sort_dir === "asc" })
          .range(page_offset, page_offset + limit - 1);

        if (error) {
          return jsonResponse({ status: "error", error: error.message }, 500);
        }

        const employers = (data || []).map((c: any) => ({
          id: c.id,
          registration_number: c.registration_number,
          registration_date: c.registration_date || c.created_at,
          company_name: c.company_name,
          trade_name: c.trade_name,
          contact_person: c.contact_person,
          mobile: c.mobile,
          phone: c.phone,
          email: c.email,
          parent_company_id: c.parent_company_id,
          is_deleted: c.is_deleted,
          user_count: c.c3_users?.length || 0,
          employee_count: c.c3_employees?.length || 0,
        }));

        return jsonResponse({
          status: "success",
          data: { employers },
          total_records: count || 0,
          page_offset,
          page_limit: limit,
        });
      }

      // ─── 2. GET EMPLOYER DETAILS ─────────────────────────
      case "get_employer_details": {
        const { company_id } = params;
        if (!company_id) return jsonResponse({ status: "error", error: "company_id required" }, 400);

        const { data: company, error } = await supabase
          .from("c3_companies")
          .select("*")
          .eq("id", company_id)
          .single();

        if (error) return jsonResponse({ status: "error", error: error.message }, 500);

        // Get primary user (first user for this company)
        const { data: users } = await supabase
          .from("c3_users")
          .select("*")
          .eq("company_id", company_id)
          .order("created_at", { ascending: true })
          .limit(1);

        const primaryUser = users?.[0] || null;

        // Get security questions
        let securityQuestions: any[] = [];
        if (primaryUser) {
          const { data: sq } = await supabase
            .from("c3_security_questions")
            .select("*")
            .eq("user_id", primaryUser.id)
            .order("question_number", { ascending: true });
          securityQuestions = sq || [];
        }

        return jsonResponse({
          status: "success",
          data: {
            company,
            primary_user: primaryUser ? {
              id: primaryUser.id,
              first_name: primaryUser.first_name,
              last_name: primaryUser.last_name,
              username: primaryUser.username,
              email: primaryUser.email,
            } : null,
            security_questions: securityQuestions,
            parent_company_id: company.parent_company_id || 0,
          },
        });
      }

      // ─── 3. UPDATE EMPLOYER ──────────────────────────────
      case "update_employer": {
        const { company_id, company_data, user_data, security_questions } = params;
        if (!company_id) return jsonResponse({ status: "error", error: "company_id required" }, 400);

        // Update company
        if (company_data) {
          const { error } = await supabase
            .from("c3_companies")
            .update({
              company_name: company_data.company_name,
              trade_name: company_data.trade_name,
              contact_person: company_data.contact_person,
              email: company_data.email,
              mobile: company_data.mobile,
              phone: company_data.phone,
              address_line1: company_data.address_line1,
              address_line2: company_data.address_line2,
              city: company_data.city,
              postal_code: company_data.postal_code,
              country: company_data.country,
              is_levy_exempt: company_data.is_levy_exempt,
              updated_at: new Date().toISOString(),
            })
            .eq("id", company_id);
          if (error) return jsonResponse({ status: "error", error: error.message }, 500);
        }

        // Update primary user
        if (user_data?.user_id) {
          const { error } = await supabase
            .from("c3_users")
            .update({
              first_name: user_data.first_name,
              last_name: user_data.last_name,
              username: user_data.username,
              updated_at: new Date().toISOString(),
            })
            .eq("id", user_data.user_id);
          if (error) return jsonResponse({ status: "error", error: error.message }, 500);
        }

        // Update security questions
        if (security_questions && user_data?.user_id) {
          for (let i = 1; i <= 2; i++) {
            const q = security_questions[`question${i}`];
            const a = security_questions[`answer${i}`];
            if (q && a) {
              await supabase
                .from("c3_security_questions")
                .upsert({
                  user_id: user_data.user_id,
                  question_number: i,
                  question: q,
                  answer_hash: a,
                }, { onConflict: "user_id,question_number" });
            }
          }
        }

        return jsonResponse({ status: "success", data: { message: "Employer updated" } });
      }

      // ─── 4. UPDATE COMPANY MAPPING ───────────────────────
      case "update_company_mapping": {
        const { parent_id, child_ids } = params;
        if (!parent_id || !Array.isArray(child_ids)) {
          return jsonResponse({ status: "error", error: "parent_id and child_ids required" }, 400);
        }

        // Clear existing children of this parent
        await supabase
          .from("c3_companies")
          .update({ parent_company_id: null })
          .eq("parent_company_id", parent_id);

        // Set new children
        if (child_ids.length > 0) {
          const { error } = await supabase
            .from("c3_companies")
            .update({ parent_company_id: parent_id })
            .in("id", child_ids);
          if (error) return jsonResponse({ status: "error", error: error.message }, 500);
        }

        return jsonResponse({ status: "success", data: { message: "Mapping updated" } });
      }

      // ─── 5. GET COMPANY USERS ────────────────────────────
      case "get_company_users": {
        const { company_id } = params;
        if (!company_id) return jsonResponse({ status: "error", error: "company_id required" }, 400);

        const { data, error } = await supabase
          .from("c3_users")
          .select("*")
          .eq("company_id", company_id)
          .order("created_at", { ascending: true });

        if (error) return jsonResponse({ status: "error", error: error.message }, 500);

        return jsonResponse({ status: "success", data: { users: data || [] } });
      }

      // ─── 6. GET USER DETAILS ─────────────────────────────
      case "get_user_details": {
        const { user_id } = params;
        if (!user_id) return jsonResponse({ status: "error", error: "user_id required" }, 400);

        const { data, error } = await supabase
          .from("c3_users")
          .select("*")
          .eq("id", user_id)
          .single();

        if (error) return jsonResponse({ status: "error", error: error.message }, 500);

        return jsonResponse({ status: "success", data: { user: data } });
      }

      // ─── 7. UPDATE USER ──────────────────────────────────
      case "update_user": {
        const { user_id, user_data } = params;
        if (!user_id) return jsonResponse({ status: "error", error: "user_id required" }, 400);

        const updatePayload: Record<string, any> = {
          updated_at: new Date().toISOString(),
        };
        if (user_data.first_name !== undefined) updatePayload.first_name = user_data.first_name;
        if (user_data.last_name !== undefined) updatePayload.last_name = user_data.last_name;
        if (user_data.email !== undefined) updatePayload.email = user_data.email;
        if (user_data.role_id !== undefined) updatePayload.role_id = user_data.role_id;
        if (user_data.company_id !== undefined) updatePayload.company_id = user_data.company_id;

        const { error } = await supabase
          .from("c3_users")
          .update(updatePayload)
          .eq("id", user_id);

        if (error) return jsonResponse({ status: "error", error: error.message }, 500);

        // Sync auth email if changed
        if (user_data.email) {
          const { data: userData } = await supabase
            .from("c3_users")
            .select("auth_user_id")
            .eq("id", user_id)
            .single();

          if (userData?.auth_user_id) {
            await supabase.auth.admin.updateUserById(userData.auth_user_id, {
              email: user_data.email,
            });
          }
        }

        return jsonResponse({ status: "success", data: { message: "User updated" } });
      }

      // ─── 8. TOGGLE USER STATUS ───────────────────────────
      case "toggle_user_status": {
        const { user_id } = params;
        if (!user_id) return jsonResponse({ status: "error", error: "user_id required" }, 400);

        const { data: user, error: fetchError } = await supabase
          .from("c3_users")
          .select("is_locked")
          .eq("id", user_id)
          .single();

        if (fetchError) return jsonResponse({ status: "error", error: fetchError.message }, 500);

        const newStatus = !user.is_locked;
        const { error } = await supabase
          .from("c3_users")
          .update({ is_locked: newStatus, updated_at: new Date().toISOString() })
          .eq("id", user_id);

        if (error) return jsonResponse({ status: "error", error: error.message }, 500);

        return jsonResponse({
          status: "success",
          data: {
            is_locked: newStatus,
            message: newStatus ? "User deactivated" : "User activated",
          },
        });
      }

      // ─── 9. CHANGE PASSWORD ──────────────────────────────
      case "change_password": {
        const { user_id, new_password, confirm_password } = params;
        if (!user_id) return jsonResponse({ status: "error", error: "user_id required" }, 400);
        if (!new_password || !confirm_password) {
          return jsonResponse({ status: "error", error: "new_password and confirm_password required" }, 400);
        }
        if (new_password !== confirm_password) {
          return jsonResponse({ status: "error", error: "Passwords do not match" }, 400);
        }
        // Validation: 8-40 chars, uppercase, lowercase, digit, special char
        if (new_password.length < 8 || new_password.length > 40) {
          return jsonResponse({ status: "error", error: "Password must be 8-40 characters" }, 400);
        }
        if (!/[A-Z]/.test(new_password)) return jsonResponse({ status: "error", error: "Password must contain an uppercase letter" }, 400);
        if (!/[a-z]/.test(new_password)) return jsonResponse({ status: "error", error: "Password must contain a lowercase letter" }, 400);
        if (!/[0-9]/.test(new_password)) return jsonResponse({ status: "error", error: "Password must contain a digit" }, 400);
        if (!/[^A-Za-z0-9]/.test(new_password)) return jsonResponse({ status: "error", error: "Password must contain a special character" }, 400);

        const { data: userData } = await supabase
          .from("c3_users")
          .select("auth_user_id")
          .eq("id", user_id)
          .single();

        if (!userData?.auth_user_id) {
          return jsonResponse({ status: "error", error: "User has no auth account" }, 400);
        }

        const { error } = await supabase.auth.admin.updateUserById(userData.auth_user_id, {
          password: new_password,
        });

        if (error) return jsonResponse({ status: "error", error: error.message }, 500);

        return jsonResponse({ status: "success", data: { message: "Password changed" } });
      }

      // ─── 10. RESET PASSWORD ──────────────────────────────
      case "reset_password": {
        const { user_id } = params;
        if (!user_id) return jsonResponse({ status: "error", error: "user_id required" }, 400);

        const { data: userData } = await supabase
          .from("c3_users")
          .select("email")
          .eq("id", user_id)
          .single();

        if (!userData?.email) {
          return jsonResponse({ status: "error", error: "User has no email" }, 400);
        }

        const { error } = await supabase.auth.admin.generateLink({
          type: "recovery",
          email: userData.email,
        });

        if (error) return jsonResponse({ status: "error", error: error.message }, 500);

        return jsonResponse({ status: "success", data: { message: "Password reset email sent" } });
      }

      // ─── 11. GET EMPLOYEE LIST ───────────────────────────
      case "get_employee_list": {
        const { company_id } = params;
        if (!company_id) return jsonResponse({ status: "error", error: "company_id required" }, 400);

        const { data: employees, error } = await supabase
          .from("c3_employees")
          .select("*")
          .eq("company_id", company_id)
          .eq("is_deleted", false)
          .order("created_at", { ascending: true });

        if (error) return jsonResponse({ status: "error", error: error.message }, 500);

        // Get salary/wages from incomes
        const employeeIds = (employees || []).map((e: any) => e.id);
        let incomes: any[] = [];
        if (employeeIds.length > 0) {
          const { data } = await supabase
            .from("c3_employee_incomes")
            .select("*")
            .in("employee_id", employeeIds);
          incomes = data || [];
        }

        const incomeMap = new Map<number, any>();
        for (const inc of incomes) {
          incomeMap.set(inc.employee_id, inc);
        }

        // Get company info
        const { data: company } = await supabase
          .from("c3_companies")
          .select("company_name, registration_number")
          .eq("id", company_id)
          .single();

        const result = (employees || []).map((e: any) => {
          const inc = incomeMap.get(e.id);
          return {
            id: e.id,
            social_security_number: e.social_security_number,
            first_name: e.first_name,
            last_name: e.last_name,
            middle_name: e.middle_name,
            gender: e.gender,
            date_of_birth: e.date_of_birth,
            marital_status: e.marital_status,
            department: e.department,
            pay_period: e.pay_period,
            hire_date: e.hire_date,
            termination_date: e.termination_date,
            is_director: e.is_director || false,
            is_levy_exempt: e.is_levy_exempt || false,
            address_line1: e.address_line1,
            address_line2: e.address_line2,
            city: e.city,
            postal_code: e.postal_code,
            country: e.country,
            email: e.email,
            mobile: e.mobile,
            phone: e.phone,
            salary: inc?.salary || 0,
            wages: inc?.wages || 0,
          };
        });

        return jsonResponse({
          status: "success",
          data: { employees: result, company: company || {} },
        });
      }

      // ─── 12. GET EMPLOYEE DETAILS ────────────────────────
      case "get_employee_details": {
        const { company_id, employee_id } = params;
        if (!company_id || !employee_id) {
          return jsonResponse({ status: "error", error: "company_id and employee_id required" }, 400);
        }

        const { data: employee, error } = await supabase
          .from("c3_employees")
          .select("*")
          .eq("id", employee_id)
          .eq("company_id", company_id)
          .single();

        if (error) return jsonResponse({ status: "error", error: error.message }, 500);

        const { data: income } = await supabase
          .from("c3_employee_incomes")
          .select("*")
          .eq("employee_id", employee_id)
          .single();

        return jsonResponse({
          status: "success",
          data: { employee: { ...employee, salary: income?.salary || 0, wages: income?.wages || 0 } },
        });
      }

      // ─── 13. UPDATE EMPLOYEE ─────────────────────────────
      case "update_employee": {
        const { company_id, employee_id, employee_data } = params;
        if (!company_id || !employee_id) {
          return jsonResponse({ status: "error", error: "company_id and employee_id required" }, 400);
        }

        const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() };
        const fields = ["first_name", "last_name", "middle_name", "gender", "date_of_birth",
          "marital_status", "is_director", "address_line1", "address_line2", "city",
          "postal_code", "country", "email", "mobile", "phone", "pay_period",
          "is_levy_exempt", "department", "hire_date", "termination_date"];
        for (const f of fields) {
          if (employee_data[f] !== undefined) updatePayload[f] = employee_data[f];
        }

        const { error } = await supabase
          .from("c3_employees")
          .update(updatePayload)
          .eq("id", employee_id)
          .eq("company_id", company_id);

        if (error) return jsonResponse({ status: "error", error: error.message }, 500);

        // Update salary in incomes
        if (employee_data.salary !== undefined) {
          await supabase
            .from("c3_employee_incomes")
            .upsert({
              employee_id,
              salary: employee_data.salary,
              wages: employee_data.wages || 0,
            }, { onConflict: "employee_id" });
        }

        return jsonResponse({ status: "success", data: { message: "Employee updated" } });
      }

      // ─── 14. DELETE EMPLOYEE ─────────────────────────────
      case "delete_employee": {
        const { company_id, employee_id } = params;
        if (!company_id || !employee_id) {
          return jsonResponse({ status: "error", error: "company_id and employee_id required" }, 400);
        }

        const { error } = await supabase
          .from("c3_employees")
          .update({ is_deleted: true, updated_at: new Date().toISOString() })
          .eq("id", employee_id)
          .eq("company_id", company_id);

        if (error) return jsonResponse({ status: "error", error: error.message }, 500);

        return jsonResponse({ status: "success", data: { message: "Employee deleted" } });
      }

      // ─── 15. GET COMPANIES DROPDOWN ──────────────────────
      case "get_companies_dropdown": {
        const { data, error } = await supabase
          .from("c3_companies")
          .select("id, company_name, registration_number, parent_company_id")
          .eq("is_deleted", false)
          .order("company_name", { ascending: true });

        if (error) return jsonResponse({ status: "error", error: error.message }, 500);

        return jsonResponse({ status: "success", data: { companies: data || [] } });
      }

      default:
        return jsonResponse({ status: "error", error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    console.error("wiz-admin-api error:", err);
    return jsonResponse({ status: "error", error: err.message || "Internal error" }, 500);
  }
});
