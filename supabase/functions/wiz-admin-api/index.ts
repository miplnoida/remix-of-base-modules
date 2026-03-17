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

      // ═══════════════════════════════════════════════════════
      // REPORTS MODULE – 15 Actions
      // ═══════════════════════════════════════════════════════

      // ─── R1. EMPLOYER REPORT ─────────────────────────────
      case "get_employer_report": {
        const {
          search = "",
          sort_col = "registration_number",
          sort_dir = "asc",
          page_offset = 0,
          page_limit = 10,
        } = params;
        const validCols = ["registration_number", "registration_date", "contact_person", "company_name", "email"];
        if (!validCols.includes(sort_col)) {
          return jsonResponse({ status: "error", error: `Invalid sort_col` }, 400);
        }
        const limit = Math.min(page_limit, 100);
        let query = supabase
          .from("c3_companies")
          .select("id, registration_number, registration_date, contact_person, company_name, mobile, email, created_at", { count: "exact" })
          .eq("is_deleted", false);

        if (search) {
          query = query.or(`company_name.ilike.%${search}%,registration_number.ilike.%${search}%`);
        }
        const { data, error, count } = await query
          .order(sort_col, { ascending: sort_dir === "asc" })
          .range(page_offset, page_offset + limit - 1);

        if (error) return jsonResponse({ status: "error", error: error.message }, 500);

        const employers = (data || []).map((c: any) => ({
          id: c.id,
          registration_number: c.registration_number,
          registration_date: c.registration_date || c.created_at,
          contact_person: c.contact_person,
          company_name: c.company_name,
          mobile: c.mobile,
          email: c.email,
        }));

        return jsonResponse({
          status: "success",
          data: { employers },
          total_records: count || 0,
          page_offset,
          page_limit: limit,
        });
      }

      // ─── R2. EMPLOYER REPORT DROPDOWN ────────────────────
      case "get_employer_report_dropdown": {
        const { data, error } = await supabase
          .from("c3_companies")
          .select("id, company_name, registration_number")
          .eq("is_deleted", false)
          .order("company_name", { ascending: true });

        if (error) return jsonResponse({ status: "error", error: error.message }, 500);
        return jsonResponse({ status: "success", data: { companies: data || [] } });
      }

      // ─── R3. EXPORT EMPLOYER REPORT ──────────────────────
      case "export_employer_report": {
        const { search = "" } = params;
        let query = supabase
          .from("c3_companies")
          .select("id, registration_number, registration_date, contact_person, company_name, mobile, email, created_at")
          .eq("is_deleted", false);

        if (search) {
          query = query.or(`company_name.ilike.%${search}%,registration_number.ilike.%${search}%`);
        }
        const { data, error } = await query.order("registration_number", { ascending: true });
        if (error) return jsonResponse({ status: "error", error: error.message }, 500);

        const employers = (data || []).map((c: any) => ({
          id: c.id,
          registration_number: c.registration_number,
          registration_date: c.registration_date || c.created_at,
          contact_person: c.contact_person,
          company_name: c.company_name,
          mobile: c.mobile,
          email: c.email,
        }));

        return jsonResponse({ status: "success", data: { employers } });
      }

      // ─── R4. SELF EMPLOYED REPORT ────────────────────────
      case "get_self_employed_report": {
        const {
          search = "",
          sort_col = "social_security_number",
          sort_dir = "asc",
          page_offset = 0,
          page_limit = 10,
        } = params;
        const validCols = ["social_security_number", "created_at", "first_name", "email"];
        const sortCol = validCols.includes(sort_col) ? sort_col : "social_security_number";
        const limit = Math.min(page_limit, 100);

        let query = supabase
          .from("c3_self_employed")
          .select("id, social_security_number, created_at, first_name, last_name, email, mobile", { count: "exact" })
          .eq("is_deleted", false);

        if (search) {
          query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,social_security_number.ilike.%${search}%`);
        }

        const { data, error, count } = await query
          .order(sortCol, { ascending: sort_dir === "asc" })
          .range(page_offset, page_offset + limit - 1);

        if (error) return jsonResponse({ status: "error", error: error.message }, 500);

        const self_employed = (data || []).map((s: any) => ({
          id: s.id,
          social_security_number: s.social_security_number,
          created_at: s.created_at,
          name: `${s.first_name || ""} ${s.last_name || ""}`.trim(),
          first_name: s.first_name,
          last_name: s.last_name,
          email: s.email,
          mobile: s.mobile,
        }));

        return jsonResponse({
          status: "success",
          data: { self_employed },
          total_records: count || 0,
          page_offset,
          page_limit: limit,
        });
      }

      // ─── R5. SELF EMPLOYED REPORT DROPDOWN ───────────────
      case "get_self_employed_report_dropdown": {
        const { data, error } = await supabase
          .from("c3_self_employed")
          .select("id, first_name, social_security_number")
          .eq("is_deleted", false)
          .order("first_name", { ascending: true });

        if (error) return jsonResponse({ status: "error", error: error.message }, 500);
        return jsonResponse({ status: "success", data: { self_employed: data || [] } });
      }

      // ─── R6. EXPORT SELF EMPLOYED REPORT ─────────────────
      case "export_self_employed_report": {
        const { search = "" } = params;
        let query = supabase
          .from("c3_self_employed")
          .select("id, social_security_number, created_at, first_name, last_name, email, mobile")
          .eq("is_deleted", false);

        if (search) {
          query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,social_security_number.ilike.%${search}%`);
        }
        const { data, error } = await query.order("social_security_number", { ascending: true });
        if (error) return jsonResponse({ status: "error", error: error.message }, 500);

        const self_employed = (data || []).map((s: any) => ({
          id: s.id,
          social_security_number: s.social_security_number,
          created_at: s.created_at,
          name: `${s.first_name || ""} ${s.last_name || ""}`.trim(),
          first_name: s.first_name,
          last_name: s.last_name,
          email: s.email,
          mobile: s.mobile,
        }));

        return jsonResponse({ status: "success", data: { self_employed } });
      }

      // ─── R7. PAYMENT REPORT ──────────────────────────────
      case "get_payment_report": {
        const {
          payment_status = "",
          from_date = "",
          to_date = "",
          company_id = null,
          user_id = null,
          types = "Company",
          page_offset = 0,
          page_limit = 10,
        } = params;
        const limit = Math.min(page_limit, 100);

        // Determine source table based on types
        const isCompany = types === "Company" || types === "SSB";
        const isSelfEmployed = types === "SelfEmployee" || types === "SSB";

        let allRecords: any[] = [];

        if (isCompany) {
          let q = supabase
            .from("c3_contribution_headers")
            .select("*, c3_companies!inner(registration_number, company_name)", { count: "exact" });

          if (company_id) q = q.eq("company_id", company_id);
          if (user_id) q = q.eq("created_by", user_id);

          const { data, error } = await q.order("created_at", { ascending: false });
          if (error) return jsonResponse({ status: "error", error: error.message }, 500);

          const mapped = (data || []).map((h: any) => ({
            header_id: h.id,
            user_id: h.created_by,
            reg_no: h.c3_companies?.registration_number || "",
            period_month: h.period_month || "",
            period_year: h.period_year || "",
            total_wages: h.total_wages || 0,
            total_ss_contributions: h.total_social_security || 0,
            total_levy: (h.total_levy_employee || 0) + (h.total_levy_employer || 0),
            total_fines_penalties: (h.total_ss_penalty || 0) + (h.total_pe_penalty || 0) + (h.total_levy_penalty || 0),
            total_severance: h.total_severance || 0,
            is_submitted: h.is_submitted || false,
            is_finalized: h.is_finalized || false,
            schedule_no: h.schedule_number || null,
            creation_date: h.created_at,
            pay_details: [],
            _type: "Company",
          }));
          allRecords = allRecords.concat(mapped);
        }

        if (isSelfEmployed) {
          let q = supabase
            .from("c3_se_contribution_headers")
            .select("*, c3_self_employed!inner(social_security_number, first_name, last_name)");

          if (company_id && types === "SelfEmployee") q = q.eq("self_employed_id", company_id);

          const { data, error } = await q.order("created_at", { ascending: false });
          if (error && error.code !== "PGRST116") {
            // Table may not exist yet - gracefully handle
            console.error("SE contribution query error:", error.message);
          }

          if (data) {
            const mapped = data.map((h: any) => ({
              header_id: h.id,
              user_id: h.created_by,
              reg_no: h.c3_self_employed?.social_security_number || "",
              period_month: h.period_month || "",
              period_year: h.period_year || "",
              total_wages: h.total_wages || 0,
              total_ss_contributions: h.total_contribution || 0,
              total_levy: 0,
              total_fines_penalties: h.total_ss_penalty || 0,
              total_severance: 0,
              is_submitted: h.is_submitted || false,
              is_finalized: h.is_finalized || false,
              schedule_no: h.schedule_number || null,
              creation_date: h.created_at,
              pay_details: [],
              _type: "SelfEmployee",
            }));
            allRecords = allRecords.concat(mapped);
          }
        }

        // Filter by payment status if provided - need to join payments
        if (payment_status) {
          // Get payment records and filter
          const headerIds = allRecords.map((r: any) => r.header_id);
          if (headerIds.length > 0) {
            const { data: payments } = await supabase
              .from("c3_payments")
              .select("*")
              .in("contribution_header_id", headerIds);

            const paymentMap = new Map();
            (payments || []).forEach((p: any) => {
              if (!paymentMap.has(p.contribution_header_id)) {
                paymentMap.set(p.contribution_header_id, []);
              }
              paymentMap.get(p.contribution_header_id).push({
                transaction_id: p.transaction_id || p.request_id,
                transaction_date: p.transaction_date || p.created_at,
                transaction_status: p.payment_status || "UNKNOWN",
                payment_amount: p.payment_amount || 0,
              });
            });

            allRecords = allRecords.map((r: any) => ({
              ...r,
              pay_details: paymentMap.get(r.header_id) || [],
            }));

            if (payment_status) {
              allRecords = allRecords.filter((r: any) =>
                r.pay_details.some((p: any) => p.transaction_status === payment_status) ||
                (payment_status === "" && true)
              );
            }
          }
        } else {
          // Still populate pay_details
          const headerIds = allRecords.map((r: any) => r.header_id);
          if (headerIds.length > 0) {
            const { data: payments } = await supabase
              .from("c3_payments")
              .select("*")
              .in("contribution_header_id", headerIds);

            const paymentMap = new Map();
            (payments || []).forEach((p: any) => {
              if (!paymentMap.has(p.contribution_header_id)) {
                paymentMap.set(p.contribution_header_id, []);
              }
              paymentMap.get(p.contribution_header_id).push({
                transaction_id: p.transaction_id || p.request_id,
                transaction_date: p.transaction_date || p.created_at,
                transaction_status: p.payment_status || "UNKNOWN",
                payment_amount: p.payment_amount || 0,
              });
            });

            allRecords = allRecords.map((r: any) => ({
              ...r,
              pay_details: paymentMap.get(r.header_id) || [],
            }));
          }
        }

        // Date range filter
        if (from_date) {
          allRecords = allRecords.filter((r: any) => r.creation_date >= from_date);
        }
        if (to_date) {
          allRecords = allRecords.filter((r: any) => r.creation_date <= to_date);
        }

        const total = allRecords.length;
        const paged = allRecords.slice(page_offset, page_offset + limit);

        return jsonResponse({
          status: "success",
          data: {
            records: paged,
            total_records: total,
            page_offset,
            page_limit: limit,
          },
        });
      }

      // ─── R8. EXPORT PAYMENT REPORT ───────────────────────
      case "export_payment_report": {
        // Reuse payment report logic without pagination
        const {
          payment_status = "",
          types = "Company",
          company_id = null,
          user_id = null,
        } = params;

        const isCompany = types === "Company" || types === "SSB";
        const isSelfEmployed = types === "SelfEmployee" || types === "SSB";
        let allRecords: any[] = [];

        if (isCompany) {
          let q = supabase.from("c3_contribution_headers").select("*, c3_companies!inner(registration_number, company_name)");
          if (company_id) q = q.eq("company_id", company_id);
          if (user_id) q = q.eq("created_by", user_id);
          const { data } = await q.order("created_at", { ascending: false });
          allRecords = (data || []).map((h: any) => ({
            header_id: h.id, user_id: h.created_by,
            reg_no: h.c3_companies?.registration_number || "",
            period_month: h.period_month || "", period_year: h.period_year || "",
            total_wages: h.total_wages || 0,
            total_ss_contributions: h.total_social_security || 0,
            total_levy: (h.total_levy_employee || 0) + (h.total_levy_employer || 0),
            total_fines_penalties: (h.total_ss_penalty || 0) + (h.total_pe_penalty || 0) + (h.total_levy_penalty || 0),
            total_severance: h.total_severance || 0,
            is_submitted: h.is_submitted || false, schedule_no: h.schedule_number || null,
            creation_date: h.created_at, pay_details: [],
          }));
        }

        if (isSelfEmployed) {
          const { data } = await supabase.from("c3_se_contribution_headers")
            .select("*, c3_self_employed!inner(social_security_number)")
            .order("created_at", { ascending: false });
          if (data) {
            allRecords = allRecords.concat(data.map((h: any) => ({
              header_id: h.id, user_id: h.created_by,
              reg_no: h.c3_self_employed?.social_security_number || "",
              period_month: h.period_month || "", period_year: h.period_year || "",
              total_wages: h.total_wages || 0, total_ss_contributions: h.total_contribution || 0,
              total_levy: 0, total_fines_penalties: h.total_ss_penalty || 0, total_severance: 0,
              is_submitted: h.is_submitted || false, schedule_no: h.schedule_number || null,
              creation_date: h.created_at, pay_details: [],
            })));
          }
        }

        return jsonResponse({ status: "success", data: { records: allRecords } });
      }

      // ─── R9. RECONCILIATION REPORT ───────────────────────
      case "get_reconciliation_report": {
        const {
          status: recStatus = null,
          card_holder_name = null,
          from_date = null,
          to_date = null,
          page_offset = 0,
          page_limit = 10,
        } = params;
        const limit = Math.min(page_limit, 100);

        let query = supabase
          .from("c3_reconciliation_records")
          .select("id, request_id, transaction_date, payment_amount, is_reconciled, reconciled_by, reconciled_at, notes, card_holder_name", { count: "exact" });

        if (recStatus === "Reconciled") query = query.eq("is_reconciled", true);
        else if (recStatus === "Pending") query = query.or("is_reconciled.is.null,is_reconciled.eq.false");

        if (card_holder_name) query = query.ilike("card_holder_name", `%${card_holder_name}%`);
        if (from_date) query = query.gte("transaction_date", from_date);
        if (to_date) query = query.lte("transaction_date", to_date);

        const { data, error, count } = await query
          .order("transaction_date", { ascending: false })
          .range(page_offset, page_offset + limit - 1);

        if (error) return jsonResponse({ status: "error", error: error.message }, 500);

        // Get reconciled_by user names
        const userIds = [...new Set((data || []).filter((r: any) => r.reconciled_by).map((r: any) => r.reconciled_by))];
        let userMap: Record<string, string> = {};
        if (userIds.length > 0) {
          const { data: users } = await supabase.from("c3_users").select("id, first_name, last_name").in("id", userIds);
          (users || []).forEach((u: any) => { userMap[u.id] = `${u.first_name || ""} ${u.last_name || ""}`.trim(); });
        }

        const records = (data || []).map((r: any) => ({
          id: r.id,
          payment_transaction_id: r.request_id,
          transaction_date: r.transaction_date,
          payment_amount: r.payment_amount,
          payment_status: r.is_reconciled ? "Reconciled" : "Not Reconciled",
          reconciled_by_name: userMap[r.reconciled_by] || "",
          reconciled_by_date: r.reconciled_at,
          notes: r.notes,
        }));

        return jsonResponse({
          status: "success",
          data: { records, total_records: count || 0, page_offset, page_limit: limit },
        });
      }

      // ─── R10. RECONCILIATION CARD HOLDERS ────────────────
      case "get_reconciliation_card_holders": {
        const { data, error } = await supabase
          .from("c3_reconciliation_records")
          .select("card_holder_name")
          .not("card_holder_name", "is", null);

        if (error) return jsonResponse({ status: "error", error: error.message }, 500);

        const unique = [...new Set((data || []).map((r: any) => r.card_holder_name).filter(Boolean))];
        return jsonResponse({
          status: "success",
          data: { card_holders: unique.map((n: string) => ({ card_holder_name: n })) },
        });
      }

      // ─── R11. EXPORT RECONCILIATION REPORT ───────────────
      case "export_reconciliation_report": {
        const { status: recStatus = null, card_holder_name = null } = params;

        let query = supabase
          .from("c3_reconciliation_records")
          .select("id, request_id, transaction_date, payment_amount, is_reconciled, reconciled_by, reconciled_at, notes, card_holder_name");

        if (recStatus === "Reconciled") query = query.eq("is_reconciled", true);
        else if (recStatus === "Pending") query = query.or("is_reconciled.is.null,is_reconciled.eq.false");
        if (card_holder_name) query = query.ilike("card_holder_name", `%${card_holder_name}%`);

        const { data, error } = await query.order("transaction_date", { ascending: false });
        if (error) return jsonResponse({ status: "error", error: error.message }, 500);

        const userIds = [...new Set((data || []).filter((r: any) => r.reconciled_by).map((r: any) => r.reconciled_by))];
        let userMap: Record<string, string> = {};
        if (userIds.length > 0) {
          const { data: users } = await supabase.from("c3_users").select("id, first_name, last_name").in("id", userIds);
          (users || []).forEach((u: any) => { userMap[u.id] = `${u.first_name || ""} ${u.last_name || ""}`.trim(); });
        }

        const records = (data || []).map((r: any) => ({
          id: r.id,
          payment_transaction_id: r.request_id,
          transaction_date: r.transaction_date,
          payment_amount: r.payment_amount,
          payment_status: r.is_reconciled ? "Reconciled" : "Not Reconciled",
          reconciled_by_name: userMap[r.reconciled_by] || "",
          reconciled_by_date: r.reconciled_at,
          notes: r.notes,
        }));

        return jsonResponse({ status: "success", data: { records } });
      }

      // ─── R12. COMPANY USERS REPORT ───────────────────────
      case "get_company_users_report": {
        const {
          search = "",
          company_id = null,
          role_id = null,
          sort_column = "first_name",
          sort_direction = "asc",
          page = 1,
          page_size = 50,
        } = params;

        const validCols = ["first_name", "last_name", "username", "email", "created_at", "last_login_at"];
        const sortCol = validCols.includes(sort_column) ? sort_column : "first_name";
        const size = Math.min(page_size, 100);
        const offset = (page - 1) * size;

        let query = supabase
          .from("c3_users")
          .select("id, first_name, last_name, middle_name, username, email, role_id, company_id, is_locked, last_login_at, created_at, is_deleted, c3_roles!inner(role_name, role_category), c3_companies(company_name, registration_number)", { count: "exact" })
          .eq("is_deleted", false)
          .eq("c3_roles.role_category", "Company");

        if (company_id) query = query.eq("company_id", company_id);
        if (role_id) query = query.eq("role_id", role_id);
        if (search) {
          query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,username.ilike.%${search}%,email.ilike.%${search}%`);
        }

        const { data, error, count } = await query
          .order(sortCol, { ascending: sort_direction === "asc" })
          .range(offset, offset + size - 1);

        if (error) return jsonResponse({ status: "error", error: error.message }, 500);

        const users = (data || []).map((u: any) => ({
          user_id: u.id,
          first_name: u.first_name,
          last_name: u.last_name,
          middle_name: u.middle_name,
          username: u.username,
          email: u.email,
          role_id: u.role_id,
          role_name: u.c3_roles?.role_name || "",
          company_id: u.company_id,
          company_name: u.c3_companies?.company_name || "",
          registration_number: u.c3_companies?.registration_number || "",
          is_locked: u.is_locked || false,
          last_login_at: u.last_login_at,
          created_at: u.created_at,
        }));

        const totalRecords = count || 0;
        return jsonResponse({
          status: "success",
          data: users,
          pagination: { page, page_size: size, total_records: totalRecords, total_pages: Math.ceil(totalRecords / size) },
        });
      }

      // ─── R13. SELF EMPLOYED USERS REPORT ─────────────────
      case "get_self_employed_users_report": {
        const {
          search = "",
          role_id = null,
          sort_column = "first_name",
          sort_direction = "asc",
          page = 1,
          page_size = 50,
        } = params;

        const validCols = ["first_name", "last_name", "username", "email", "created_at", "last_login_at"];
        const sortCol = validCols.includes(sort_column) ? sort_column : "first_name";
        const size = Math.min(page_size, 100);
        const offset = (page - 1) * size;

        let query = supabase
          .from("c3_users")
          .select("id, first_name, last_name, middle_name, username, email, role_id, self_employed_id, is_locked, last_login_at, created_at, is_deleted, c3_roles!inner(role_name, role_category), c3_self_employed(social_security_number)", { count: "exact" })
          .eq("is_deleted", false)
          .eq("c3_roles.role_category", "SelfEmployee");

        if (role_id) query = query.eq("role_id", role_id);
        if (search) {
          query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,username.ilike.%${search}%,email.ilike.%${search}%`);
        }

        const { data, error, count } = await query
          .order(sortCol, { ascending: sort_direction === "asc" })
          .range(offset, offset + size - 1);

        if (error) return jsonResponse({ status: "error", error: error.message }, 500);

        const users = (data || []).map((u: any) => ({
          user_id: u.id,
          first_name: u.first_name,
          last_name: u.last_name,
          middle_name: u.middle_name,
          username: u.username,
          email: u.email,
          role_id: u.role_id,
          role_name: u.c3_roles?.role_name || "",
          self_employed_id: u.self_employed_id,
          ssn: u.c3_self_employed?.social_security_number || "",
          is_locked: u.is_locked || false,
          last_login_at: u.last_login_at,
          created_at: u.created_at,
        }));

        const totalRecords = count || 0;
        return jsonResponse({
          status: "success",
          data: users,
          pagination: { page, page_size: size, total_records: totalRecords, total_pages: Math.ceil(totalRecords / size) },
        });
      }

      // ─── R14. USERS REPORT ROLES ─────────────────────────
      case "get_users_report_roles": {
        const { category = null } = params;

        let query = supabase
          .from("c3_roles")
          .select("id, role_name, role_code, role_category")
          .in("role_category", category ? [category] : ["Company", "SelfEmployee"])
          .order("role_name", { ascending: true });

        const { data, error } = await query;
        if (error) return jsonResponse({ status: "error", error: error.message }, 500);

        return jsonResponse({ status: "success", data: data || [] });
      }

      // ─── R15. EXPORT USERS REPORT ────────────────────────
      case "export_users_report": {
        const { category, search = "", company_id = null, role_id = null } = params;
        if (!category) return jsonResponse({ status: "error", error: "category is required" }, 400);

        if (category === "Company") {
          let query = supabase
            .from("c3_users")
            .select("id, first_name, last_name, username, email, role_id, company_id, is_locked, last_login_at, created_at, c3_roles!inner(role_name, role_category), c3_companies(company_name, registration_number)")
            .eq("is_deleted", false)
            .eq("c3_roles.role_category", "Company");

          if (company_id) query = query.eq("company_id", company_id);
          if (role_id) query = query.eq("role_id", role_id);
          if (search) query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,username.ilike.%${search}%,email.ilike.%${search}%`);

          const { data, error } = await query.order("first_name").limit(5000);
          if (error) return jsonResponse({ status: "error", error: error.message }, 500);

          return jsonResponse({
            status: "success",
            data: (data || []).map((u: any) => ({
              name: `${u.first_name || ""} ${u.last_name || ""}`.trim(),
              username: u.username, email: u.email, role: u.c3_roles?.role_name || "",
              company: u.c3_companies?.company_name || "", registration_number: u.c3_companies?.registration_number || "",
              last_login: u.last_login_at, created: u.created_at,
            })),
          });
        } else {
          let query = supabase
            .from("c3_users")
            .select("id, first_name, last_name, username, email, role_id, self_employed_id, is_locked, last_login_at, created_at, c3_roles!inner(role_name, role_category), c3_self_employed(social_security_number)")
            .eq("is_deleted", false)
            .eq("c3_roles.role_category", "SelfEmployee");

          if (role_id) query = query.eq("role_id", role_id);
          if (search) query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,username.ilike.%${search}%,email.ilike.%${search}%`);

          const { data, error } = await query.order("first_name").limit(5000);
          if (error) return jsonResponse({ status: "error", error: error.message }, 500);

          return jsonResponse({
            status: "success",
            data: (data || []).map((u: any) => ({
              name: `${u.first_name || ""} ${u.last_name || ""}`.trim(),
              username: u.username, email: u.email, role: u.c3_roles?.role_name || "",
              ssn: u.c3_self_employed?.social_security_number || "",
              last_login: u.last_login_at, created: u.created_at,
            })),
          });
        }
      }

      default:
        return jsonResponse({ status: "error", error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    console.error("wiz-admin-api error:", err);
    return jsonResponse({ status: "error", error: err.message || "Internal error" }, 500);
  }
});
