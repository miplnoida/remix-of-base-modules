import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

/**
 * Edge function to securely proxy document access from external application storage.
 * Generates signed URLs or streams document content for view/download.
 * 
 * POST body: { action: 'signed-url' | 'download', documentUrl: string, fileName?: string }
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Authenticate the caller
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  })

  const token = authHeader.replace('Bearer ', '')
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token)
  if (claimsError || !claimsData?.claims) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const userId = claimsData.claims.sub

  // External Supabase client for downloading from external storage
  const externalAnonKey = Deno.env.get('EXTERNAL_SUPABASE_ANON_KEY')
  const externalSupabaseUrl = 'https://hekgiuycrjncxalcapfz.supabase.co'
  const externalSupabase = externalAnonKey
    ? createClient(externalSupabaseUrl, externalAnonKey)
    : null

    // Parse request
    const body = await req.json()
    const { action, documentUrl, fileName } = body

    if (!documentUrl) {
      return new Response(
        JSON.stringify({ error: 'documentUrl is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate the URL is from the known external source
    const allowedOrigins = [
      'fiqyahojoouloswmnhcu.supabase.co',
      'hekgiuycrjncxalcapfz.supabase.co',
      'xynceskeiiisiefqlgxo.supabase.co',
      'dmsservice.digitalnoticeboard.biz',
    ]
    
    let parsedUrl: URL
    try {
      parsedUrl = new URL(documentUrl)
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid document URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const isAllowed = allowedOrigins.some(origin => parsedUrl.hostname.includes(origin))
    if (!isAllowed) {
      // Also allow relative paths or same-origin
      if (!documentUrl.startsWith('/')) {
        return new Response(
          JSON.stringify({ error: 'Document URL is not from an allowed source' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    if (action === 'signed-url') {
      // For external Supabase storage, we need to fetch the file and re-serve it
      // since we can't generate signed URLs for another project's storage.
      // Instead, we return a proxy URL that this function will serve.
      const proxyUrl = `${supabaseUrl}/functions/v1/document-proxy`
      
      return new Response(
        JSON.stringify({ 
          signedUrl: proxyUrl,
          message: 'Use the stream action to access the document',
          expiresIn: 300, // 5 minutes conceptual expiry
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'stream' || action === 'download') {
      let fetchResponse: Response | null = null
      let fileBlob: ArrayBuffer | null = null
      let contentType = 'application/octet-stream'

      // Try to extract bucket/path from external Supabase storage URL and download via SDK
      const externalStorageMatch = documentUrl.match(
        /https:\/\/([^/]+)\.supabase\.co\/storage\/v1\/object\/(?:sign|public)\/([^/?]+)\/(.+?)(?:\?|$)/
      )

      if (externalStorageMatch && externalSupabase) {
        const bucket = externalStorageMatch[2]
        const filePath = decodeURIComponent(externalStorageMatch[3])
        console.log(`[document-proxy] Downloading via SDK: bucket=${bucket}, path=${filePath}`)

        const { data: fileData, error: downloadError } = await externalSupabase.storage
          .from(bucket)
          .download(filePath)

        if (downloadError || !fileData) {
          console.error('[document-proxy] SDK download failed:', downloadError?.message)
          // Fall through to direct fetch as fallback
        } else {
          fileBlob = await fileData.arrayBuffer()
          contentType = fileData.type || 'application/octet-stream'
        }
      }

      // Fallback: direct fetch (works for public URLs or non-expired signed URLs)
      if (!fileBlob) {
        fetchResponse = await fetch(documentUrl)

        if (!fetchResponse.ok) {
          try {
            const adminClient = createClient(supabaseUrl, supabaseServiceKey)
            await adminClient.from('api_logs').insert({
              api_name: 'document-proxy',
              endpoint_url: documentUrl,
              http_method: 'GET',
              response_status: fetchResponse.status,
              is_success: false,
              error_message: `Failed to fetch document: ${fetchResponse.statusText}`,
              duration_ms: 0,
              module: 'document-proxy',
              user_id: userId,
            })
          } catch (_logErr) {
            console.error('Failed to log to api_logs:', _logErr)
          }

          return new Response(
            JSON.stringify({ 
              error: 'Document not found or inaccessible',
              details: `External storage returned ${fetchResponse.status}`,
            }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        contentType = fetchResponse.headers.get('content-type') || 'application/octet-stream'
        fileBlob = await fetchResponse.arrayBuffer()
      }
      
      const responseHeaders: Record<string, string> = {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=300',
      }

      if (action === 'download') {
        const safeName = (fileName || 'document').replace(/[^a-zA-Z0-9._-]/g, '_')
        responseHeaders['Content-Disposition'] = `attachment; filename="${safeName}"`
      } else {
        responseHeaders['Content-Disposition'] = 'inline'
      }

      return new Response(fileBlob, {
        status: 200,
        headers: responseHeaders,
      })
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use: signed-url, stream, or download' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('Document proxy error:', error)
    const msg = error instanceof Error ? error.message : 'Internal server error'
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
