import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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
  // Optional fields for enhanced logging
  related_entity_type?: string
  related_entity_id?: string
  correlation_id?: string
  session_id?: string
}

/** Log API call to api_logs table - fire and forget, never blocks main flow */
async function logApiCall(
  supabase: ReturnType<typeof createClient>,
  logData: {
    api_name: string
    endpoint_url: string
    http_method: string
    request_headers: Record<string, string>
    request_payload: unknown
    response_status: number | null
    response_body: unknown
    is_success: boolean
    error_message: string | null
    duration_ms: number
    module: string
    related_entity_type?: string
    related_entity_id?: string
    correlation_id?: string
    session_id?: string
    user_id?: string
  }
) {
  try {
    // Sanitize headers - remove sensitive keys
    const sanitizedHeaders = { ...logData.request_headers }
    delete sanitizedHeaders['Authorization']
    delete sanitizedHeaders['authorization']
    // Remove API key values from logged headers
    for (const key of Object.keys(sanitizedHeaders)) {
      if (key.toLowerCase().includes('key') || key.toLowerCase().includes('token') || key.toLowerCase().includes('secret')) {
        sanitizedHeaders[key] = '***REDACTED***'
      }
    }

    await supabase.from('api_logs').insert({
      api_name: logData.api_name,
      endpoint_url: logData.endpoint_url,
      http_method: logData.http_method,
      request_headers: sanitizedHeaders,
      request_payload: logData.request_payload as Record<string, unknown>,
      response_status: logData.response_status,
      response_body: typeof logData.response_body === 'object' ? logData.response_body : { raw: logData.response_body },
      is_success: logData.is_success,
      error_message: logData.error_message,
      duration_ms: logData.duration_ms,
      module: logData.module,
      related_entity_type: logData.related_entity_type || null,
      related_entity_id: logData.related_entity_id || null,
      correlation_id: logData.correlation_id || null,
      session_id: logData.session_id || null,
      user_id: logData.user_id || null,
    })
  } catch (err) {
    // Never let logging failure affect the main flow
    console.error('API log insert failed (non-blocking):', err)
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const startTime = Date.now()

  try {
    // Parse request body
    const requestBody: ProxyRequest = await req.json()
    const { 
      module: moduleName, 
      endpoint, 
      method = 'GET', 
      payload,
      related_entity_type,
      related_entity_id,
      correlation_id,
      session_id 
    } = requestBody
    
    if (!moduleName) {
      return new Response(
        JSON.stringify({ error: 'Module name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract user ID from auth header if available
    let userId: string | undefined
    const authHeader = req.headers.get('authorization')
    
    // Initialize Supabase client with service role for reading API settings
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Try to extract user ID from JWT
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.replace('Bearer ', '')
        const { data: { user } } = await supabase.auth.getUser(token)
        userId = user?.id
      } catch {
        // ignore auth errors for logging
      }
    }

    // Get API configuration for the module
    const { data: apiSetting, error: dbError } = await supabase
      .from('api_settings')
      .select('*')
      .eq('linked_module', moduleName)
      .eq('is_active', true)
      .single()

    if (dbError || !apiSetting) {
      console.error('Failed to fetch API config:', dbError)
      const duration = Date.now() - startTime
      // Log the failed config lookup
      logApiCall(supabase, {
        api_name: `proxy-${moduleName}`,
        endpoint_url: endpoint || '/',
        http_method: method,
        request_headers: {},
        request_payload: payload,
        response_status: 404,
        response_body: { error: `API not configured for module: ${moduleName}` },
        is_success: false,
        error_message: `API not configured for module: ${moduleName}`,
        duration_ms: duration,
        module: moduleName,
        related_entity_type,
        related_entity_id,
        correlation_id,
        session_id,
        user_id: userId,
      })
      return new Response(
        JSON.stringify({ error: `API not configured for module: ${moduleName}` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const setting = apiSetting as ApiSetting

    if (!setting.base_url) {
      const duration = Date.now() - startTime
      logApiCall(supabase, {
        api_name: setting.setting_name || `proxy-${moduleName}`,
        endpoint_url: endpoint || '/',
        http_method: method,
        request_headers: {},
        request_payload: payload,
        response_status: 400,
        response_body: { error: 'API Base URL is not configured' },
        is_success: false,
        error_message: 'API Base URL is not configured',
        duration_ms: duration,
        module: moduleName,
        related_entity_type,
        related_entity_id,
        correlation_id,
        session_id,
        user_id: userId,
      })
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
    const duration = Date.now() - startTime
    
    // Try to parse as JSON, otherwise return as text
    let parsedData: unknown
    try {
      parsedData = JSON.parse(responseData)
    } catch {
      parsedData = { raw: responseData }
    }

    // Log the API call (fire and forget)
    logApiCall(supabase, {
      api_name: setting.setting_name || `proxy-${moduleName}`,
      endpoint_url: targetUrl,
      http_method: method,
      request_headers: headers,
      request_payload: payload,
      response_status: externalResponse.status,
      response_body: parsedData,
      is_success: externalResponse.ok,
      error_message: externalResponse.ok ? null : `HTTP ${externalResponse.status}`,
      duration_ms: duration,
      module: moduleName,
      related_entity_type,
      related_entity_id,
      correlation_id,
      session_id,
      user_id: userId,
    })

    // Always return 200 so the client can handle the response gracefully
    const wrappedResponse = {
      _proxyStatus: externalResponse.status,
      _proxyOk: externalResponse.ok,
      ...((typeof parsedData === 'object' && parsedData !== null) ? parsedData : { data: parsedData }),
    }

    return new Response(JSON.stringify(wrappedResponse), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    })
  } catch (error: unknown) {
    console.error('Proxy error:', error)
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'

    // Try to log even on unexpected errors
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      const supabase = createClient(supabaseUrl, supabaseServiceKey)
      logApiCall(supabase, {
        api_name: 'proxy-api-error',
        endpoint_url: 'unknown',
        http_method: 'unknown',
        request_headers: {},
        request_payload: null,
        response_status: 500,
        response_body: { error: errorMessage },
        is_success: false,
        error_message: errorMessage,
        duration_ms: duration,
        module: 'unknown',
      })
    } catch {
      // truly last-resort, nothing to do
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
