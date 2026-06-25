// Lovable AI–powered contract analyzer
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { contract_text, contract_type, contract_title } = await req.json();
    if (!contract_text) {
      return new Response(JSON.stringify({ error: "contract_text required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const system = `You are a senior legal counsel analyzing a contract for the Social Security Board.
Produce ONLY valid JSON matching the requested schema. Be concise and specific.
Identify missing clauses and high-risk terms.
This output is advisory only — a human lawyer must review it before relying on it.`;

    const user = `Contract title: ${contract_title ?? "(untitled)"}
Contract type: ${contract_type ?? "GENERIC"}

Analyze the following contract and return a JSON object with these keys:
summary (string), parties (array), contract_purpose (string), key_dates (array),
payment_terms (string), termination_clauses (string), renewal_clauses (string),
confidentiality_clauses (string), indemnity_liability (string), data_protection_risks (string),
governing_law (string), dispute_resolution (string), missing_clauses (array of strings),
high_risk_terms (array of strings), recommended_legal_comments (array of strings),
checklist_score (number 0-100), action_items (array of strings).

CONTRACT TEXT:
"""
${contract_text.slice(0, 18000)}
"""`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
        response_format: { type: "json_object" },
      }),
    });

    if (resp.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit. Try again shortly." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (resp.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Please top up." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!resp.ok) {
      const txt = await resp.text();
      return new Response(JSON.stringify({ error: `Gateway error ${resp.status}: ${txt}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await resp.json();
    let analysis: any = {};
    try {
      analysis = JSON.parse(json.choices?.[0]?.message?.content ?? "{}");
    } catch {
      analysis = { summary: json.choices?.[0]?.message?.content ?? "" };
    }

    return new Response(JSON.stringify({
      model: "google/gemini-3-flash-preview",
      provider: "lovable-ai-gateway",
      prompt_version: "v1",
      analysis,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err?.message ?? err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
