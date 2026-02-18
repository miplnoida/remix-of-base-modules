import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json();
    const { knowledge_entry_id, module, test_types, triggered_by } = body;

    // Get knowledge entry
    let knowledgeEntry: any = null;
    if (knowledge_entry_id) {
      const { data } = await supabase
        .from('qa_knowledge_entries')
        .select('*')
        .eq('id', knowledge_entry_id)
        .single();
      knowledgeEntry = data;
    }

    // Get pipeline settings for model
    const { data: settings } = await supabase
      .from('qa_pipeline_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['ai_model']);
    
    const model = settings?.find(s => s.setting_key === 'ai_model')?.setting_value || 'google/gemini-3-flash-preview';

    const systemPrompt = `You are a QA test case generator for an enterprise Social Security Benefits Management System built on React/TypeScript with Supabase backend. 
Generate comprehensive, structured test cases as JSON. Each test case must cover real-world scenarios with specific payloads, expected HTTP status codes, and assertions.
Always return valid JSON only. No markdown, no explanation outside of the JSON.`;

    const userPrompt = `Generate test cases for the following business rule:

Module: ${knowledgeEntry?.module || module}
Rule Type: ${knowledgeEntry?.rule_type || 'validation'}
Title: ${knowledgeEntry?.title || 'General module test'}
Expected Behavior: ${knowledgeEntry?.expected_behavior || 'Validate module correctness'}
Rule Definition: ${JSON.stringify(knowledgeEntry?.rule_definition || {})}
Test Types Required: ${(test_types || ['positive', 'negative', 'boundary']).join(', ')}
Screen Path: ${knowledgeEntry?.screen_path || 'N/A'}
DB Table: ${knowledgeEntry?.db_table || 'N/A'}

Generate 3-6 test cases. Return ONLY this JSON structure:
{
  "test_cases": [
    {
      "title": "string",
      "description": "string",
      "test_type": "positive|negative|boundary|workflow|rbac|integrity",
      "priority": "critical|high|medium|low",
      "is_mandatory": boolean,
      "test_config": {
        "method": "GET|POST|PUT|PATCH|DELETE|SUPABASE_QUERY",
        "endpoint": "string (supabase table or rpc name)",
        "payload": {},
        "expected_status": "success|error|rls_denied",
        "assertions": ["array of string assertions to validate"]
      },
      "expected_result": {
        "status": "passed|failed",
        "description": "string",
        "validations": ["array of specific validations"]
      },
      "tags": ["array of tags"]
    }
  ]
}`;

    if (!LOVABLE_API_KEY) {
      // Fallback: generate basic test cases without AI
      const fallbackCases = generateFallbackTestCases(knowledgeEntry, module, test_types || ['positive', 'negative']);
      await saveToCases(supabase, fallbackCases, knowledge_entry_id, module, triggered_by, 'fallback', null);
      return new Response(JSON.stringify({ success: true, generated: fallbackCases.length, source: 'fallback' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('[qa-ai-generator] AI gateway error:', aiResponse.status, errText);
      const fallbackCases = generateFallbackTestCases(knowledgeEntry, module, test_types || ['positive', 'negative']);
      await saveToCases(supabase, fallbackCases, knowledge_entry_id, module, triggered_by, 'fallback', null);
      return new Response(JSON.stringify({ success: true, generated: fallbackCases.length, source: 'fallback', error: errText }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content || '{}';

    let parsed: any = {};
    try {
      // Strip markdown code blocks if present
      const cleaned = rawContent.replace(/```json\n?|\n?```/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error('[qa-ai-generator] Failed to parse AI JSON:', e);
      parsed = { test_cases: [] };
    }

    const testCases = parsed.test_cases || [];
    await saveToCases(supabase, testCases, knowledge_entry_id, module || knowledgeEntry?.module, triggered_by, 'ai', model);

    // Log the generation
    await supabase.from('qa_ai_generation_log').insert({
      module: module || knowledgeEntry?.module,
      knowledge_entry_id: knowledge_entry_id || null,
      prompt_used: userPrompt,
      model_used: model,
      generated_count: testCases.length,
      accepted_count: testCases.length,
      rejected_count: 0,
      raw_response: aiData,
      triggered_by: triggered_by || null,
    });

    return new Response(JSON.stringify({ success: true, generated: testCases.length, source: 'ai', model }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('[qa-ai-generator] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function saveToCases(supabase: any, testCases: any[], knowledge_entry_id: string | null, module: string, triggered_by: string | null, source: string, model: string | null) {
  if (!testCases.length) return;
  const rows = testCases.map((tc: any) => ({
    knowledge_entry_id: knowledge_entry_id || null,
    title: tc.title || 'Generated Test Case',
    description: tc.description || '',
    test_type: tc.test_type || 'positive',
    module: module || 'General',
    priority: tc.priority || 'medium',
    status: 'active',
    test_config: tc.test_config || {},
    expected_result: tc.expected_result || {},
    generation_source: source as any,
    generation_prompt: tc.prompt || null,
    is_mandatory: tc.is_mandatory || false,
    tags: tc.tags || [],
    created_by: triggered_by || null,
  }));
  await supabase.from('qa_test_cases').insert(rows);
}

function generateFallbackTestCases(entry: any, module: string, types: string[]) {
  const cases = [];
  const mod = entry?.module || module || 'General';
  
  if (types.includes('positive')) {
    cases.push({
      title: `[${mod}] Valid data submission - positive scenario`,
      description: `Verify that valid data for ${entry?.title || mod} is accepted successfully.`,
      test_type: 'positive',
      priority: entry?.priority || 'medium',
      is_mandatory: entry?.priority === 'critical',
      test_config: { method: 'SUPABASE_QUERY', endpoint: entry?.db_table || 'unknown', payload: {}, expected_status: 'success', assertions: ['Record created successfully', 'No validation errors returned'] },
      expected_result: { status: 'passed', description: 'Valid data accepted', validations: ['HTTP 200/201', 'No error field in response'] },
      tags: [mod.toLowerCase(), 'positive', 'smoke'],
    });
  }
  if (types.includes('negative')) {
    cases.push({
      title: `[${mod}] Invalid data rejection - negative scenario`,
      description: `Verify that invalid or missing required data for ${entry?.title || mod} is rejected with proper error.`,
      test_type: 'negative',
      priority: entry?.priority || 'medium',
      is_mandatory: false,
      test_config: { method: 'SUPABASE_QUERY', endpoint: entry?.db_table || 'unknown', payload: {}, expected_status: 'error', assertions: ['Validation error returned', 'Record not created'] },
      expected_result: { status: 'passed', description: 'Invalid data rejected', validations: ['Error message present', 'DB record not inserted'] },
      tags: [mod.toLowerCase(), 'negative', 'validation'],
    });
  }
  if (types.includes('boundary')) {
    cases.push({
      title: `[${mod}] Boundary condition test`,
      description: `Test boundary values for ${entry?.title || mod}.`,
      test_type: 'boundary',
      priority: 'low',
      is_mandatory: false,
      test_config: { method: 'SUPABASE_QUERY', endpoint: entry?.db_table || 'unknown', payload: {}, expected_status: 'error', assertions: ['Boundary value handled correctly'] },
      expected_result: { status: 'passed', description: 'Boundary handled', validations: ['No runtime exception', 'Appropriate response returned'] },
      tags: [mod.toLowerCase(), 'boundary'],
    });
  }
  return cases;
}
