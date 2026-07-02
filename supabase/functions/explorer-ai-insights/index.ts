// Explorer AI Insights — Lovable AI Gateway
// deno-lint-ignore-file no-explicit-any
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { dataset_key, dataset_title, module, row_count, sample } = await req.json();
    if (!Array.isArray(sample)) throw new Error("sample required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const system = `You are an enterprise data analyst for the "${module}" module. Given a filtered dataset called "${dataset_title}", surface high-signal insights across these categories:
- sla_breach: overdue, at-risk, escalated items
- recovery: outstanding balances, low recovery %, missed installments
- workload: officer imbalance, single-officer overload
- duplicate: likely duplicate records (same party/date/amount)
- missing_document: rows missing required attachments
- trend: notable up/down trend across time
- outlier: unusually large or old items

Return STRICT JSON: {"insights":[{"category","severity":"low|medium|high","title","description","affected_count","suggested_action"}]}
Only include insights supported by the data. If nothing notable, return an empty array. Max 6 insights.`;

    const prompt = `Dataset: ${dataset_title} (${dataset_key})
Total rows in current view: ${row_count}
First ${sample.length} rows (JSON): ${JSON.stringify(sample).slice(0, 12000)}`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: system }, { role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });

    if (resp.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded, please retry shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (resp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!resp.ok) throw new Error(`AI gateway error ${resp.status}: ${await resp.text()}`);

    const j = await resp.json();
    const content = j.choices?.[0]?.message?.content || "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { parsed = { insights: [] }; }

    return new Response(JSON.stringify({ insights: parsed.insights || [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
