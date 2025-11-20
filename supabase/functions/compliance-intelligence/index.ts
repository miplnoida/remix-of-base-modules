import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are the Compliance Intelligence Assistant for the Social Security Board of St. Kitts & Nevis.

Your purpose is to create, connect, and generate everything needed in the Compliance ecosystem automatically and intelligently.

You will ALWAYS use:
- The official contribution components: SSC, SSF, LVC, LVF, PEC, PEF
- The real employer liability format
- The Compliance Weekly Workplan template

CORE RESPONSIBILITIES:

1. AUTO-CREATE COMPLIANCE CASES (SUBCASES)
For each employer, detect issues automatically:
- Arrears in SSC, LVC, PEC
- Penalties in SSF, LVF, PEF
- C3 non-submissions
- C3 without payment
- Payment plan breaches
- Under-reporting risk

2. APPLY RISK RULES & RISK POLICY
Generate risk score → assign Low / Medium / High / Critical.
Always prioritize Critical and High.

3. RECOMMEND EMPLOYERS FOR AUDIT
Based on risk score + zone + history, suggest:
- Employers for "Surveys to Be Conducted"
- Areas for "Scouting Activities"
- Employers "To Be Submitted for Legal Action"
- Employers for "C3 Without Payment Follow-Up"
- Employers with arrears to follow up
Always list highest risk first.

4. GENERATE WEEKLY WORKPLAN
Use the exact structure:
- Surveys to Be Conducted
- Scouting Activities Planned
- Employers to Be Submitted for Legal Action
- C3s Without Payment
- LMS Courses to Be Completed
- Arrears to Be Addressed
- Other Activities
- General Comments / Notes

Fill with realistic, short, professional content sorted by risk.

OUTPUT FORMAT:
Return a JSON object with:
{
  "subcases": [array of detected/created subcases],
  "riskSummary": [risk scoring summary],
  "weeklyPlan": {
    "surveys": [array],
    "scouting": [array],
    "legalSubmissions": [array],
    "c3FollowUp": [array],
    "lmsCourses": [array],
    "arrears": [array],
    "otherActivities": [array],
    "generalComments": "string"
  },
  "visitSchedule": [array of planned visits],
  "legalReferrals": [array of legal recommendations]
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      inspectorName, 
      inspectorZone, 
      weekStartDate, 
      weekEndDate,
      employers,
      riskScores,
      arrearsData,
      c3Data,
      scoutingHotspots,
      lmsCourses,
      existingSubcases
    } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Construct the user prompt with all provided data
    const userPrompt = `Generate a comprehensive Compliance Weekly Workplan and analysis for:

Inspector: ${inspectorName}
Zone: ${inspectorZone}
Week Period: ${weekStartDate} to ${weekEndDate}

EMPLOYER DATA:
${JSON.stringify(employers, null, 2)}

RISK SCORES:
${JSON.stringify(riskScores, null, 2)}

ARREARS DATA:
${JSON.stringify(arrearsData, null, 2)}

C3 SUBMISSION DATA:
${JSON.stringify(c3Data, null, 2)}

SCOUTING HOTSPOTS:
${JSON.stringify(scoutingHotspots, null, 2)}

LMS COURSES:
${JSON.stringify(lmsCourses, null, 2)}

EXISTING SUBCASES:
${JSON.stringify(existingSubcases, null, 2)}

Generate:
1. Subcases for detected compliance issues
2. Risk-based employer prioritization
3. Complete weekly workplan following the template structure
4. Visit schedule with check-in/check-out planning
5. Legal referral recommendations

Return structured JSON as specified in your system prompt.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your Lovable AI workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices[0]?.message?.content;

    if (!content) {
      throw new Error("No content received from AI");
    }

    // Parse the AI response (expecting JSON)
    let parsedResponse;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      parsedResponse = JSON.parse(jsonString);
    } catch (e) {
      console.error("Failed to parse AI response as JSON:", content);
      parsedResponse = {
        rawResponse: content,
        error: "AI response was not in expected JSON format"
      };
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: parsedResponse,
        metadata: {
          inspector: inspectorName,
          zone: inspectorZone,
          weekPeriod: `${weekStartDate} to ${weekEndDate}`,
          generatedAt: new Date().toISOString()
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Compliance intelligence error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        success: false
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
