import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface SingleTransferRequest {
  documentId: string
  ssn: string
  userCode: string
  correlationId?: string
}

// ========== Utility helpers ==========

function safeSnippet(text: string, maxLen = 1000): string {
  if (!text) return ''
  return text.length > maxLen ? text.substring(0, maxLen) + '...[truncated]' : text
}

function sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
  const safe: Record<string, string> = {}
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase().includes('key') || key.toLowerCase().includes('secret') || key.toLowerCase().includes('token') || key.toLowerCase().includes('authorization')) {
      safe[key] = `***${value.slice(-4)}`
    } else {
      safe[key] = value
    }
  }
  return safe
}

/** Safely extract a readable message from any error-like object */
function extractErrorMessage(err: unknown): string {
  if (!err) return 'unknown error'
  if (typeof err === 'string') return err
  if (typeof err === 'object') {
    // First try JSON.stringify - captures Supabase StorageError properties that are non-enumerable via getters
    let serialized = ''
    try { serialized = JSON.stringify(err) } catch { /* ignore */ }

    // If it's a Supabase storage error, parse the serialized form
    if (serialized && serialized !== '{}') {
      try {
        const parsed = JSON.parse(serialized)
        if (parsed.__isStorageError || parsed.name?.includes('Storage')) {
          return `${parsed.name || 'StorageError'}${parsed.statusCode ? ` (status ${parsed.statusCode})` : ''}: ${parsed.message || serialized}`
        }
      } catch { /* ignore parse errors */ }
    }

    // Standard Error objects
    if (err instanceof Error) return err.message || String(err)

    const obj = err as Record<string, unknown>
    if (obj.message && typeof obj.message === 'string') return obj.message
    if (obj.error && typeof obj.error === 'string') return obj.error

    // Return serialized if available, otherwise stringify
    if (serialized && serialized !== '{}') return serialized
    return String(err)
  }
  return String(err)
}

// ========== Custom error class ==========

class DmsTransferError extends Error {
  httpStatus: number | null
  responseSnippet: string | null
  errorType: string
  constructor(message: string, errorType: string, httpStatus: number | null, responseSnippet: string | null) {
    super(message)
    this.name = 'DmsTransferError'
    this.errorType = errorType
    this.httpStatus = httpStatus
    this.responseSnippet = responseSnippet
  }
}

// ========== Logging helpers ==========

interface LogApiCallParams {
  correlationId: string; userId: string; userCode: string
  apiName: string; endpointUrl: string; httpMethod: string
  responseStatus: number | null; durationMs: number; isSuccess: boolean
  errorMessage: string | null; module: string
  entityType?: string; entityId?: string
  requestHeaders?: any; requestPayload?: any; responseBody?: any
}

async function logApiCall(supabase: any, p: LogApiCallParams) {
  try {
    await supabase.from('api_logs').insert({
      api_name: p.apiName,
      correlation_id: p.correlationId,
      endpoint_url: p.endpointUrl,
      http_method: p.httpMethod,
      response_status: p.responseStatus,
      duration_ms: p.durationMs,
      is_success: p.isSuccess,
      error_message: p.errorMessage,
      module: p.module,
      related_entity_type: p.entityType || null,
      related_entity_id: p.entityId || null,
      user_id: p.userId || null,
      session_id: null,
      request_headers: p.requestHeaders || null,
      request_payload: p.requestPayload || null,
      response_body: p.responseBody || null,
      execution_timestamp: new Date().toISOString(),
    })
  } catch (e) {
    console.error('[DMS-Single] Failed to write api_log:', e)
  }
}

interface LogErrorParams {
  correlationId: string; userId: string; userCode: string
  ssn?: string
  errorType: string; errorMessage: string; stackTrace?: string | null
  module: string; entityType?: string; entityId?: string; payload?: any
}

async function logError(supabase: any, p: LogErrorParams) {
  try {
    await supabase.from('system_error_logs').insert({
      correlation_id: p.correlationId,
      user_id: p.userId || null,
      error_type: p.errorType,
      error_message: p.errorMessage,
      stack_trace: p.stackTrace || null,
      severity: 'error',
      module: p.module,
      entity_type: p.entityType || null,
      entity_id: p.entityId || null,
      api_name: 'dms-transfer-single',
      payload_json: {
        ...(p.payload || {}),
        ssn: p.ssn,
        user_code: p.userCode,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (e) {
    console.error('[DMS-Single] Failed to write error log:', e)
  }
}

interface LogAuditParams {
  correlationId: string; userId: string; userCode: string
  action: string; entityType: string; entityId?: string
  description?: string; beforeValue?: any; afterValue?: any; payload?: any
}

async function logAudit(supabase: any, p: LogAuditParams) {
  try {
    await supabase.from('system_audit_trail').insert({
      correlation_id: p.correlationId,
      action: p.action,
      entity_type: p.entityType,
      entity_id: p.entityId || null,
      module: 'IP Registration - DMS Transfer (Single)',
      user_id: p.userId || null,
      user_name: p.userCode || 'SYSTEM',
      severity: p.action.includes('failed') || p.action.includes('error') ? 'error' : 'info',
      before_value: p.beforeValue || null,
      after_value: p.afterValue || null,
      payload_json: { ...(p.payload || {}), ...(p.description ? { description: p.description } : {}) },
      timestamp: new Date().toISOString(),
    })
  } catch (e) {
    console.error('[DMS-Single] Failed to write audit log:', e)
  }
}

// ========== Main handler ==========

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const dmsBaseUrl = Deno.env.get('DMS_API_BASE_URL')
  const dmsApiKey = Deno.env.get('DMS_API_KEY')
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // External Supabase project client for downloading applicant documents
  const externalAnonKey = Deno.env.get('EXTERNAL_SUPABASE_ANON_KEY')
  const externalSupabaseUrl = 'https://hekgiuycrjncxalcapfz.supabase.co'
  const externalSupabase = externalAnonKey
    ? createClient(externalSupabaseUrl, externalAnonKey)
    : null

  // Authenticate caller
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token)
  if (claimsError || !claimsData?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const authenticatedUserId = claimsData.user.id

  let correlationId = ''
  let parsedDocumentId = ''
  let parsedSsn = ''
  let parsedUserCode = ''

  try {
    const body: SingleTransferRequest = await req.json()
    const { documentId, ssn, userCode } = body
    correlationId = body.correlationId || crypto.randomUUID()
    parsedDocumentId = documentId || ''
    parsedSsn = ssn || ''
    parsedUserCode = userCode || ''

    // === Validation ===
    if (!documentId || !ssn || !userCode) {
      await logError(supabase, {
        correlationId, userId: authenticatedUserId, userCode: userCode || '',
        ssn: ssn || '',
        errorType: 'ValidationError',
        errorMessage: 'Missing required fields: documentId, ssn, or userCode',
        module: 'DMS Transfer (Single)',
        payload: { documentId, ssn, userCode },
      })
      return new Response(JSON.stringify({ error: 'documentId, ssn, and userCode are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!dmsBaseUrl) {
      await logError(supabase, {
        correlationId, userId: authenticatedUserId, userCode, ssn,
        errorType: 'ConfigurationError',
        errorMessage: 'DMS_API_BASE_URL environment variable not configured',
        module: 'DMS Transfer (Single)',
      })
      return new Response(JSON.stringify({ error: 'DMS_API_BASE_URL not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // === Fetch the document ===
    const { data: doc, error: docError } = await supabase
      .from('ip_application_documents')
      .select('*')
      .eq('id', documentId)
      .eq('ssn', ssn)
      .single()

    if (docError || !doc) {
      const errMsg = `Document not found: ${docError ? extractErrorMessage(docError) : 'no record'}`
      await logError(supabase, {
        correlationId, userId: authenticatedUserId, userCode, ssn,
        errorType: 'DataNotFoundError',
        errorMessage: errMsg,
        module: 'DMS Transfer (Single)',
        entityType: 'ip_application_documents',
        entityId: documentId,
      })
      return new Response(JSON.stringify({ error: 'Document not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // === Prevent re-transfer (idempotency) ===
    if (doc.transfer_status === 'Transferred' && doc.dms_document_id) {
      await logAudit(supabase, {
        correlationId, userId: authenticatedUserId, userCode,
        action: 'dms_single_transfer_skipped',
        entityType: 'ip_application_documents',
        entityId: doc.id,
        description: 'Document already transferred, skipping',
        payload: { ssn, dms_document_id: doc.dms_document_id },
      })
      return new Response(JSON.stringify({
        success: true,
        message: 'Document already transferred',
        dmsDocumentId: doc.dms_document_id,
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const transferRequestId = crypto.randomUUID()

    // === Log: Transfer initiated ===
    await logAudit(supabase, {
      correlationId, userId: authenticatedUserId, userCode,
      action: 'dms_single_transfer_initiated',
      entityType: 'ip_application_documents',
      entityId: doc.id,
      description: `Single document DMS transfer initiated for SSN ${ssn}`,
      beforeValue: { transfer_status: doc.transfer_status },
      afterValue: { transfer_status: 'InProgress' },
      payload: {
        ssn,
        document_id: doc.id,
        document_type: doc.document_type,
        document_name: doc.document_name,
        file_path: doc.file_path,
        file_name: doc.file_name,
        current_transfer_status: doc.transfer_status,
        transfer_request_id: transferRequestId,
        transfer_attempts: (doc.transfer_attempts || 0) + 1,
      },
    })

    // === Mark as InProgress ===
    await supabase
      .from('ip_application_documents')
      .update({
        transfer_status: 'InProgress',
        transfer_attempted_at: new Date().toISOString(),
        transfer_attempts: (doc.transfer_attempts || 0) + 1,
        transfer_request_id: transferRequestId,
      })
      .eq('id', doc.id)

    // === STEP 1: Download the file ===
    // Files may reside on an external Supabase project. Try multiple strategies:
    // 1. Construct a public URL from the signed_url (most reliable for external storage)
    // 2. Try the signed_url directly (may be expired)
    // 3. Fall back to local storage download
    const storagePath = doc.file_path
    const downloadStart = Date.now()
    let fileBlob: Blob | null = null
    let downloadSource = ''

    // Helper: build public URL from a signed URL by replacing /object/sign/ with /object/public/ and stripping token
    function buildPublicUrl(signedUrl: string): string | null {
      try {
        const url = new URL(signedUrl)
        if (url.pathname.includes('/object/sign/')) {
          url.pathname = url.pathname.replace('/object/sign/', '/object/public/')
          url.search = '' // remove token
          return url.toString()
        }
      } catch { /* ignore */ }
      return null
    }

    // Helper: attempt fetch from a URL, return blob or null
    async function tryFetchUrl(url: string, method: string): Promise<Blob | null> {
      try {
        downloadSource = url.substring(0, 500)
        const resp = await fetch(url, { signal: AbortSignal.timeout(30000) })
        const dlMs = Date.now() - downloadStart

        await logApiCall(supabase, {
          correlationId, userId: authenticatedUserId, userCode,
          apiName: 'dms_single_file_download',
          endpointUrl: downloadSource,
          httpMethod: 'GET',
          responseStatus: resp.status,
          durationMs: dlMs,
          isSuccess: resp.ok,
          errorMessage: resp.ok ? null : `HTTP ${resp.status} ${resp.statusText}`,
          module: 'DMS Transfer (Single)',
          entityType: 'ip_application_documents',
          entityId: doc.id,
          requestPayload: { ssn, document_id: doc.id, document_name: doc.document_name, method },
          responseBody: resp.ok
            ? { content_length: resp.headers.get('content-length') }
            : { status: resp.status, statusText: resp.statusText },
        })

        if (resp.ok) return await resp.blob()
        // Consume body to avoid leak
        await resp.text()
        return null
      } catch (e) {
        console.error(`[DMS-Single] Fetch failed (${method}):`, e)
        return null
      }
    }

    try {
      // Strategy 0: Use external Supabase client to download from the external project's storage
      if (!fileBlob && externalSupabase && storagePath) {
        const extBucket = 'applicant-documents'
        downloadSource = `external-storage://${extBucket}/${storagePath}`
        const { data: extData, error: extError } = await externalSupabase
          .storage
          .from(extBucket)
          .download(storagePath)

        const dlMs = Date.now() - downloadStart
        const extErrorMsg = extError ? extractErrorMessage(extError) : null

        await logApiCall(supabase, {
          correlationId, userId: authenticatedUserId, userCode,
          apiName: 'dms_single_file_download',
          endpointUrl: downloadSource,
          httpMethod: 'GET',
          responseStatus: extError ? 400 : 200,
          durationMs: dlMs,
          isSuccess: !extError && !!extData,
          errorMessage: extErrorMsg,
          module: 'DMS Transfer (Single)',
          entityType: 'ip_application_documents',
          entityId: doc.id,
          requestPayload: { ssn, document_id: doc.id, document_name: doc.document_name, file_path: storagePath, method: 'external_supabase_client' },
          responseBody: extError ? { error: extErrorMsg } : { size: extData?.size },
        })

        if (!extError && extData) {
          fileBlob = extData
        }
      }

      // Strategy 1: Build public URL from signed_url
      if (!fileBlob && doc.signed_url) {
        const publicUrl = buildPublicUrl(doc.signed_url)
        if (publicUrl) {
          fileBlob = await tryFetchUrl(publicUrl, 'public_url_from_signed')
        }
      }

      // Strategy 2: Try the signed_url directly (may still be valid)
      if (!fileBlob && doc.signed_url) {
        fileBlob = await tryFetchUrl(doc.signed_url, 'signed_url_direct')
      }

      // Strategy 3: Try the url field
      if (!fileBlob && doc.url) {
        fileBlob = await tryFetchUrl(doc.url, 'url_direct')
      }

      // Strategy 4: Try local Supabase Storage
      if (!fileBlob && storagePath) {
        const storageBucket = 'ip-documents'
        downloadSource = `storage://${storageBucket}/${storagePath}`
        const { data: storageData, error: storageError } = await supabase
          .storage
          .from(storageBucket)
          .download(storagePath)

        const dlMs = Date.now() - downloadStart
        const storageErrorMsg = storageError ? extractErrorMessage(storageError) : null

        await logApiCall(supabase, {
          correlationId, userId: authenticatedUserId, userCode,
          apiName: 'dms_single_file_download',
          endpointUrl: downloadSource,
          httpMethod: 'GET',
          responseStatus: storageError ? 400 : 200,
          durationMs: dlMs,
          isSuccess: !storageError && !!storageData,
          errorMessage: storageErrorMsg,
          module: 'DMS Transfer (Single)',
          entityType: 'ip_application_documents',
          entityId: doc.id,
          requestPayload: { ssn, document_id: doc.id, document_name: doc.document_name, file_path: storagePath, method: 'local_storage_download' },
          responseBody: storageError
            ? { error: storageErrorMsg }
            : { size: storageData?.size },
        })

        if (!storageError && storageData) {
          fileBlob = storageData
        }
      }

      // No strategy worked
      if (!fileBlob) {
        const errMsg = `All download strategies failed for document ${doc.id}. file_path=${storagePath}, has_signed_url=${!!doc.signed_url}, has_url=${!!doc.url}`
        await logError(supabase, {
          correlationId, userId: authenticatedUserId, userCode, ssn,
          errorType: 'FileDownloadError',
          errorMessage: errMsg,
          module: 'DMS Transfer (Single)',
          entityType: 'ip_application_documents',
          entityId: doc.id,
          payload: { file_path: storagePath, signed_url: doc.signed_url?.substring(0, 200), url: doc.url?.substring(0, 200) },
        })
        throw new DmsTransferError(errMsg, 'FileDownloadError', null, null)
      }

      if (fileBlob.size === 0) {
        throw new DmsTransferError('Downloaded file is empty (0 bytes)', 'EmptyFile', null, null)
      }
    } catch (dlErr) {
      if (dlErr instanceof DmsTransferError) throw dlErr
      const errMsg = dlErr instanceof Error ? dlErr.message : String(dlErr)

      await logApiCall(supabase, {
        correlationId, userId: authenticatedUserId, userCode,
        apiName: 'dms_single_file_download',
        endpointUrl: downloadSource || 'unknown',
        httpMethod: 'GET',
        responseStatus: null,
        durationMs: Date.now() - downloadStart,
        isSuccess: false,
        errorMessage: errMsg,
        module: 'DMS Transfer (Single)',
        entityType: 'ip_application_documents',
        entityId: doc.id,
        requestPayload: { ssn, document_id: doc.id },
        responseBody: null,
      })

      throw new DmsTransferError(
        `File download failed: ${errMsg}`,
        'FileDownloadNetworkError', null, null
      )
    }

    // === STEP 2: Build and send DMS request ===
    const downloadedContentType = fileBlob.type || doc.mime_type || 'application/octet-stream'
    let fileName = doc.file_name || doc.document_name || ''
    if (!fileName) {
      const extMap: Record<string, string> = {
        'application/pdf': '.pdf', 'image/jpeg': '.jpg', 'image/png': '.png',
        'image/gif': '.gif', 'image/webp': '.webp', 'application/msword': '.doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
        'text/plain': '.txt',
      }
      const ext = extMap[downloadedContentType] || '.bin'
      fileName = `${ssn}_${doc.id.substring(0, 8)}${ext}`
    }

    const referenceId = doc.source_document_id || doc.id
    const entryFields = JSON.stringify({
      Document_Type: doc.document_type || 'General',
      Reference_ID: referenceId,
      Uploaded_By: userCode,
      Uploaded_Date: new Date().toISOString().split('T')[0],
      SSN: ssn,
    })

    const formData = new FormData()
    formData.append('File', new File([fileBlob], fileName, { type: downloadedContentType }))
    formData.append('CategoryId', 'PPIP')
    formData.append('UserName', userCode)
    formData.append('EntryFields', entryFields)

    const dmsHeaders: Record<string, string> = {}
    if (dmsApiKey) dmsHeaders['x-api-key'] = dmsApiKey

    // DMS_API_BASE_URL may already include the full path (e.g. https://host/api/Dms/files)
    const dmsEndpoint = dmsBaseUrl.replace(/\/+$/, '').endsWith('/api/Dms/files')
      ? dmsBaseUrl.replace(/\/+$/, '')
      : `${dmsBaseUrl.replace(/\/+$/, '')}/api/Dms/files`

    // Audit: DMS upload attempt
    await logAudit(supabase, {
      correlationId, userId: authenticatedUserId, userCode,
      action: 'dms_single_upload_attempt',
      entityType: 'ip_application_documents',
      entityId: doc.id,
      payload: {
        ssn, document_name: doc.document_name, document_type: doc.document_type,
        reference_id: referenceId, file_name: fileName, file_size: fileBlob.size,
        content_type: downloadedContentType, category_id: 'PPIP',
        dms_endpoint: dmsEndpoint, transfer_request_id: transferRequestId,
        entry_fields: entryFields,
      },
    })

    const dmsStart = Date.now()
    let dmsResponse: Response
    let dmsResponseText = ''
    let dmsResponseJson: any = null
    let dmsHttpStatus: number | null = null

    const DMS_TIMEOUT_MS = 120000 // 2 minutes
    const MAX_DMS_RETRIES = 1

    try {
      let lastFetchErr: unknown = null
      for (let attempt = 0; attempt <= MAX_DMS_RETRIES; attempt++) {
        try {
          // Rebuild FormData for retry (body is consumed after first attempt)
          const retryFormData = new FormData()
          retryFormData.append('File', new File([fileBlob], fileName, { type: downloadedContentType }))
          retryFormData.append('CategoryId', 'PPIP')
          retryFormData.append('UserName', userCode)
          retryFormData.append('EntryFields', entryFields)

          dmsResponse = await fetch(dmsEndpoint, {
            method: 'POST',
            headers: dmsHeaders,
            body: retryFormData,
            signal: AbortSignal.timeout(DMS_TIMEOUT_MS),
          })
          lastFetchErr = null
          break // success – exit retry loop
        } catch (fetchErr) {
          lastFetchErr = fetchErr
          const isTimeout = fetchErr instanceof Error && fetchErr.message.includes('timed out')
          if (!isTimeout || attempt >= MAX_DMS_RETRIES) break // only retry timeouts
          // Wait 2s before retry
          await new Promise(r => setTimeout(r, 2000))
        }
      }
      if (lastFetchErr) throw lastFetchErr
      dmsHttpStatus = dmsResponse.status
      dmsResponseText = await dmsResponse.text()

      try { dmsResponseJson = JSON.parse(dmsResponseText) } catch { dmsResponseJson = { raw: safeSnippet(dmsResponseText) } }

      // Always log the DMS API call
      await logApiCall(supabase, {
        correlationId, userId: authenticatedUserId, userCode,
        apiName: 'dms_single_upload',
        endpointUrl: dmsEndpoint,
        httpMethod: 'POST',
        responseStatus: dmsHttpStatus,
        durationMs: Date.now() - dmsStart,
        isSuccess: dmsResponse.ok,
        errorMessage: dmsResponse.ok ? null : `DMS returned HTTP ${dmsHttpStatus}`,
        module: 'DMS Transfer (Single)',
        entityType: 'ip_application_documents',
        entityId: doc.id,
        requestHeaders: sanitizeHeaders(dmsHeaders),
        requestPayload: {
          CategoryId: 'PPIP', UserName: userCode, EntryFields: entryFields,
          FileName: fileName, FileSize: fileBlob.size,
          MimeType: downloadedContentType,
          ssn, transfer_request_id: transferRequestId,
        },
        responseBody: { status: dmsHttpStatus, body: safeSnippet(dmsResponseText) },
      })

      if (!dmsResponse.ok) {
        throw new DmsTransferError(
          `DMS API returned HTTP ${dmsHttpStatus}: ${safeSnippet(dmsResponseText, 500)}`,
          'DmsApiError', dmsHttpStatus, safeSnippet(dmsResponseText)
        )
      }
    } catch (dmsErr) {
      if (dmsErr instanceof DmsTransferError) throw dmsErr
      const errMsg = dmsErr instanceof Error ? dmsErr.message : String(dmsErr)

      await logApiCall(supabase, {
        correlationId, userId: authenticatedUserId, userCode,
        apiName: 'dms_single_upload',
        endpointUrl: dmsEndpoint,
        httpMethod: 'POST',
        responseStatus: null,
        durationMs: Date.now() - dmsStart,
        isSuccess: false,
        errorMessage: `Network/timeout error: ${errMsg}`,
        module: 'DMS Transfer (Single)',
        entityType: 'ip_application_documents',
        entityId: doc.id,
        requestPayload: { CategoryId: 'PPIP', UserName: userCode, ssn, transfer_request_id: transferRequestId },
        responseBody: null,
      })

      throw new DmsTransferError(
        `DMS API call failed: ${errMsg}`,
        'DmsNetworkError', null, null
      )
    }

    // === STEP 3: Mark as Transferred ===
    const dmsDocId = dmsResponseJson?.documentId
      || dmsResponseJson?.DocumentId
      || dmsResponseJson?.id
      || dmsResponseJson?.Id
      || dmsResponseJson?.data?.documentId
      || null

    await supabase
      .from('ip_application_documents')
      .update({
        transfer_status: 'Transferred',
        dms_document_id: dmsDocId ? String(dmsDocId) : null,
        transferred_at: new Date().toISOString(),
        transferred_by: userCode,
        transfer_error: null,
        transfer_http_status: dmsHttpStatus,
        transfer_response_snippet: safeSnippet(dmsResponseText),
        transfer_request_id: transferRequestId,
      })
      .eq('id', doc.id)

    // Audit: success
    await logAudit(supabase, {
      correlationId, userId: authenticatedUserId, userCode,
      action: 'dms_single_upload_success',
      entityType: 'ip_application_documents',
      entityId: doc.id,
      beforeValue: { transfer_status: 'InProgress' },
      afterValue: { transfer_status: 'Transferred', dms_document_id: dmsDocId },
      payload: {
        ssn, document_name: doc.document_name,
        http_status: dmsHttpStatus, transfer_request_id: transferRequestId,
      },
    })

    return new Response(JSON.stringify({
      success: true,
      message: 'Document transferred successfully',
      dmsDocumentId: dmsDocId ? String(dmsDocId) : null,
      documentId: doc.id,
      correlationId,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    const httpStatus = err instanceof DmsTransferError ? err.httpStatus : null
    const responseSnippet = err instanceof DmsTransferError ? err.responseSnippet : null
    const errorType = err instanceof DmsTransferError ? err.errorType : 'UnexpectedError'

    console.error('DMS single transfer error:', errMsg)

    // Use hoisted variables (no need to re-read body)
    try {
      if (parsedDocumentId) {
        await supabase
          .from('ip_application_documents')
          .update({
            transfer_status: 'Failed',
            transfer_error: errMsg.substring(0, 2000),
            transfer_http_status: httpStatus,
            transfer_response_snippet: responseSnippet,
          })
          .eq('id', parsedDocumentId)
      }

      await logError(supabase, {
        correlationId: correlationId || crypto.randomUUID(),
        userId: authenticatedUserId,
        userCode: parsedUserCode,
        ssn: parsedSsn,
        errorType,
        errorMessage: errMsg,
        stackTrace: err instanceof Error ? err.stack || null : null,
        module: 'DMS Transfer (Single)',
        entityType: 'ip_application_documents',
        entityId: parsedDocumentId || null,
        payload: {
          document_id: parsedDocumentId,
          http_status: httpStatus,
          response_snippet: responseSnippet,
          error_type: errorType,
        },
      })

      await logAudit(supabase, {
        correlationId: correlationId || crypto.randomUUID(),
        userId: authenticatedUserId,
        userCode: parsedUserCode,
        action: 'dms_single_upload_failed',
        entityType: 'ip_application_documents',
        entityId: parsedDocumentId,
        beforeValue: { transfer_status: 'InProgress' },
        afterValue: { transfer_status: 'Failed', transfer_error: errMsg.substring(0, 500) },
        payload: {
          ssn: parsedSsn,
          error_type: errorType,
          http_status: httpStatus,
        },
      })
    } catch (logErr) {
      console.error('[DMS-Single] Failed to write failure logs:', logErr)
    }

    return new Response(JSON.stringify({ error: errMsg, correlationId }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
