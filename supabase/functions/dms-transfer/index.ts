import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface DmsTransferRequest {
  ssn: string
  userCode: string
  userId: string
  ipMasterUniqueUuid: string
  correlationId?: string
}

interface DocumentTransferResult {
  documentId: string
  documentName: string | null
  success: boolean
  dmsDocumentId: string | null
  error: string | null
  httpStatus: number | null
  transferRequestId: string
}

// Generate a unique request ID for each document transfer attempt
function generateRequestId(): string {
  return crypto.randomUUID()
}

// Truncate response body to safe snippet length for storage
function safeSnippet(text: string, maxLen = 1000): string {
  if (!text) return ''
  return text.length > maxLen ? text.substring(0, maxLen) + '...[truncated]' : text
}

/** Safely extract a readable message from any error-like object (incl. Supabase StorageError) */
function extractErrorMessage(err: unknown): string {
  if (!err) return 'unknown error'
  if (typeof err === 'string') return err
  if (typeof err === 'object') {
    let serialized = ''
    try { serialized = JSON.stringify(err) } catch { /* ignore */ }
    if (serialized && serialized !== '{}') {
      try {
        const parsed = JSON.parse(serialized)
        if (parsed.__isStorageError || parsed.name?.includes('Storage')) {
          return `${parsed.name || 'StorageError'}${parsed.statusCode ? ` (status ${parsed.statusCode})` : ''}: ${parsed.message || serialized}`
        }
      } catch { /* ignore */ }
    }
    if (err instanceof Error) return err.message || String(err)
    const obj = err as Record<string, unknown>
    if (obj.message && typeof obj.message === 'string') return obj.message
    if (obj.error && typeof obj.error === 'string') return obj.error
    if (serialized && serialized !== '{}') return serialized
    return String(err)
  }
  return String(err)
}

// Sanitize headers for logging - remove sensitive values
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Fetch DMS config from api_settings table (setting_key = 'dms_service')
  let dmsBaseUrl: string | null = Deno.env.get('DMS_API_BASE_URL') || null
  let dmsApiKey: string | null = Deno.env.get('DMS_API_KEY') || null
  let dmsHeaderName: string = 'x-api-key' // default fallback

  try {
    const { data: dmsConfig, error: dmsConfigError } = await supabase
      .from('api_settings')
      .select('base_url, api_key, header_name, is_active')
      .eq('setting_key', 'dms_service')
      .single()

    if (!dmsConfigError && dmsConfig && dmsConfig.is_active) {
      if (dmsConfig.base_url) dmsBaseUrl = dmsConfig.base_url
      if (dmsConfig.api_key) dmsApiKey = dmsConfig.api_key
      if (dmsConfig.header_name) dmsHeaderName = dmsConfig.header_name
      console.log('[DMS] Using api_settings config: header=' + dmsHeaderName)
    } else {
      console.log('[DMS] api_settings dms_service not found or inactive, falling back to env vars')
    }
  } catch (e) {
    console.error('[DMS] Failed to fetch api_settings, using env vars:', e)
  }

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

  // Master correlation ID for this entire transfer batch
  let correlationId: string

  try {
    const body: DmsTransferRequest = await req.json()
    const { ssn, userCode, userId, ipMasterUniqueUuid } = body
    correlationId = body.correlationId || crypto.randomUUID()

    if (!ssn || !userCode) {
      return new Response(JSON.stringify({ error: 'ssn and userCode are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!dmsBaseUrl) {
      // Log configuration error
      await logError(supabase, {
        correlationId, userId, userCode, ssn, ipMasterUniqueUuid,
        errorType: 'ConfigurationError',
        errorMessage: 'DMS_API_BASE_URL environment variable not configured',
        module: 'DMS Transfer',
      })
      return new Response(JSON.stringify({ error: 'DMS_API_BASE_URL not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify ip_master status is actually "V"
    const { data: ipRecord, error: ipError } = await supabase
      .from('ip_master')
      .select('ssn, status, unique_uuid')
      .eq('unique_uuid', ipMasterUniqueUuid)
      .single()

    if (ipError || !ipRecord) {
      await logError(supabase, {
        correlationId, userId, userCode, ssn, ipMasterUniqueUuid,
        errorType: 'DataNotFoundError',
        errorMessage: `IP master record not found: ${ipError?.message || 'no record'}`,
        module: 'DMS Transfer',
      })
      return new Response(JSON.stringify({ error: 'IP master record not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (ipRecord.status !== 'V') {
      await logAudit(supabase, {
        correlationId, userId, userCode,
        action: 'dms_transfer_skipped',
        entityType: 'ip_master',
        entityId: ipMasterUniqueUuid,
        description: `IP master status is "${ipRecord.status}", not "V". DMS transfer skipped.`,
        payload: { ssn, status: ipRecord.status },
      })
      return new Response(JSON.stringify({
        error: `IP master status is "${ipRecord.status}", not "V". DMS transfer skipped.`,
        skipped: true,
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Audit: ip_master verified, transfer initiated
    await logAudit(supabase, {
      correlationId, userId, userCode,
      action: 'dms_transfer_initiated',
      entityType: 'ip_master',
      entityId: ipMasterUniqueUuid,
      description: `DMS transfer initiated for SSN ${ssn}`,
      beforeValue: null,
      afterValue: { status: 'V', ssn },
      payload: { ssn, trigger: 'ip_master_verified', correlation_id: correlationId },
    })

    // Fetch pending documents (not already Transferred)
    const { data: documents, error: docError } = await supabase
      .from('ip_application_documents')
      .select('*')
      .eq('ssn', ssn)
      .in('transfer_status', ['Pending', 'Failed'])

    if (docError) {
      await logError(supabase, {
        correlationId, userId, userCode, ssn, ipMasterUniqueUuid,
        errorType: 'DatabaseError',
        errorMessage: `Failed to fetch documents: ${docError.message}`,
        module: 'DMS Transfer',
      })
      throw new Error(`Failed to fetch documents: ${docError.message}`)
    }

    if (!documents || documents.length === 0) {
      await logAudit(supabase, {
        correlationId, userId, userCode,
        action: 'dms_transfer_no_documents',
        entityType: 'ip_master',
        entityId: ipMasterUniqueUuid,
        description: `No pending/failed documents found for SSN ${ssn}`,
        payload: { ssn },
      })
      return new Response(JSON.stringify({
        success: true,
        message: 'No pending documents to transfer',
        correlationId,
        results: [],
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const results: DocumentTransferResult[] = []
    // DMS_API_BASE_URL may already include the full path (e.g. https://host/api/Dms/files)
    const dmsEndpoint = dmsBaseUrl.replace(/\/+$/, '').endsWith('/api/Dms/files')
      ? dmsBaseUrl.replace(/\/+$/, '')
      : `${dmsBaseUrl.replace(/\/+$/, '')}/api/Dms/files`

    for (const doc of documents) {
      const transferRequestId = generateRequestId()
      const docResult: DocumentTransferResult = {
        documentId: doc.id,
        documentName: doc.document_name || doc.file_name,
        success: false,
        dmsDocumentId: null,
        error: null,
        httpStatus: null,
        transferRequestId,
      }

      try {
        // Skip if already has a DMS id (idempotency guard)
        if (doc.dms_document_id) {
          docResult.success = true
          docResult.dmsDocumentId = doc.dms_document_id
          docResult.error = 'Already transferred (dms_document_id exists), skipping'
          results.push(docResult)
          continue
        }

        // Mark as InProgress
        await supabase
          .from('ip_application_documents')
          .update({
            transfer_status: 'InProgress',
            transfer_attempted_at: new Date().toISOString(),
            transfer_attempts: (doc.transfer_attempts || 0) + 1,
            transfer_request_id: transferRequestId,
          })
          .eq('id', doc.id)

        // Audit: status transition to InProgress
        await logAudit(supabase, {
          correlationId, userId, userCode,
          action: 'dms_document_status_change',
          entityType: 'ip_application_documents',
          entityId: doc.id,
          beforeValue: { transfer_status: doc.transfer_status },
          afterValue: { transfer_status: 'InProgress' },
          payload: { ssn, transfer_request_id: transferRequestId, attempt: (doc.transfer_attempts || 0) + 1 },
        })

        // === STEP 1: Download the file ===
        // Files may reside on an external Supabase project. Try multiple strategies:
        // 1. Public URL derived from signed_url (most reliable for external storage)
        // 2. signed_url directly (may be expired)
        // 3. url field
        // 4. Local Supabase Storage
        const storagePath = doc.file_path
        const downloadStart = Date.now()
        let fileBlob: Blob | null = null
        let downloadStatus: number = 0
        let downloadContentLength: string | null = null
        let downloadSource: string = ''

        function buildPublicUrl(signedUrl: string): string | null {
          try {
            const url = new URL(signedUrl)
            if (url.pathname.includes('/object/sign/')) {
              url.pathname = url.pathname.replace('/object/sign/', '/object/public/')
              url.search = ''
              return url.toString()
            }
          } catch { /* ignore */ }
          return null
        }

        async function tryFetchUrl(url: string, method: string): Promise<Blob | null> {
          try {
            downloadSource = url.substring(0, 500)
            const resp = await fetch(url, { signal: AbortSignal.timeout(30000) })
            downloadStatus = resp.status
            downloadContentLength = resp.headers.get('content-length')

            await logApiCall(supabase, {
              correlationId, userId, userCode,
              apiName: 'dms_file_download',
              endpointUrl: downloadSource,
              httpMethod: 'GET',
              responseStatus: resp.status,
              durationMs: Date.now() - downloadStart,
              isSuccess: resp.ok,
              errorMessage: resp.ok ? null : `HTTP ${resp.status} ${resp.statusText}`,
              module: 'DMS Transfer',
              entityType: 'ip_application_documents',
              entityId: doc.id,
              requestPayload: { ssn, document_id: doc.id, document_name: doc.document_name, method },
              responseBody: resp.ok ? { content_length: downloadContentLength } : { status: resp.status, statusText: resp.statusText },
            })

            if (resp.ok) return await resp.blob()
            await resp.text()
            return null
          } catch (e) {
            console.error(`[DMS] Fetch failed (${method}):`, e)
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

            downloadStatus = extError ? 400 : 200
            const extErrorMsg = extError ? extractErrorMessage(extError) : null

            await logApiCall(supabase, {
              correlationId, userId, userCode,
              apiName: 'dms_file_download',
              endpointUrl: downloadSource,
              httpMethod: 'GET',
              responseStatus: downloadStatus,
              durationMs: Date.now() - downloadStart,
              isSuccess: !extError && !!extData,
              errorMessage: extErrorMsg,
              module: 'DMS Transfer',
              entityType: 'ip_application_documents',
              entityId: doc.id,
              requestPayload: { ssn, document_id: doc.id, document_name: doc.document_name, file_path: storagePath, method: 'external_supabase_client' },
              responseBody: extError ? { error: extErrorMsg } : { size: extData?.size },
            })

            if (!extError && extData) {
              fileBlob = extData
              downloadContentLength = String(extData.size)
            }
          }

          // Strategy 1: Public URL from signed_url
          if (!fileBlob && doc.signed_url) {
            const publicUrl = buildPublicUrl(doc.signed_url)
            if (publicUrl) {
              fileBlob = await tryFetchUrl(publicUrl, 'public_url_from_signed')
            }
          }

          // Strategy 2: signed_url directly
          if (!fileBlob && doc.signed_url) {
            fileBlob = await tryFetchUrl(doc.signed_url, 'signed_url_direct')
          }

          // Strategy 3: url field
          if (!fileBlob && doc.url) {
            fileBlob = await tryFetchUrl(doc.url, 'url_direct')
          }

          // Strategy 4: Local storage
          if (!fileBlob && storagePath) {
            const storageBucket = 'ip-documents'
            downloadSource = `storage://${storageBucket}/${storagePath}`
            const { data: storageData, error: storageError } = await supabase
              .storage
              .from(storageBucket)
              .download(storagePath)

            downloadStatus = storageError ? 400 : 200
            const storageErrorMsg = storageError ? extractErrorMessage(storageError) : null

            await logApiCall(supabase, {
              correlationId, userId, userCode,
              apiName: 'dms_file_download',
              endpointUrl: downloadSource,
              httpMethod: 'GET',
              responseStatus: downloadStatus,
              durationMs: Date.now() - downloadStart,
              isSuccess: !storageError && !!storageData,
              errorMessage: storageErrorMsg,
              module: 'DMS Transfer',
              entityType: 'ip_application_documents',
              entityId: doc.id,
              requestPayload: { ssn, document_id: doc.id, document_name: doc.document_name, method: 'local_storage_download' },
              responseBody: storageError ? { error: storageErrorMsg } : { size: storageData?.size },
            })

            if (!storageError && storageData) {
              fileBlob = storageData
              downloadContentLength = String(storageData.size)
            }
          }

          if (!fileBlob) {
            throw new DmsTransferError(
              `All download strategies failed for document ${doc.id}. file_path=${storagePath}, has_signed_url=${!!doc.signed_url}, has_url=${!!doc.url}`,
              'FileDownloadError', null, null
            )
          }

          if (fileBlob.size === 0) {
            throw new DmsTransferError('Downloaded file is empty (0 bytes)', 'EmptyFile', downloadStatus, null)
          }
        } catch (dlErr) {
          if (dlErr instanceof DmsTransferError) throw dlErr
          const errMsg = dlErr instanceof Error ? dlErr.message : String(dlErr)
          await logApiCall(supabase, {
            correlationId, userId, userCode,
            apiName: 'dms_file_download',
            endpointUrl: downloadSource || 'unknown',
            httpMethod: 'GET',
            responseStatus: null,
            durationMs: Date.now() - downloadStart,
            isSuccess: false,
            errorMessage: errMsg,
            module: 'DMS Transfer',
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

        // === STEP 2: Build DMS request ===
        // Derive content type from download response or stored value
        const downloadedContentType = fileBlob.type || doc.mime_type || 'application/octet-stream'

        // Derive filename: prefer stored name, fallback to SSN + doc ID + extension from content-type/URL
        let fileName = doc.file_name || doc.document_name || ''
        if (!fileName) {
          // Try to extract extension from content type
          const extMap: Record<string, string> = {
            'application/pdf': '.pdf',
            'image/jpeg': '.jpg',
            'image/png': '.png',
            'image/gif': '.gif',
            'image/webp': '.webp',
            'application/msword': '.doc',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
            'application/vnd.ms-excel': '.xls',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
            'text/plain': '.txt',
            'application/zip': '.zip',
          }
          let ext = extMap[downloadedContentType] || ''
          if (!ext && fileUrl) {
            // Try to extract extension from URL path
            try {
              const urlPath = new URL(fileUrl).pathname
              const urlExt = urlPath.match(/\.[a-zA-Z0-9]{1,10}$/)?.[0]
              if (urlExt) ext = urlExt
            } catch { /* ignore URL parse errors */ }
          }
          if (!ext) ext = '.bin'
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
        if (dmsApiKey) {
          dmsHeaders[dmsHeaderName] = dmsApiKey
        }

        // Audit: DMS upload attempt
        await logAudit(supabase, {
          correlationId, userId, userCode,
          action: 'dms_upload_attempt',
          entityType: 'ip_application_documents',
          entityId: doc.id,
          payload: {
            ssn,
            document_name: doc.document_name,
            document_type: doc.document_type,
            reference_id: referenceId,
            file_size: fileBlob.size,
            category_id: 'PPIP',
            dms_endpoint: dmsEndpoint,
            transfer_request_id: transferRequestId,
          },
        })

        // === STEP 3: Call DMS API ===
        const dmsStart = Date.now()
        let dmsResponse: Response
        let dmsResponseText = ''
        let dmsResponseJson: any = null
        let dmsHttpStatus: number | null = null

        try {
          dmsResponse = await fetch(dmsEndpoint, {
            method: 'POST',
            headers: dmsHeaders,
            body: formData,
            signal: AbortSignal.timeout(60000),
          })
          dmsHttpStatus = dmsResponse.status
          dmsResponseText = await dmsResponse.text()

          try {
            dmsResponseJson = JSON.parse(dmsResponseText)
          } catch {
            dmsResponseJson = { raw: safeSnippet(dmsResponseText) }
          }

          // ALWAYS log the DMS API call regardless of success/failure
          await logApiCall(supabase, {
            correlationId, userId, userCode,
            apiName: 'dms_upload',
            endpointUrl: dmsEndpoint,
            httpMethod: 'POST',
            responseStatus: dmsHttpStatus,
            durationMs: Date.now() - dmsStart,
            isSuccess: dmsResponse.ok,
            errorMessage: dmsResponse.ok ? null : `DMS returned HTTP ${dmsHttpStatus}`,
            module: 'DMS Transfer',
            entityType: 'ip_application_documents',
            entityId: doc.id,
            requestHeaders: sanitizeHeaders(dmsHeaders),
            requestPayload: {
              CategoryId: 'PPIP',
              UserName: userCode,
              EntryFields: entryFields,
              FileName: fileName,
              FileSize: fileBlob.size,
              MimeType: doc.mime_type || 'application/octet-stream',
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
          // Network/timeout error calling DMS
          const errMsg = dmsErr instanceof Error ? dmsErr.message : String(dmsErr)
          await logApiCall(supabase, {
            correlationId, userId, userCode,
            apiName: 'dms_upload',
            endpointUrl: dmsEndpoint,
            httpMethod: 'POST',
            responseStatus: null,
            durationMs: Date.now() - dmsStart,
            isSuccess: false,
            errorMessage: `Network/timeout error: ${errMsg}`,
            module: 'DMS Transfer',
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

        // === STEP 4: Extract DMS document ID from response ===
        const dmsDocId = dmsResponseJson?.documentId
          || dmsResponseJson?.DocumentId
          || dmsResponseJson?.id
          || dmsResponseJson?.Id
          || dmsResponseJson?.data?.documentId
          || null

        // Mark document as Transferred
        const { error: updateError } = await supabase
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

        if (updateError) {
          console.error(`Failed to update document ${doc.id} status to Transferred:`, updateError)
        }

        docResult.success = true
        docResult.dmsDocumentId = dmsDocId ? String(dmsDocId) : null
        docResult.httpStatus = dmsHttpStatus

        // Audit: DMS upload success with status transition
        await logAudit(supabase, {
          correlationId, userId, userCode,
          action: 'dms_upload_success',
          entityType: 'ip_application_documents',
          entityId: doc.id,
          beforeValue: { transfer_status: 'InProgress' },
          afterValue: { transfer_status: 'Transferred', dms_document_id: dmsDocId },
          payload: { ssn, document_name: doc.document_name, http_status: dmsHttpStatus, transfer_request_id: transferRequestId },
        })

      } catch (docErr) {
        const errMsg = docErr instanceof Error ? docErr.message : String(docErr)
        const httpStatus = docErr instanceof DmsTransferError ? docErr.httpStatus : null
        const responseSnippet = docErr instanceof DmsTransferError ? docErr.responseSnippet : null
        const errorType = docErr instanceof DmsTransferError ? docErr.errorType : 'UnexpectedError'

        docResult.error = errMsg
        docResult.httpStatus = httpStatus
        console.error(`DMS upload failed for doc ${doc.id}:`, errMsg)

        // Mark as Failed with full error details
        await supabase
          .from('ip_application_documents')
          .update({
            transfer_status: 'Failed',
            transfer_error: errMsg.substring(0, 2000),
            transfer_http_status: httpStatus,
            transfer_response_snippet: responseSnippet,
            transfer_request_id: transferRequestId,
          })
          .eq('id', doc.id)

        // Log to system_error_logs
        await logError(supabase, {
          correlationId, userId, userCode, ssn, ipMasterUniqueUuid,
          errorType,
          errorMessage: errMsg,
          stackTrace: docErr instanceof Error ? docErr.stack || null : null,
          module: 'DMS Transfer',
          entityType: 'ip_application_documents',
          entityId: doc.id,
          payload: {
            document_name: doc.document_name,
            http_status: httpStatus,
            transfer_request_id: transferRequestId,
            transfer_attempts: (doc.transfer_attempts || 0) + 1,
            dms_endpoint: dmsEndpoint,
            response_snippet: responseSnippet,
          },
        })

        // Audit: status transition to Failed
        await logAudit(supabase, {
          correlationId, userId, userCode,
          action: 'dms_upload_failed',
          entityType: 'ip_application_documents',
          entityId: doc.id,
          beforeValue: { transfer_status: 'InProgress' },
          afterValue: { transfer_status: 'Failed', transfer_error: errMsg.substring(0, 500) },
          payload: {
            ssn, document_name: doc.document_name,
            error_type: errorType,
            http_status: httpStatus,
            transfer_request_id: transferRequestId,
            transfer_attempts: (doc.transfer_attempts || 0) + 1,
          },
        })
      }

      results.push(docResult)
    }

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    // Final audit summary
    await logAudit(supabase, {
      correlationId, userId, userCode,
      action: 'dms_transfer_completed',
      entityType: 'ip_master',
      entityId: ipMasterUniqueUuid,
      description: `DMS transfer batch complete: ${successCount} succeeded, ${failCount} failed out of ${documents.length}`,
      payload: {
        ssn,
        total_documents: documents.length,
        success_count: successCount,
        fail_count: failCount,
        dms_endpoint: dmsEndpoint,
        results: results.map(r => ({
          documentId: r.documentId,
          success: r.success,
          dmsDocumentId: r.dmsDocumentId,
          error: r.error ? r.error.substring(0, 300) : null,
          httpStatus: r.httpStatus,
          transferRequestId: r.transferRequestId,
        })),
      },
    })

    return new Response(JSON.stringify({
      success: failCount === 0,
      message: failCount === 0
        ? `All ${successCount} document(s) transferred successfully`
        : `${successCount} transferred, ${failCount} failed`,
      correlationId,
      totalDocuments: documents.length,
      successCount,
      failCount,
      results,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error('DMS transfer top-level error:', errMsg)

    // Log top-level error
    try {
      await logError(supabase, {
        correlationId: correlationId!,
        userId: '', userCode: '', ssn: '', ipMasterUniqueUuid: '',
        errorType: 'UnhandledError',
        errorMessage: errMsg,
        stackTrace: err instanceof Error ? err.stack || null : null,
        module: 'DMS Transfer',
      })
    } catch { /* last resort, don't fail the response */ }

    return new Response(JSON.stringify({ error: errMsg, correlationId: correlationId! }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

// ========== Custom error class for DMS-specific failures ==========
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
      module: 'IP Registration - DMS Transfer',
      user_id: p.userId || null,
      user_name: p.userCode || 'SYSTEM',
      severity: p.action.includes('failed') || p.action.includes('error') ? 'error' : 'info',
      before_value: p.beforeValue || null,
      after_value: p.afterValue || null,
      payload_json: { ...(p.payload || {}), ...(p.description ? { description: p.description } : {}) },
      timestamp: new Date().toISOString(),
    })
  } catch (e) {
    console.error('[DMS] Failed to write audit log:', e)
  }
}

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
    console.error('[DMS] Failed to write api_log:', e)
  }
}

interface LogErrorParams {
  correlationId: string; userId: string; userCode: string
  ssn?: string; ipMasterUniqueUuid?: string
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
      api_name: 'dms-transfer',
      payload_json: {
        ...(p.payload || {}),
        ssn: p.ssn,
        ip_master_uuid: p.ipMasterUniqueUuid,
        user_code: p.userCode,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (e) {
    console.error('[DMS] Failed to write error log:', e)
  }
}
