// Generic, module-agnostic DMS upload edge function.
//
// Modes:
// 1. Upload from a generated document  → { generated_document_id, link: { ... } }
//    Reads core_generated_document.generated_html, uploads as HTML to DMS,
//    updates the row's dms_* columns, and (optionally) creates a module link.
// 2. Upload from raw bytes              → { file_base64, file_name, mime_type, link: { ... } }
//    Uploads the provided bytes, then (optionally) creates a module link.
//
// Module link types supported in this turn:
//   - LEGAL → creates a row in public.lg_document_link
//
// Auth: requires a Bearer token. Reads dms config from api_settings(setting_key='dms_service').

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface LegalLinkInput {
  module_code: 'LEGAL'
  lg_case_id: string
  document_category_code: string
  document_type_code?: string | null
  linked_stage_code?: string | null
  hearing_id?: string | null
  order_id?: string | null
  settlement_id?: string | null
  notice_id?: string | null
  title?: string | null
  notes?: string | null
  confidential?: boolean
  court_filed?: boolean
  filed_date?: string | null
}

interface UploadRequest {
  generated_document_id?: string
  file_base64?: string
  file_name?: string
  mime_type?: string
  category_id?: string // DMS CategoryId, defaults from doc type
  user_code: string
  correlation_id?: string
  link?: LegalLinkInput | null
}

function safeSnippet(t: string, n = 1000) {
  if (!t) return ''
  return t.length > n ? t.slice(0, n) + '…[truncated]' : t
}

function sanitizeHeaders(h: Record<string, string>) {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(h)) {
    const lc = k.toLowerCase()
    out[k] = lc.includes('key') || lc.includes('token') || lc.includes('auth') || lc.includes('secret')
      ? `***${(v || '').slice(-4)}`
      : v
  }
  return out
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function base64ToUint8Array(b64: string): Uint8Array {
  const clean = b64.replace(/^data:[^;]+;base64,/, '')
  const bin = atob(clean)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return arr
}

async function logAudit(supabase: any, p: {
  correlation_id: string; user_id: string | null; user_code: string;
  action: string; entity_type: string; entity_id?: string | null;
  payload?: any; severity?: string;
}) {
  try {
    await supabase.from('system_audit_trail').insert({
      correlation_id: p.correlation_id,
      action: p.action,
      entity_type: p.entity_type,
      entity_id: p.entity_id ?? null,
      module: 'Core DMS',
      user_id: p.user_id,
      user_name: p.user_code || 'SYSTEM',
      severity: p.severity || 'info',
      payload_json: p.payload || null,
      timestamp: new Date().toISOString(),
    })
  } catch (e) { console.error('[core-dms-upload] audit log failed', e) }
}

async function logApi(supabase: any, p: {
  correlation_id: string; user_id: string | null; user_code: string;
  endpoint: string; method: string; status: number | null; duration_ms: number;
  ok: boolean; error?: string | null; req_headers?: any; req_payload?: any; resp_body?: any;
  entity_type?: string; entity_id?: string | null;
}) {
  try {
    await supabase.from('api_logs').insert({
      api_name: 'core_dms_upload',
      correlation_id: p.correlation_id,
      endpoint_url: p.endpoint,
      http_method: p.method,
      response_status: p.status,
      duration_ms: p.duration_ms,
      is_success: p.ok,
      error_message: p.error ?? null,
      module: 'Core DMS',
      related_entity_type: p.entity_type ?? null,
      related_entity_id: p.entity_id ?? null,
      user_id: p.user_id,
      request_headers: p.req_headers ?? null,
      request_payload: p.req_payload ?? null,
      response_body: p.resp_body ?? null,
      execution_timestamp: new Date().toISOString(),
    })
  } catch (e) { console.error('[core-dms-upload] api_log failed', e) }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Auth
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)
  const token = authHeader.slice(7)
  const { data: claims, error: claimsErr } = await supabase.auth.getUser(token)
  if (claimsErr || !claims?.user) return json({ error: 'Unauthorized' }, 401)
  const userId = claims.user.id

  let body: UploadRequest
  try { body = await req.json() }
  catch { return json({ error: 'Invalid JSON body' }, 400) }

  const correlationId = body.correlation_id || crypto.randomUUID()
  const userCode = body.user_code || 'SYSTEM'

  // DMS config from api_settings
  let dmsBaseUrl: string | null = Deno.env.get('DMS_API_BASE_URL') || null
  let dmsApiKey: string | null = Deno.env.get('DMS_API_KEY') || null
  let dmsHeaderName = 'x-api-key'
  try {
    const { data: cfg } = await supabase
      .from('api_settings')
      .select('base_url, api_key, header_name, is_active')
      .eq('setting_key', 'dms_service')
      .maybeSingle()
    if (cfg && cfg.is_active) {
      if (cfg.base_url) dmsBaseUrl = cfg.base_url
      if (cfg.api_key) dmsApiKey = cfg.api_key
      if (cfg.header_name) dmsHeaderName = cfg.header_name
    }
  } catch (e) { console.error('[core-dms-upload] read api_settings failed', e) }

  if (!dmsBaseUrl) return json({ error: 'DMS base URL not configured' }, 500)

  // Resolve file payload
  let fileBytes: Uint8Array | null = null
  let fileName = body.file_name || ''
  let mimeType = body.mime_type || ''
  let categoryId = body.category_id || 'LEGAL'
  let genDoc: any = null

  try {
    if (body.generated_document_id) {
      const { data, error } = await supabase
        .from('core_generated_document')
        .select('*')
        .eq('id', body.generated_document_id)
        .maybeSingle()
      if (error || !data) return json({ error: 'Generated document not found', details: error?.message }, 404)
      genDoc = data

      // Skip if already uploaded
      if (data.dms_document_id && data.dms_upload_status === 'COMPLETE') {
        return json({
          success: true,
          skipped: true,
          message: 'Already uploaded',
          dms_document_id: data.dms_document_id,
          dms_file_id: data.dms_file_id,
          generated_document_id: data.id,
        })
      }

      const html = (data.generated_html as string) || ''
      const wrapped = `<!doctype html><html><head><meta charset="utf-8"><title>${(data.subject || data.reference_no || 'Document').replace(/</g, '&lt;')}</title></head><body>${html}</body></html>`
      fileBytes = new TextEncoder().encode(wrapped)
      fileName = fileName || `${data.reference_no || data.id}.html`
      mimeType = mimeType || 'text/html'
      categoryId = body.category_id || (data.module_code === 'LEGAL' ? 'LEGAL' : data.module_code || 'GENERAL')
    } else if (body.file_base64) {
      if (!fileName) return json({ error: 'file_name required when uploading raw bytes' }, 400)
      fileBytes = base64ToUint8Array(body.file_base64)
      mimeType = mimeType || 'application/octet-stream'
    } else {
      return json({ error: 'Either generated_document_id or file_base64 must be provided' }, 400)
    }
  } catch (e) {
    return json({ error: 'Failed to resolve file payload', details: String((e as Error)?.message || e) }, 400)
  }

  if (!fileBytes || fileBytes.byteLength === 0) {
    return json({ error: 'File payload is empty' }, 400)
  }

  // Mark generated doc as IN_PROGRESS
  if (genDoc) {
    await supabase.from('core_generated_document').update({
      dms_upload_status: 'IN_PROGRESS',
      dms_upload_error: null,
    }).eq('id', genDoc.id)
  }

  // Build DMS endpoint
  const trimmed = dmsBaseUrl.replace(/\/+$/, '')
  const dmsEndpoint = trimmed.endsWith('/api/Dms/files') ? trimmed : `${trimmed}/api/Dms/files`

  const link = body.link
  const entryFields: Record<string, string> = {
    Document_Type: link?.document_type_code || link?.document_category_code || categoryId,
    Reference_ID: genDoc?.reference_no || fileName,
    Uploaded_By: userCode,
    Uploaded_Date: new Date().toISOString().split('T')[0],
    Module: link?.module_code || (genDoc?.module_code ?? 'CORE'),
  }
  if (link?.lg_case_id) entryFields.LG_Case_ID = link.lg_case_id
  if (link?.linked_stage_code) entryFields.Stage = link.linked_stage_code

  const fd = new FormData()
  fd.append('File', new File([new Uint8Array(fileBytes)], fileName, { type: mimeType }))
  fd.append('CategoryId', categoryId)
  fd.append('UserName', userCode)
  fd.append('EntryFields', JSON.stringify(entryFields))

  const dmsHeaders: Record<string, string> = {}
  if (dmsApiKey) dmsHeaders[dmsHeaderName] = dmsApiKey

  await logAudit(supabase, {
    correlation_id: correlationId, user_id: userId, user_code: userCode,
    action: 'core_dms_upload_attempt',
    entity_type: genDoc ? 'core_generated_document' : 'raw_file',
    entity_id: genDoc?.id ?? null,
    payload: { dms_endpoint: dmsEndpoint, file_name: fileName, mime_type: mimeType, size: fileBytes.byteLength, category_id: categoryId, link },
  })

  const t0 = Date.now()
  let resp: Response
  let respText = ''
  let respJson: any = null
  let httpStatus: number | null = null
  try {
    resp = await fetch(dmsEndpoint, {
      method: 'POST',
      headers: dmsHeaders,
      body: fd,
      signal: AbortSignal.timeout(120000),
    })
    httpStatus = resp.status
    respText = await resp.text()
    try { respJson = JSON.parse(respText) } catch { respJson = { raw: safeSnippet(respText) } }

    await logApi(supabase, {
      correlation_id: correlationId, user_id: userId, user_code: userCode,
      endpoint: dmsEndpoint, method: 'POST', status: httpStatus, duration_ms: Date.now() - t0,
      ok: resp.ok,
      error: resp.ok ? null : `DMS HTTP ${httpStatus}`,
      req_headers: sanitizeHeaders(dmsHeaders),
      req_payload: { CategoryId: categoryId, UserName: userCode, FileName: fileName, FileSize: fileBytes.byteLength, EntryFields: entryFields },
      resp_body: { status: httpStatus, body: safeSnippet(respText) },
      entity_type: genDoc ? 'core_generated_document' : 'raw_file',
      entity_id: genDoc?.id ?? null,
    })

    if (!resp.ok) throw new Error(`DMS API HTTP ${httpStatus}: ${safeSnippet(respText, 400)}`)
  } catch (e) {
    const msg = String((e as Error)?.message || e)
    await logApi(supabase, {
      correlation_id: correlationId, user_id: userId, user_code: userCode,
      endpoint: dmsEndpoint, method: 'POST', status: httpStatus, duration_ms: Date.now() - t0,
      ok: false, error: msg,
      req_payload: { CategoryId: categoryId, UserName: userCode, FileName: fileName },
    })
    if (genDoc) {
      await supabase.from('core_generated_document').update({
        dms_upload_status: 'FAILED',
        dms_upload_error: msg.slice(0, 2000),
      }).eq('id', genDoc.id)
    }
    await logAudit(supabase, {
      correlation_id: correlationId, user_id: userId, user_code: userCode,
      action: 'core_dms_upload_failed',
      entity_type: genDoc ? 'core_generated_document' : 'raw_file',
      entity_id: genDoc?.id ?? null, severity: 'error',
      payload: { error: msg, http_status: httpStatus },
    })
    return json({ error: 'DMS upload failed', details: msg, correlation_id: correlationId }, 502)
  }

  // Extract identifiers from DMS response (be forgiving about casing)
  const dmsDocumentId =
    respJson?.documentId ?? respJson?.DocumentId ?? respJson?.id ?? respJson?.Id ??
    respJson?.data?.documentId ?? respJson?.data?.DocumentId ?? null
  const dmsFileId =
    respJson?.fileId ?? respJson?.FileId ?? respJson?.data?.fileId ?? respJson?.data?.FileId ?? null
  const dmsUrl =
    respJson?.url ?? respJson?.Url ?? respJson?.fileUrl ?? respJson?.FileUrl ??
    respJson?.data?.url ?? respJson?.data?.Url ?? null

  // Update generated document if applicable
  if (genDoc) {
    await supabase.from('core_generated_document').update({
      dms_document_id: dmsDocumentId ? String(dmsDocumentId) : null,
      dms_file_id: dmsFileId ? String(dmsFileId) : null,
      dms_url: dmsUrl ? String(dmsUrl) : null,
      dms_uploaded_at: new Date().toISOString(),
      dms_upload_status: 'COMPLETE',
      dms_upload_error: null,
    }).eq('id', genDoc.id)
  }

  // Create module link
  let linkId: string | null = null
  if (link && link.module_code === 'LEGAL' && link.lg_case_id) {
    try {
      const { data: linkRow, error: linkErr } = await supabase
        .from('lg_document_link')
        .insert({
          lg_case_id: link.lg_case_id,
          document_category_code: link.document_category_code,
          document_type_code: link.document_type_code ?? null,
          document_source: genDoc ? 'GENERATED' : 'UPLOADED',
          document_ref_id: genDoc?.id ?? null,
          document_ref_no: genDoc?.reference_no ?? null,
          title: link.title ?? genDoc?.subject ?? fileName,
          notes: link.notes ?? null,
          linked_stage_code: link.linked_stage_code ?? null,
          hearing_id: link.hearing_id ?? null,
          order_id: link.order_id ?? null,
          settlement_id: link.settlement_id ?? null,
          notice_id: link.notice_id ?? null,
          court_filed: !!link.court_filed,
          filed_date: link.filed_date ?? null,
          confidential: !!link.confidential,
          uploaded_by: userCode,
          linked_by: userCode,
          dms_document_id: dmsDocumentId ? String(dmsDocumentId) : null,
          dms_file_id: dmsFileId ? String(dmsFileId) : null,
          dms_url: dmsUrl ? String(dmsUrl) : null,
          file_name: fileName,
          mime_type: mimeType,
          size_bytes: fileBytes.byteLength,
          upload_status: 'COMPLETE',
        })
        .select('id')
        .single()
      if (linkErr) throw linkErr
      linkId = linkRow.id
    } catch (e) {
      console.error('[core-dms-upload] failed to create lg_document_link', e)
      await logAudit(supabase, {
        correlation_id: correlationId, user_id: userId, user_code: userCode,
        action: 'core_dms_link_create_failed', entity_type: 'lg_document_link',
        entity_id: genDoc?.id ?? null, severity: 'error',
        payload: { error: String((e as Error)?.message || e), link },
      })
    }
  }

  await logAudit(supabase, {
    correlation_id: correlationId, user_id: userId, user_code: userCode,
    action: 'core_dms_upload_success',
    entity_type: genDoc ? 'core_generated_document' : 'raw_file',
    entity_id: genDoc?.id ?? null,
    payload: { dms_document_id: dmsDocumentId, dms_file_id: dmsFileId, link_id: linkId },
  })

  return json({
    success: true,
    correlation_id: correlationId,
    generated_document_id: genDoc?.id ?? null,
    dms_document_id: dmsDocumentId ? String(dmsDocumentId) : null,
    dms_file_id: dmsFileId ? String(dmsFileId) : null,
    dms_url: dmsUrl ? String(dmsUrl) : null,
    file_name: fileName,
    mime_type: mimeType,
    size_bytes: fileBytes.byteLength,
    link_id: linkId,
  })
})
