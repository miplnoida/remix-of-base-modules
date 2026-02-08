import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

interface ExecuteApiRequest {
  action: 'execute' | 'get_config' | 'retry'
  workflowId?: string
  workflowStepId?: string
  workflowInstanceId?: string
  taskId?: string
  actionCode?: string
  applicationData?: Record<string, any>
  meetingData?: Record<string, any>
  workflowContext?: Record<string, any>
  executionLogId?: string
}

interface ApiConfig {
  id: string
  workflow_id: string
  workflow_step_id: string
  action_code: string
  http_method: string
  endpoint_url: string
  api_key_secret_name: string
  content_type: string
  timeout_seconds: number
  retry_count: number
  is_active: boolean
}

interface BodyMapping {
  json_field_name: string
  value_source: 'APPLICATION' | 'MEETING' | 'WORKFLOW' | 'SYSTEM' | 'STATIC'
  source_key: string
  static_value: string | null
}

// Build dynamic request body from mappings
function buildRequestBody(
  mappings: BodyMapping[],
  applicationData: Record<string, any>,
  meetingData: Record<string, any>,
  workflowContext: Record<string, any>,
  systemData: Record<string, any>
): Record<string, any> {
  const body: Record<string, any> = {}

  for (const mapping of mappings) {
    let value: any = null

    switch (mapping.value_source) {
      case 'APPLICATION':
        value = getNestedValue(applicationData, mapping.source_key)
        break
      case 'MEETING':
        value = getNestedValue(meetingData, mapping.source_key)
        break
      case 'WORKFLOW':
        value = getNestedValue(workflowContext, mapping.source_key)
        break
      case 'SYSTEM':
        value = getNestedValue(systemData, mapping.source_key)
        break
      case 'STATIC':
        value = mapping.static_value
        break
    }

    // Set value using dot notation path
    setNestedValue(body, mapping.json_field_name, value)
  }

  return body
}

// Get nested value from object using dot notation
function getNestedValue(obj: Record<string, any>, path: string): any {
  if (!obj || !path) return null
  
  const keys = path.split('.')
  let current = obj
  
  for (const key of keys) {
    if (current === null || current === undefined) return null
    current = current[key]
  }
  
  return current
}

// Set nested value in object using dot notation
function setNestedValue(obj: Record<string, any>, path: string, value: any): void {
  if (!path) return
  
  const keys = path.split('.')
  let current = obj
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    if (!(key in current)) {
      current[key] = {}
    }
    current = current[key]
  }
  
  current[keys[keys.length - 1]] = value
}

// Resolve placeholders in URL (e.g., {{applicationId}})
function resolveUrlPlaceholders(url: string, context: Record<string, any>): string {
  return url.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const value = getNestedValue(context, key.trim())
    return value !== undefined && value !== null ? String(value) : match
  })
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    let userId: string | null = null
    let userCode: string | null = null

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user } } = await supabase.auth.getUser(token)
      if (user) {
        userId = user.id
        // Get user code for audit
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_code, full_name')
          .eq('id', user.id)
          .single()
        userCode = profile?.user_code || profile?.full_name || user.email
      }
    }

    const body: ExecuteApiRequest = await req.json()
    console.log('Workflow Action API request:', body.action)

    switch (body.action) {
      case 'get_config': {
        // Get API configuration for a workflow step and action
        if (!body.workflowId || !body.workflowStepId || !body.actionCode) {
          return new Response(
            JSON.stringify({ error: 'workflowId, workflowStepId, and actionCode are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { data: config, error } = await supabase
          .from('workflow_step_action_api')
          .select(`
            *,
            body_mappings:workflow_step_action_api_body(*)
          `)
          .eq('workflow_id', body.workflowId)
          .eq('workflow_step_id', body.workflowStepId)
          .eq('action_code', body.actionCode)
          .eq('is_active', true)
          .single()

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching API config:', error)
          throw error
        }

        return new Response(
          JSON.stringify({ hasConfig: !!config, config }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'execute': {
        // Execute configured API call
        if (!body.workflowId || !body.workflowStepId || !body.actionCode || !body.workflowInstanceId) {
          return new Response(
            JSON.stringify({ error: 'workflowId, workflowStepId, actionCode, and workflowInstanceId are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Get API configuration
        const { data: config, error: configError } = await supabase
          .from('workflow_step_action_api')
          .select('*')
          .eq('workflow_id', body.workflowId)
          .eq('workflow_step_id', body.workflowStepId)
          .eq('action_code', body.actionCode)
          .eq('is_active', true)
          .single()

        if (configError || !config) {
          // No API configured - this is not an error, just return success
          console.log('No API configured for this action, skipping')
          return new Response(
            JSON.stringify({ success: true, skipped: true, message: 'No API configured for this action' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Get body mappings
        const { data: mappings } = await supabase
          .from('workflow_step_action_api_body')
          .select('*')
          .eq('workflow_action_api_id', config.id)
          .order('display_order')

        // Build system data
        const systemData = {
          logged_in_user: userCode || userId,
          current_timestamp: new Date().toISOString(),
          current_date: new Date().toISOString().split('T')[0],
          current_time: new Date().toISOString().split('T')[1].substring(0, 8),
          user_id: userId
        }

        // Build request body dynamically
        const requestBody = buildRequestBody(
          mappings || [],
          body.applicationData || {},
          body.meetingData || {},
          { ...body.workflowContext, action_code: body.actionCode },
          systemData
        )

        // Resolve URL placeholders
        const allContext = {
          ...body.applicationData,
          ...body.meetingData,
          ...body.workflowContext,
          ...systemData
        }
        const resolvedUrl = resolveUrlPlaceholders(config.endpoint_url, allContext)

        // Get API key from secrets
        let apiKey: string | null = null
        if (config.api_key_secret_name) {
          apiKey = Deno.env.get(config.api_key_secret_name) || null
          if (!apiKey) {
            console.warn(`API key secret '${config.api_key_secret_name}' not found`)
          }
        }

        // Build headers (NEVER log API key)
        const headers: Record<string, string> = {
          'Content-Type': config.content_type
        }

        if (apiKey) {
          // Support different auth header formats
          if (config.api_key_secret_name.toLowerCase().includes('bearer')) {
            headers['Authorization'] = `Bearer ${apiKey}`
          } else {
            headers['X-API-Key'] = apiKey
          }
        }

        console.log(`Calling external API: ${config.http_method} ${resolvedUrl}`)
        // Log request payload (safe to log)
        console.log('Request payload:', JSON.stringify(requestBody))

        // Execute API call with timeout
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), (config.timeout_seconds || 30) * 1000)

        let response: Response | null = null
        let responseText: string = ''
        let responseJson: any = null
        let httpStatus: number | null = null
        let executionStatus: 'SUCCESS' | 'FAILED' | 'TIMEOUT' = 'FAILED'
        let errorMessage: string | null = null

        try {
          const fetchOptions: RequestInit = {
            method: config.http_method,
            headers,
            signal: controller.signal
          }

          if (['POST', 'PUT', 'PATCH'].includes(config.http_method)) {
            fetchOptions.body = JSON.stringify(requestBody)
          }

          response = await fetch(resolvedUrl, fetchOptions)
          clearTimeout(timeoutId)

          httpStatus = response.status
          responseText = await response.text()

          try {
            responseJson = JSON.parse(responseText)
          } catch {
            responseJson = { raw: responseText }
          }

          if (response.ok) {
            executionStatus = 'SUCCESS'
          } else {
            executionStatus = 'FAILED'
            errorMessage = `HTTP ${httpStatus}: ${responseText.substring(0, 500)}`
          }
        } catch (fetchError: unknown) {
          clearTimeout(timeoutId)
          if (fetchError instanceof Error && fetchError.name === 'AbortError') {
            executionStatus = 'TIMEOUT'
            errorMessage = `Request timed out after ${config.timeout_seconds} seconds`
          } else {
            executionStatus = 'FAILED'
            errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown error'
          }
        }

        const duration = Date.now() - startTime

        // Log the execution (NEVER include API key in logs)
        const { data: logEntry } = await supabase
          .from('workflow_api_execution_log')
          .insert({
            workflow_instance_id: body.workflowInstanceId,
            workflow_step_id: body.workflowStepId,
            task_id: body.taskId,
            action_code: body.actionCode,
            api_config_id: config.id,
            endpoint_url: resolvedUrl,
            http_method: config.http_method,
            request_payload: requestBody, // Safe - no secrets here
            response_payload: responseJson,
            http_status: httpStatus,
            execution_status: executionStatus,
            error_message: errorMessage,
            duration_ms: duration,
            retry_attempt: 0,
            executed_by: userCode || userId
          })
          .select('id')
          .single()

        // Return result
        const result = {
          success: executionStatus === 'SUCCESS',
          executionStatus,
          httpStatus,
          responsePayload: responseJson,
          errorMessage,
          duration,
          logId: logEntry?.id,
          // Include warning if API failed but don't fail the workflow
          warning: executionStatus !== 'SUCCESS' 
            ? `API call failed: ${errorMessage}. Workflow action completed but external sync may be pending.`
            : undefined
        }

        return new Response(
          JSON.stringify(result),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'retry': {
        // Retry a failed API execution
        if (!body.executionLogId) {
          return new Response(
            JSON.stringify({ error: 'executionLogId is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Get the original execution log
        const { data: logEntry, error: logError } = await supabase
          .from('workflow_api_execution_log')
          .select('*, api_config:workflow_step_action_api(*)')
          .eq('id', body.executionLogId)
          .single()

        if (logError || !logEntry) {
          throw new Error('Execution log not found')
        }

        if (logEntry.execution_status === 'SUCCESS') {
          return new Response(
            JSON.stringify({ error: 'Cannot retry a successful execution' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const config = logEntry.api_config as ApiConfig
        if (!config) {
          throw new Error('API configuration not found')
        }

        // Get API key
        let apiKey: string | null = null
        if (config.api_key_secret_name) {
          apiKey = Deno.env.get(config.api_key_secret_name) || null
        }

        // Build headers
        const headers: Record<string, string> = {
          'Content-Type': config.content_type
        }

        if (apiKey) {
          if (config.api_key_secret_name.toLowerCase().includes('bearer')) {
            headers['Authorization'] = `Bearer ${apiKey}`
          } else {
            headers['X-API-Key'] = apiKey
          }
        }

        console.log(`Retrying API call: ${config.http_method} ${logEntry.endpoint_url}`)

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), (config.timeout_seconds || 30) * 1000)

        let response: Response | null = null
        let responseText: string = ''
        let responseJson: any = null
        let httpStatus: number | null = null
        let executionStatus: 'SUCCESS' | 'FAILED' | 'TIMEOUT' = 'FAILED'
        let errorMessage: string | null = null

        try {
          const fetchOptions: RequestInit = {
            method: config.http_method,
            headers,
            signal: controller.signal
          }

          if (['POST', 'PUT', 'PATCH'].includes(config.http_method)) {
            fetchOptions.body = JSON.stringify(logEntry.request_payload)
          }

          response = await fetch(logEntry.endpoint_url, fetchOptions)
          clearTimeout(timeoutId)

          httpStatus = response.status
          responseText = await response.text()

          try {
            responseJson = JSON.parse(responseText)
          } catch {
            responseJson = { raw: responseText }
          }

          if (response.ok) {
            executionStatus = 'SUCCESS'
          } else {
            executionStatus = 'FAILED'
            errorMessage = `HTTP ${httpStatus}: ${responseText.substring(0, 500)}`
          }
        } catch (fetchError: unknown) {
          clearTimeout(timeoutId)
          if (fetchError instanceof Error && fetchError.name === 'AbortError') {
            executionStatus = 'TIMEOUT'
            errorMessage = `Request timed out after ${config.timeout_seconds} seconds`
          } else {
            executionStatus = 'FAILED'
            errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown error'
          }
        }

        const duration = Date.now() - startTime

        // Log the retry attempt
        const { data: newLogEntry } = await supabase
          .from('workflow_api_execution_log')
          .insert({
            workflow_instance_id: logEntry.workflow_instance_id,
            workflow_step_id: logEntry.workflow_step_id,
            task_id: logEntry.task_id,
            action_code: logEntry.action_code,
            api_config_id: config.id,
            endpoint_url: logEntry.endpoint_url,
            http_method: config.http_method,
            request_payload: logEntry.request_payload,
            response_payload: responseJson,
            http_status: httpStatus,
            execution_status: executionStatus,
            error_message: errorMessage,
            duration_ms: duration,
            retry_attempt: (logEntry.retry_attempt || 0) + 1,
            executed_by: userCode || userId
          })
          .select('id')
          .single()

        return new Response(
          JSON.stringify({
            success: executionStatus === 'SUCCESS',
            executionStatus,
            httpStatus,
            responsePayload: responseJson,
            errorMessage,
            duration,
            logId: newLogEntry?.id,
            retryAttempt: (logEntry.retry_attempt || 0) + 1
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error: unknown) {
    console.error('Workflow Action API error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})