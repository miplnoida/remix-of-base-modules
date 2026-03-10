import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { screenId, routeUrl } = await req.json();
    if (!screenId || !routeUrl) {
      return new Response(JSON.stringify({ error: "screenId and routeUrl required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI gateway not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get screen info
    const { data: screen } = await supabase
      .from("dev_info_screens")
      .select("*")
      .eq("id", screenId)
      .single();

    if (!screen) {
      return new Response(JSON.stringify({ error: "Screen not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are an enterprise application documentation expert analyzing a Social Security Board (SSB) application for St. Kitts & Nevis.

Given a screen's route, name, and module information, generate comprehensive technical documentation including:
1. A functional summary (2-3 sentences)
2. Business purpose (1-2 paragraphs)
3. Primary user roles who use this screen
4. Trigger context (when/why users access this screen)
5. Upstream and downstream screens
6. Database tables likely used (based on the module context)
7. Business rules and validation logic
8. Key fields with their types and validations
9. Available actions (Save, Submit, Search, etc.)
10. Dependencies (APIs, services, other modules)
11. Audit behavior

Return your analysis as a JSON object with these exact keys:
- functional_summary: string
- business_purpose: string
- primary_user_roles: string
- trigger_context: string
- upstream_screens: string
- downstream_screens: string
- tables: array of {table_name, table_type, purpose}
- logic: array of {logic_type, logic_title, logic_description}
- fields: array of {field_name, field_label, control_type, data_type, is_required, source_table, source_column, validation_rule}
- actions: array of {action_name, action_type, action_description, permission_required, tables_affected}
- dependencies: array of {dependency_type, dependency_name, dependency_details}
- audit: array of {audit_type, audit_description, is_enabled}

Context about the application:
- Enterprise Social Security Board portal
- Modules: Registration (IP, Employer, Self-Employed), C3 Management (contribution returns), Compliance & Enforcement, Benefits, Finance, Legal, Internal Audit, Medical, CRD (Card Management), Cashier, Notifications
- Database uses tables like: er_master (employers), ip_master (insured persons), ip_employer (employment links), ip_wages, bema_c3_submissions, ce_violations, etc.
- Role-based access control via app_modules and module_actions tables`;

    const userPrompt = `Analyze this screen:
- Route: ${screen.route_url}
- Screen Name: ${screen.screen_name}
- Module: ${screen.module_name || 'Unknown'}
- Submodule: ${screen.submodule_name || 'Unknown'}
- Screen Type: ${screen.screen_type || 'Unknown'}
- Menu Path: ${screen.menu_path || 'Unknown'}

Generate comprehensive developer documentation for this screen.`;

    // Call AI Gateway with tool calling for structured output
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "save_screen_documentation",
              description: "Save the analyzed screen documentation",
              parameters: {
                type: "object",
                properties: {
                  functional_summary: { type: "string" },
                  business_purpose: { type: "string" },
                  primary_user_roles: { type: "string" },
                  trigger_context: { type: "string" },
                  upstream_screens: { type: "string" },
                  downstream_screens: { type: "string" },
                  tables: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        table_name: { type: "string" },
                        table_type: { type: "string" },
                        purpose: { type: "string" },
                      },
                      required: ["table_name", "table_type", "purpose"],
                    },
                  },
                  logic: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        logic_type: { type: "string" },
                        logic_title: { type: "string" },
                        logic_description: { type: "string" },
                      },
                      required: ["logic_type", "logic_title", "logic_description"],
                    },
                  },
                  fields: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        field_name: { type: "string" },
                        field_label: { type: "string" },
                        control_type: { type: "string" },
                        data_type: { type: "string" },
                        is_required: { type: "boolean" },
                        source_table: { type: "string" },
                        source_column: { type: "string" },
                        validation_rule: { type: "string" },
                      },
                      required: ["field_name", "field_label"],
                    },
                  },
                  actions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        action_name: { type: "string" },
                        action_type: { type: "string" },
                        action_description: { type: "string" },
                        permission_required: { type: "string" },
                        tables_affected: { type: "string" },
                      },
                      required: ["action_name", "action_description"],
                    },
                  },
                  dependencies: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        dependency_type: { type: "string" },
                        dependency_name: { type: "string" },
                        dependency_details: { type: "string" },
                      },
                      required: ["dependency_type", "dependency_name"],
                    },
                  },
                  audit: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        audit_type: { type: "string" },
                        audit_description: { type: "string" },
                        is_enabled: { type: "boolean" },
                      },
                      required: ["audit_type", "audit_description"],
                    },
                  },
                },
                required: [
                  "functional_summary",
                  "business_purpose",
                  "primary_user_roles",
                  "trigger_context",
                  "tables",
                  "logic",
                  "actions",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "save_screen_documentation" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "AI did not return structured data" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const analysis = JSON.parse(toolCall.function.arguments);

    // Update screen record
    await supabase
      .from("dev_info_screens")
      .update({
        functional_summary: analysis.functional_summary,
        business_purpose: analysis.business_purpose,
        primary_user_roles: analysis.primary_user_roles,
        trigger_context: analysis.trigger_context,
        upstream_screens: analysis.upstream_screens || null,
        downstream_screens: analysis.downstream_screens || null,
        documentation_status: "auto_extracted",
        last_ai_analysis_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", screenId);

    // Clear and re-insert child records
    await Promise.all([
      supabase.from("dev_info_table_maps").delete().eq("screen_id", screenId),
      supabase.from("dev_info_logic").delete().eq("screen_id", screenId),
      supabase.from("dev_info_fields").delete().eq("screen_id", screenId),
      supabase.from("dev_info_actions").delete().eq("screen_id", screenId),
      supabase.from("dev_info_dependencies").delete().eq("screen_id", screenId),
      supabase.from("dev_info_audit").delete().eq("screen_id", screenId),
    ]);

    // Insert new child records
    const inserts = [];

    if (analysis.tables?.length > 0) {
      inserts.push(
        supabase.from("dev_info_table_maps").insert(
          analysis.tables.map((t: any) => ({ screen_id: screenId, ...t }))
        )
      );
    }
    if (analysis.logic?.length > 0) {
      inserts.push(
        supabase.from("dev_info_logic").insert(
          analysis.logic.map((l: any, i: number) => ({ screen_id: screenId, execution_order: i, ...l }))
        )
      );
    }
    if (analysis.fields?.length > 0) {
      inserts.push(
        supabase.from("dev_info_fields").insert(
          analysis.fields.map((f: any, i: number) => ({ screen_id: screenId, sort_order: i, ...f }))
        )
      );
    }
    if (analysis.actions?.length > 0) {
      inserts.push(
        supabase.from("dev_info_actions").insert(
          analysis.actions.map((a: any) => ({ screen_id: screenId, ...a }))
        )
      );
    }
    if (analysis.dependencies?.length > 0) {
      inserts.push(
        supabase.from("dev_info_dependencies").insert(
          analysis.dependencies.map((d: any) => ({ screen_id: screenId, ...d }))
        )
      );
    }
    if (analysis.audit?.length > 0) {
      inserts.push(
        supabase.from("dev_info_audit").insert(
          analysis.audit.map((a: any) => ({ screen_id: screenId, ...a }))
        )
      );
    }

    await Promise.all(inserts);

    return new Response(JSON.stringify({ success: true, screenId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-screen-devinfo error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
