import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

interface ApiSetting {
  id: string
  setting_key: string
  setting_name: string
  base_url: string | null
  api_key: string | null
  header_name: string | null
  is_active: boolean | null
  linked_module: string | null
}

interface ProxyRequest {
  module: string
  endpoint: string
  method?: string
  payload?: unknown
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Parse request body
    const requestBody: ProxyRequest = await req.json()
    const { module: moduleName, endpoint, method = 'GET', payload } = requestBody
    
    if (!moduleName) {
      return new Response(
        JSON.stringify({ error: 'Module name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client with service role for reading API settings
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get API configuration for the module
    const { data: apiSetting, error: dbError } = await supabase
      .from('api_settings')
      .select('*')
      .eq('linked_module', moduleName)
      .eq('is_active', true)
      .single()

    if (dbError || !apiSetting) {
      console.error('Failed to fetch API config:', dbError)
      return new Response(
        JSON.stringify({ error: `API not configured for module: ${moduleName}` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const setting = apiSetting as ApiSetting

    if (!setting.base_url) {
      return new Response(
        JSON.stringify({ error: 'API Base URL is not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build the target URL (handle trailing slash in base_url)
    const baseUrl = setting.base_url.replace(/\/+$/, ''); // Remove trailing slashes
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const targetUrl = `${baseUrl}${cleanEndpoint}`;
    console.log(`Proxying ${method} request to: ${targetUrl}`)

    // Build headers for the external API
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (setting.header_name && setting.api_key) {
      headers[setting.header_name] = setting.api_key
    }

    // Forward the request to the external API
    const fetchOptions: RequestInit = {
      method,
      headers,
    }

    // Add body for non-GET requests
    if (method !== 'GET' && method !== 'HEAD' && payload) {
      fetchOptions.body = JSON.stringify(payload)
    }

    const externalResponse = await fetch(targetUrl, fetchOptions)
    const responseData = await externalResponse.text()
    
    // Try to parse as JSON, otherwise return as text
    let responseBody: string
    try {
      const jsonData = JSON.parse(responseData)
      responseBody = JSON.stringify(jsonData)
    } catch {
      responseBody = responseData
    }

    return new Response(responseBody, {
      status: externalResponse.status,
      headers: {
        ...corsHeaders,
        'Content-Type': externalResponse.headers.get('Content-Type') || 'application/json',
      },
    })
  } catch (error: unknown) {
    console.error('Proxy error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})