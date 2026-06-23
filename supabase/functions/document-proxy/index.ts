import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

/**
 * Edge function to securely proxy document access from external application storage.
 *
 * POST body:
 *   { action: 'signed-url' | 'download' | 'stream',
 *     link_id?: string,         // NEW: enforce permissions against lg_document_link
 *     documentUrl?: string,     // legacy: direct URL (still validated against allow-list)
 *     fileName?: string }
 *
 * When `link_id` is supplied the function:
 *   1. resolves the lg_document_link row server-side
 *   2. checks the caller can view confidential docs if row.confidential = true
 *      (LEGAL_DOCUMENT_CONFIDENTIAL_VIEW permission)
 *   3. logs denied attempts to system_audit_trail (severity = warning)
 *   4. resolves the DMS URL itself — the browser never sees the raw URL
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const admin = createClient(supabaseUrl, supabaseServiceKey)

  const logDeny = async (
    userId: string | null,
    reason: string,
    payload: Record<string, unknown>,
  ) => {
    try {
      await admin.from('system_audit_trail').insert({
        action: 'core_dms_access_denied',
        entity_type: 'lg_document_link',
        entity_id: (payload as any).link_id ?? null,
        module: 'Core DMS',
        severity: 'warning',
        user_name: userId ?? 'anonymous',
        payload_json: { reason, ...payload },
        timestamp: new Date().toISOString(),
      })
    } catch (e) {
      console.error('[document-proxy] audit insert failed:', e)
    }
  }

  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token)
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }
    const userId = claimsData.claims.sub as string

    const body = await req.json()
    const { action, fileName } = body
    let documentUrl: string | undefined = body.documentUrl
    const linkId: string | undefined = body.link_id

    // ============================================================
    // link_id path — server-side permission enforcement
    // ============================================================
    if (linkId) {
      const { data: link, error: linkErr } = await admin
        .from('lg_document_link')
        .select('id, lg_case_id, confidential, dms_url, dms_document_id, file_name, mime_type, upload_status, storage_provider, storage_ref')
        .eq('id', linkId)
        .maybeSingle()
      if (linkErr || !link) {
        await logDeny(userId, 'link_not_found', { link_id: linkId })
        return new Response(
          JSON.stringify({ error: 'Document link not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
      if (link.upload_status === 'ARCHIVED') {
        await logDeny(userId, 'archived', { link_id: linkId, lg_case_id: link.lg_case_id })
        return new Response(
          JSON.stringify({ error: 'Document is archived' }),
          { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      // Validate the case exists (sanity-check the caller is touching a real case)
      const { data: lgCase } = await admin
        .from('lg_case')
        .select('id')
        .eq('id', link.lg_case_id)
        .maybeSingle()
      if (!lgCase) {
        await logDeny(userId, 'lg_case_missing', { link_id: linkId, lg_case_id: link.lg_case_id })
        return new Response(
          JSON.stringify({ error: 'Associated legal case not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      // Confidential gating
      if (link.confidential) {
        const { data: roles } = await admin
          .from('user_roles').select('role_id').eq('user_id', userId)
          const roleIds = (roles ?? []).map((r: any) => r.role_id)
        let allowed = false
        if (roleIds.length) {
          const { data: actions } = await admin
            .from('module_actions').select('id').eq('action_code', 'LEGAL_DOCUMENT_CONFIDENTIAL_VIEW')
            const actionIds = (actions ?? []).map((a: any) => a.id)
          if (actionIds.length) {
            const { data: perms } = await admin
              .from('role_permissions').select('id')
              .in('role_id', roleIds).in('action_id', actionIds).limit(1)
            allowed = !!(perms && perms.length)
          }
        }
        if (!allowed) {
          await logDeny(userId, 'confidential_denied', {
            link_id: linkId, lg_case_id: link.lg_case_id, action,
          })
          return new Response(
            JSON.stringify({ error: 'You do not have permission to view this confidential document' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          )
        }
      }

      // Resolve URL
      if (link.dms_url) {
        documentUrl = link.dms_url
      } else if (link.dms_document_id) {
        const { data: cfg } = await admin
          .from('api_settings').select('base_url').eq('setting_key', 'dms_service').maybeSingle()
        if (cfg?.base_url) {
          const base = String(cfg.base_url).replace(/\/+$/, '')
          documentUrl = `${base}/api/Dms/files/${encodeURIComponent(link.dms_document_id)}/download`
        }
      }
      if (!documentUrl) {
        return new Response(
          JSON.stringify({ error: 'Document has no DMS reference' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
    }

    if (!documentUrl) {
      return new Response(
        JSON.stringify({ error: 'documentUrl or link_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const allowedOrigins = [
      'fiqyahojoouloswmnhcu.supabase.co',
      'hekgiuycrjncxalcapfz.supabase.co',
      'xynceskeiiisiefqlgxo.supabase.co',
      'dmsservice.digitalnoticeboard.biz',
    ]

    let parsedUrl: URL
    try { parsedUrl = new URL(documentUrl) } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid document URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }
    const isAllowed = allowedOrigins.some(o => parsedUrl.hostname.includes(o))
    if (!isAllowed && !documentUrl.startsWith('/')) {
      return new Response(
        JSON.stringify({ error: 'Document URL is not from an allowed source' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (action === 'signed-url') {
      const proxyUrl = `${supabaseUrl}/functions/v1/document-proxy`
      return new Response(
        JSON.stringify({ signedUrl: proxyUrl, message: 'POST to this URL with action=stream', expiresIn: 300 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (action === 'stream' || action === 'download') {
      // Fetch the file server-side and forward bytes.
      const externalAnonKey = Deno.env.get('EXTERNAL_SUPABASE_ANON_KEY')
      const externalSupabaseUrl = 'https://hekgiuycrjncxalcapfz.supabase.co'
      const externalSupabase = externalAnonKey
        ? createClient(externalSupabaseUrl, externalAnonKey)
        : null

      let fileBlob: ArrayBuffer | null = null
      let contentType = 'application/octet-stream'

      const externalStorageMatch = documentUrl.match(
        /https:\/\/([^/]+)\.supabase\.co\/storage\/v1\/object\/(?:sign|public)\/([^/?]+)\/(.+?)(?:\?|$)/,
      )
      if (externalStorageMatch && externalSupabase) {
        const bucket = externalStorageMatch[2]
        const filePath = decodeURIComponent(externalStorageMatch[3])
        const { data: fileData, error: downloadError } = await externalSupabase.storage.from(bucket).download(filePath)
        if (!downloadError && fileData) {
          fileBlob = await fileData.arrayBuffer()
          contentType = fileData.type || contentType
        }
      }

      if (!fileBlob) {
        const fetchResponse = await fetch(documentUrl)
        if (!fetchResponse.ok) {
          try {
            await admin.from('api_logs').insert({
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
          } catch (_) { /* non-blocking */ }
          return new Response(
            JSON.stringify({ error: 'Document not found or inaccessible', details: `Remote returned ${fetchResponse.status}` }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          )
        }
        contentType = fetchResponse.headers.get('content-type') || contentType
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
      return new Response(fileBlob, { status: 200, headers: responseHeaders })
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use: signed-url, stream, or download' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error: unknown) {
    console.error('Document proxy error:', error)
    const msg = error instanceof Error ? error.message : 'Internal server error'
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
