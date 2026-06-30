// Generic, module-agnostic document upload edge function.
//
// Honours public.core_document_storage_config to route writes to:
//   LOCAL_SUPABASE → Supabase Storage bucket (default: core-documents)
//   CENTRAL_DMS    → External DMS via api_settings(setting_key=dms_service)
//   HYBRID         → Write LOCAL first (always succeeds), then attempt CENTRAL
//                    and queue retry on failure. Caller never blocks on DMS.
//
// When provider is CENTRAL_DMS and fallback_to_local is true, a DMS failure
// silently degrades to a LOCAL write so the user is never left without a doc.

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
  fee_charge_id?: string | null
  title?: string | null
  notes?: string | null
  confidential?: boolean
  court_filed?: boolean
  filed_date?: string | null
  /**
   * Snapshot of resolveEnterpriseContext() at dispatch time. Persisted on the
   * lg_document_link row so every DMS document carries its enterprise identity
   * (organization, department, module, location, document type, confidentiality).
   */
  enterprise_metadata?: Record<string, unknown> | null
}

interface UploadRequest {
  generated_document_id?: string
  file_base64?: string
  file_name?: string
  mime_type?: string
  category_id?: string
  user_code: string
  correlation_id?: string
  link?: LegalLinkInput | null
}

interface StorageConfig {
  provider: 'LOCAL_SUPABASE' | 'CENTRAL_DMS' | 'HYBRID'
  local_bucket: string
  dms_api_setting_key: string
  dms_default_category_id: string
  dms_legal_category_id: string
  fallback_to_local: boolean
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function safeSnippet(t: string, n = 1000) {
  if (!t) return ''
  return t.length > n ? t.slice(0, n) + '…[truncated]' : t
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

async function getStorageConfig(supabase: any): Promise<StorageConfig> {
  const { data } = await supabase
    .from('core_document_storage_config')
    .select('*')
    .eq('is_active', true)
    .maybeSingle()
  return {
    provider: data?.provider ?? 'LOCAL_SUPABASE',
    local_bucket: data?.local_bucket ?? 'core-documents',
    dms_api_setting_key: data?.dms_api_setting_key ?? 'dms_service',
    dms_default_category_id: data?.dms_default_category_id ?? 'PPIP',
    dms_legal_category_id: data?.dms_legal_category_id ?? 'PPIP',
    fallback_to_local: data?.fallback_to_local ?? true,
  }
}

async function writeLocal(
  supabase: any,
  cfg: StorageConfig,
  bytes: Uint8Array,
  fileName: string,
  mimeType: string,
  entityType: string,
  entityId: string | null,
): Promise<{ storage_ref: string; signed_url: string | null }> {
  const safeName = fileName.replace(/[^\w.\-]+/g, '_')
  const folder = entityId
    ? `${entityType}/${entityId.slice(0, 2)}/${entityId}`
    : `misc/${new Date().toISOString().slice(0, 7)}`
  const path = `${folder}/${Date.now()}-${safeName}`
  const { error } = await supabase.storage
    .from(cfg.local_bucket)
    .upload(path, new Blob([new Uint8Array(bytes)], { type: mimeType }), {
      contentType: mimeType,
      upsert: false,
    })
  if (error) throw new Error(`Local storage upload failed: ${error.message}`)
  const { data: signed } = await supabase.storage
    .from(cfg.local_bucket)
    .createSignedUrl(path, 60 * 60 * 24)
  return { storage_ref: `${cfg.local_bucket}/${path}`, signed_url: signed?.signedUrl ?? null }
}

async function writeCentralDms(
  supabase: any,
  cfg: StorageConfig,
  bytes: Uint8Array,
  fileName: string,
  mimeType: string,
  userCode: string,
  categoryId: string,
  entryFields: Record<string, string>,
  correlationId: string,
  userId: string | null,
): Promise<{ dms_document_id: string | null; dms_file_id: string | null; dms_url: string | null }> {
  const { data: dmsCfg } = await supabase
    .from('api_settings')
    .select('base_url, api_key, header_name, is_active')
    .eq('setting_key', cfg.dms_api_setting_key)
    .maybeSingle()
  if (!dmsCfg || !dmsCfg.is_active || !dmsCfg.base_url) {
    throw new Error('Central DMS not configured or inactive')
  }
  const trimmed = String(dmsCfg.base_url).replace(/\/+$/, '')
  const endpoint = trimmed.endsWith('/api/Dms/files') ? trimmed : `${trimmed}/api/Dms/files`
  const headerName = dmsCfg.header_name || 'x-api-key'

  const fd = new FormData()
  fd.append('File', new File([new Uint8Array(bytes)], fileName, { type: mimeType }))
  fd.append('CategoryId', categoryId)
  fd.append('UserName', userCode)
  fd.append('EntryFields', JSON.stringify(entryFields))

  const headers: Record<string, string> = {}
  if (dmsCfg.api_key) headers[headerName] = dmsCfg.api_key

  const t0 = Date.now()
  let httpStatus: number | null = null
  let respText = ''
  let respJson: any = null
  try {
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: fd,
      signal: AbortSignal.timeout(60000),
    })
    httpStatus = resp.status
    respText = await resp.text()
    try { respJson = JSON.parse(respText) } catch { respJson = { raw: safeSnippet(respText) } }
    try {
      await supabase.from('api_logs').insert({
        api_name: 'core_dms_upload',
        correlation_id: correlationId,
        endpoint_url: endpoint,
        http_method: 'POST',
        response_status: httpStatus,
        duration_ms: Date.now() - t0,
        is_success: resp.ok,
        error_message: resp.ok ? null : `DMS HTTP ${httpStatus}`,
        module: 'Core DMS',
        user_id: userId,
        request_payload: { CategoryId: categoryId, FileName: fileName, EntryFields: entryFields },
        response_body: { status: httpStatus, body: safeSnippet(respText) },
        execution_timestamp: new Date().toISOString(),
      })
    } catch { /* swallow */ }
    if (!resp.ok) throw new Error(`DMS HTTP ${httpStatus}: ${safeSnippet(respText, 300)}`)
  } catch (e) {
    if (httpStatus === null) {
      throw new Error(`DMS unreachable: ${String((e as Error).message || e)}`)
    }
    throw e
  }

  const dmsFileName = respJson?.data?.filename ?? respJson?.data?.fileName ?? respJson?.filename ?? respJson?.fileName ?? null
  const documentId = respJson?.documentId ?? respJson?.DocumentId ?? respJson?.id ?? respJson?.Id ??
                     respJson?.data?.documentId ?? respJson?.data?.DocumentId ?? dmsFileName ?? null
  const fileId = respJson?.fileId ?? respJson?.FileId ?? respJson?.data?.fileId ?? respJson?.data?.FileId ?? dmsFileName ?? null
  const url = respJson?.url ?? respJson?.Url ?? respJson?.fileUrl ?? respJson?.FileUrl ??
              respJson?.data?.url ?? respJson?.data?.Url ??
              (dmsFileName ? `${trimmed}/api/Dms/files/${encodeURIComponent(String(dmsFileName))}` : null)
  return {
    dms_document_id: documentId ? String(documentId) : null,
    dms_file_id: fileId ? String(fileId) : null,
    dms_url: url ? String(url) : null,
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceKey)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)
  const token = authHeader.slice(7)
  const { data: claims, error: claimsErr } = await supabase.auth.getUser(token)
  if (claimsErr || !claims?.user) return json({ error: 'Unauthorized' }, 401)
  const userId = claims.user.id

  let body: UploadRequest
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON body' }, 400) }

  const correlationId = body.correlation_id || crypto.randomUUID()
  const userCode = body.user_code || 'SYSTEM'

  const cfg = await getStorageConfig(supabase)

  // Resolve file payload
  let fileBytes: Uint8Array | null = null
  let fileName = body.file_name || ''
  let mimeType = body.mime_type || ''
  let categoryId = body.category_id || cfg.dms_default_category_id
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
      if (data.sync_state === 'SYNCED' || (data.dms_document_id && data.dms_upload_status === 'COMPLETE')) {
        return json({
          success: true, skipped: true, message: 'Already uploaded',
          dms_document_id: data.dms_document_id, dms_file_id: data.dms_file_id,
          generated_document_id: data.id,
          storage_provider: data.storage_provider,
          storage_ref: data.storage_ref,
          sync_state: data.sync_state,
        })
      }
      const html = (data.generated_html as string) || ''
      const wrapped = `<!doctype html><html><head><meta charset="utf-8"><title>${(data.subject || data.reference_no || 'Document').replace(/</g, '&lt;')}</title></head><body>${html}</body></html>`
      fileBytes = new TextEncoder().encode(wrapped)
      fileName = fileName || `${data.reference_no || data.id}.html`
      mimeType = mimeType || 'text/html'
      categoryId = body.category_id || (data.module_code === 'LEGAL' ? cfg.dms_legal_category_id : cfg.dms_default_category_id)
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

  if (!fileBytes || fileBytes.byteLength === 0) return json({ error: 'File payload is empty' }, 400)

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

  await logAudit(supabase, {
    correlation_id: correlationId, user_id: userId, user_code: userCode,
    action: 'core_doc_upload_attempt',
    entity_type: genDoc ? 'core_generated_document' : 'raw_file',
    entity_id: genDoc?.id ?? null,
    payload: { provider: cfg.provider, file_name: fileName, size: fileBytes.byteLength, link },
  })

  // ============================================================
  // Routing
  // ============================================================
  let storageProvider: 'LOCAL_SUPABASE' | 'CENTRAL_DMS' = 'LOCAL_SUPABASE'
  let storageRef: string | null = null
  let signedUrl: string | null = null
  let dmsDocumentId: string | null = null
  let dmsFileId: string | null = null
  let dmsUrl: string | null = null
  let syncState: 'LOCAL_ONLY' | 'PENDING_CENTRAL' | 'SYNCED' | 'FAILED' = 'LOCAL_ONLY'
  let dmsError: string | null = null

  const tryLocal = async () => {
    const r = await writeLocal(supabase, cfg, fileBytes!, fileName, mimeType,
      genDoc ? 'core_generated_document' : 'raw_file', genDoc?.id ?? link?.lg_case_id ?? null)
    storageRef = r.storage_ref
    signedUrl = r.signed_url
    storageProvider = 'LOCAL_SUPABASE'
  }

  const tryCentral = async () => {
    const r = await writeCentralDms(supabase, cfg, fileBytes!, fileName, mimeType, userCode,
      categoryId, entryFields, correlationId, userId)
    dmsDocumentId = r.dms_document_id
    dmsFileId = r.dms_file_id
    dmsUrl = r.dms_url
    storageProvider = 'CENTRAL_DMS'
  }

  try {
    if (cfg.provider === 'LOCAL_SUPABASE') {
      await tryLocal()
      syncState = 'LOCAL_ONLY'
    } else if (cfg.provider === 'CENTRAL_DMS') {
      try {
        await tryCentral()
        syncState = 'SYNCED'
      } catch (e) {
        dmsError = String((e as Error).message || e)
        if (cfg.fallback_to_local) {
          await tryLocal()
          syncState = 'PENDING_CENTRAL'
        } else {
          throw e
        }
      }
    } else {
      // HYBRID: local always, central best-effort
      await tryLocal()
      try {
        await tryCentral()
        syncState = 'SYNCED'
      } catch (e) {
        dmsError = String((e as Error).message || e)
        syncState = 'PENDING_CENTRAL'
      }
    }
  } catch (e) {
    const msg = String((e as Error).message || e)
    if (genDoc) {
      await supabase.from('core_generated_document').update({
        sync_state: 'FAILED',
        last_sync_error: msg.slice(0, 2000),
        sync_attempts: (genDoc.sync_attempts ?? 0) + 1,
        dms_upload_status: 'FAILED',
        dms_upload_error: msg.slice(0, 2000),
      }).eq('id', genDoc.id)
    }
    await logAudit(supabase, {
      correlation_id: correlationId, user_id: userId, user_code: userCode,
      action: 'core_doc_upload_failed',
      entity_type: genDoc ? 'core_generated_document' : 'raw_file',
      entity_id: genDoc?.id ?? null, severity: 'error',
      payload: { error: msg, provider: cfg.provider },
    })
    return json({ error: 'Document upload failed', details: msg, correlation_id: correlationId }, 502)
  }

  // Update generated document
  if (genDoc) {
    await supabase.from('core_generated_document').update({
      storage_provider: storageProvider === 'CENTRAL_DMS' ? 'CENTRAL_DMS' : 'LOCAL_SUPABASE',
      storage_ref: storageRef,
      central_dms_ref: dmsDocumentId,
      sync_state: syncState,
      synced_at: syncState === 'SYNCED' ? new Date().toISOString() : null,
      last_sync_error: dmsError?.slice(0, 2000) ?? null,
      sync_attempts: (genDoc.sync_attempts ?? 0) + 1,
      dms_document_id: dmsDocumentId,
      dms_file_id: dmsFileId,
      dms_url: dmsUrl,
      dms_uploaded_at: dmsDocumentId ? new Date().toISOString() : null,
      dms_upload_status: syncState === 'SYNCED' ? 'COMPLETE' : (storageRef ? 'COMPLETE' : 'FAILED'),
      dms_upload_error: dmsError?.slice(0, 2000) ?? null,
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
          fee_charge_id: link.fee_charge_id ?? null,
          court_filed: !!link.court_filed,
          filed_date: link.filed_date ?? null,
          confidential: !!link.confidential,
          uploaded_by: userCode,
          linked_by: userCode,
          dms_document_id: dmsDocumentId,
          dms_file_id: dmsFileId,
          dms_url: dmsUrl,
          file_name: fileName,
          mime_type: mimeType,
          size_bytes: fileBytes.byteLength,
          upload_status: 'COMPLETE',
          storage_provider: storageProvider,
          storage_ref: storageRef,
          central_dms_ref: dmsDocumentId,
          sync_state: syncState,
          synced_at: syncState === 'SYNCED' ? new Date().toISOString() : null,
          last_sync_error: dmsError?.slice(0, 2000) ?? null,
          enterprise_metadata: link.enterprise_metadata ?? null,
        })
        .select('id').single()
      if (linkErr) throw linkErr
      linkId = linkRow.id
    } catch (e) {
      console.error('[core-dms-upload] failed to create lg_document_link', e)
    }
  }

  await logAudit(supabase, {
    correlation_id: correlationId, user_id: userId, user_code: userCode,
    action: 'core_doc_upload_success',
    entity_type: genDoc ? 'core_generated_document' : 'raw_file',
    entity_id: genDoc?.id ?? null,
    payload: { provider: storageProvider, sync_state: syncState, storage_ref: storageRef,
               dms_document_id: dmsDocumentId, link_id: linkId, dms_error: dmsError },
  })

  return json({
    success: true,
    correlation_id: correlationId,
    generated_document_id: genDoc?.id ?? null,
    storage_provider: storageProvider,
    storage_ref: storageRef,
    signed_url: signedUrl,
    sync_state: syncState,
    dms_document_id: dmsDocumentId,
    dms_file_id: dmsFileId,
    dms_url: dmsUrl,
    dms_upload_error: dmsError,
    file_name: fileName,
    mime_type: mimeType,
    size_bytes: fileBytes.byteLength,
    link_id: linkId,
  })
})
