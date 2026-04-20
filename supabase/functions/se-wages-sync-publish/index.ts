import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getWizConfig } from "../_shared/wizConfig.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Resolve from c3_site_settings strictly (DB is source of truth).
    const { baseUrl, syncApiKey } = await getWizConfig();
    const seWagesSyncUrl = baseUrl ? `${baseUrl}/sync-se-wages` : null;
    const resolvedKey = syncApiKey;

    if (!seWagesSyncUrl) {
      return new Response(
        JSON.stringify({ status: 'error', error: 'C3_WIZARD_BASE_URL is not configured in c3_site_settings. Please contact the administrator.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!resolvedKey) {
      return new Response(
        JSON.stringify({ status: 'error', error: 'OUTBOUND_SYNC_API_KEY is not configured in c3_site_settings. Please contact the administrator.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload = await req.json();

    console.log('SE Wages Sync Publish - Payload summary:', {
      sync_version: payload.sync_version,
      ssn: payload.ssn,
      self_ref_no: payload.self_ref_no,
      wages_count: payload.wages?.length ?? 0,
    });

    let response: Response;
    try {
      response = await fetch(seWagesSyncUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-sync-api-key': resolvedKey,
        },
        body: JSON.stringify(payload),
      });
    } catch (fetchError) {
      console.error('SE Wages Sync - Network error:', fetchError.message);
      return new Response(
        JSON.stringify({ 
          status: 'error', 
          error: `Cannot connect to C3-Wizard SE wages sync endpoint: ${fetchError.message}`,
          error_type: 'network_error'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let resultText: string;
    try {
      resultText = await response.text();
    } catch (readError) {
      console.error('SE Wages Sync - Failed to read response:', readError.message);
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

    let result: any;
    try {
      result = JSON.parse(resultText);
    } catch {
      console.error('SE Wages Sync - Non-JSON response:', resultText.substring(0, 500));
      return new Response(
        JSON.stringify({ 
          status: 'error', 
          error: `C3-Wizard returned non-JSON response (HTTP ${response.status}).`,
          error_type: 'invalid_response',
          wizard_status: response.status,
          wizard_response_preview: resultText.substring(0, 200),
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!response.ok) {
      console.error('SE Wages Sync - Wizard error:', response.status, JSON.stringify(result));
      return new Response(
        JSON.stringify({ 
          status: 'error', 
          error: result?.error || result?.message || `C3-Wizard returned HTTP ${response.status}`,
          error_type: 'wizard_error',
          wizard_status: response.status,
          wizard_response: result,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('SE Wages Sync - Success:', JSON.stringify(result).substring(0, 300));

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('SE Wages Sync Publish Error:', error);
    return new Response(
      JSON.stringify({ 
        status: 'error', 
        error: error.message || 'Unknown error in SE wages sync publish function',
        error_type: 'internal_error'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
