import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const syncUrl = Deno.env.get('C3_WIZARD_SYNC_URL');
    const syncApiKey = Deno.env.get('C3_CONFIG_SYNC_API_KEY');

    if (!syncUrl) {
      return new Response(
        JSON.stringify({ status: 'error', error: 'C3_WIZARD_SYNC_URL is not configured. Please contact the administrator.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!syncApiKey) {
      return new Response(
        JSON.stringify({ status: 'error', error: 'C3_CONFIG_SYNC_API_KEY is not configured. Please contact the administrator.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload = await req.json();

    // Log payload summary for debugging
    console.log('Sync Publish - Payload summary:', {
      sync_version: payload.sync_version,
      config_periods: payload.config_periods?.length ?? 0,
      levy_slabs: payload.levy_slabs?.length ?? 0,
      bonus_policies: payload.bonus_policies?.length ?? 0,
      bonus_exceptions: payload.bonus_exceptions?.length ?? 0,
      holiday_policies: payload.holiday_policies?.length ?? 0,
      holiday_exceptions: payload.holiday_exceptions?.length ?? 0,
      calculation_configs: payload.calculation_configs?.length ?? 0,
      income_codes: payload.income_codes?.length ?? 0,
      income_categories: payload.income_categories?.length ?? 0,
      self_emp_contrib_rates: payload.self_emp_contrib_rates?.length ?? 0,
      income_code_policies: payload.income_code_policies?.length ?? 0,
      income_code_exceptions: payload.income_code_exceptions?.length ?? 0,
    });

    // Forward the payload to C3-Wizard sync endpoint
    let response: Response;
    try {
      response = await fetch(syncUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-sync-api-key': syncApiKey,
        },
        body: JSON.stringify(payload),
      });
    } catch (fetchError) {
      console.error('Sync Publish - Network error connecting to C3-Wizard:', fetchError.message);
      return new Response(
        JSON.stringify({ 
          status: 'error', 
          error: `Cannot connect to C3-Wizard sync endpoint: ${fetchError.message}`,
          error_type: 'network_error'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Read response body
    let resultText: string;
    try {
      resultText = await response.text();
    } catch (readError) {
      console.error('Sync Publish - Failed to read response body:', readError.message);
      return new Response(
        JSON.stringify({ 
          status: 'error', 
          error: `C3-Wizard returned status ${response.status} but response body could not be read`,
          error_type: 'response_read_error',
          wizard_status: response.status,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try to parse as JSON
    let result: any;
    try {
      result = JSON.parse(resultText);
    } catch {
      console.error('Sync Publish - Non-JSON response from C3-Wizard:', resultText.substring(0, 500));
      return new Response(
        JSON.stringify({ 
          status: 'error', 
          error: `C3-Wizard returned non-JSON response (HTTP ${response.status}). The Wizard endpoint may need to be updated to handle Sync Protocol v4.0.`,
          error_type: 'invalid_response',
          wizard_status: response.status,
          wizard_response_preview: resultText.substring(0, 200),
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If the Wizard returned a non-2xx, wrap the error details
    if (!response.ok) {
      console.error('Sync Publish - C3-Wizard returned error:', response.status, JSON.stringify(result));
      return new Response(
        JSON.stringify({ 
          status: 'error', 
          error: result?.error || result?.message || `C3-Wizard sync endpoint returned HTTP ${response.status}`,
          error_type: 'wizard_error',
          wizard_status: response.status,
          wizard_response: result,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Sync Publish - Success:', JSON.stringify(result).substring(0, 300));

    // Always return 200 with the actual result
    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('C3 Config Sync Publish Error:', error);
    return new Response(
      JSON.stringify({ 
        status: 'error', 
        error: error.message || 'Unknown error in sync publish function',
        error_type: 'internal_error'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
