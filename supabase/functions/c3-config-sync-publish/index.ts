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
        JSON.stringify({ status: 'error', error: 'C3_WIZARD_SYNC_URL is not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!syncApiKey) {
      return new Response(
        JSON.stringify({ status: 'error', error: 'C3_CONFIG_SYNC_API_KEY is not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload = await req.json();

    // Forward the payload to C3-Wizard sync endpoint
    const response = await fetch(syncUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-sync-api-key': syncApiKey,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    return new Response(
      JSON.stringify(result),
      { 
        status: response.status, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('C3 Config Sync Publish Error:', error);
    return new Response(
      JSON.stringify({ status: 'error', error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
