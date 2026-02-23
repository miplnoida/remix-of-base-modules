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
}

function safeSnippet(text: string, maxLen = 1000): string {
  if (!text) return ''
  return text.length > maxLen ? text.substring(0, maxLen) + '...[truncated]' : text
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const dmsBaseUrl = Deno.env.get('DMS_API_BASE_URL')
  const dmsApiKey = Deno.env.get('DMS_API_KEY')
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

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

  try {
    const body: SingleTransferRequest = await req.json()
    const { documentId, ssn, userCode } = body

    if (!documentId || !ssn || !userCode) {
      return new Response(JSON.stringify({ error: 'documentId, ssn, and userCode are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!dmsBaseUrl) {
      return new Response(JSON.stringify({ error: 'DMS_API_BASE_URL not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch the specific document
    const { data: doc, error: docError } = await supabase
      .from('ip_application_documents')
      .select('*')
      .eq('id', documentId)
      .eq('ssn', ssn)
      .single()

    if (docError || !doc) {
      return new Response(JSON.stringify({ error: 'Document not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Prevent re-transfer
    if (doc.transfer_status === 'Transferred' && doc.dms_document_id) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Document already transferred',
        dmsDocumentId: doc.dms_document_id,
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const transferRequestId = crypto.randomUUID()

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

    // === STEP 1: Download the file ===
    const storagePath = doc.file_path
    const storageBucket = 'applicant-documents'
    let fileBlob: Blob

    try {
      if (storagePath) {
        const { data: storageData, error: storageError } = await supabase
          .storage
          .from(storageBucket)
          .download(storagePath)

        if (storageError || !storageData) {
          throw new Error(`Failed to download from storage: ${storageError?.message || 'no data'}`)
        }
        fileBlob = storageData
      } else {
        const fileUrl = doc.signed_url || doc.url
        if (!fileUrl) {
          throw new Error('No file_path, signed_url, or url available')
        }
        const fileResponse = await fetch(fileUrl, { signal: AbortSignal.timeout(30000) })
        if (!fileResponse.ok) {
          throw new Error(`HTTP ${fileResponse.status} downloading file`)
        }
        fileBlob = await fileResponse.blob()
      }

      if (fileBlob.size === 0) {
        throw new Error('Downloaded file is empty (0 bytes)')
      }
    } catch (dlErr) {
      const errMsg = dlErr instanceof Error ? dlErr.message : String(dlErr)
      await supabase
        .from('ip_application_documents')
        .update({
          transfer_status: 'Failed',
          transfer_error: errMsg.substring(0, 2000),
          transfer_request_id: transferRequestId,
        })
        .eq('id', doc.id)

      return new Response(JSON.stringify({ error: `File download failed: ${errMsg}` }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
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

    const entryFields = JSON.stringify({
      Document_Type: doc.document_type || 'General',
      Reference_ID: doc.source_document_id || doc.id,
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

    const dmsEndpoint = `${dmsBaseUrl.replace(/\/+$/, '')}/api/Dms/files`

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

      try { dmsResponseJson = JSON.parse(dmsResponseText) } catch { dmsResponseJson = { raw: safeSnippet(dmsResponseText) } }

      if (!dmsResponse.ok) {
        throw new Error(`DMS API returned HTTP ${dmsHttpStatus}: ${safeSnippet(dmsResponseText, 500)}`)
      }
    } catch (dmsErr) {
      const errMsg = dmsErr instanceof Error ? dmsErr.message : String(dmsErr)
      await supabase
        .from('ip_application_documents')
        .update({
          transfer_status: 'Failed',
          transfer_error: errMsg.substring(0, 2000),
          transfer_http_status: dmsHttpStatus,
          transfer_response_snippet: safeSnippet(dmsResponseText),
          transfer_request_id: transferRequestId,
        })
        .eq('id', doc.id)

      return new Response(JSON.stringify({ error: `DMS upload failed: ${errMsg}` }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
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

    return new Response(JSON.stringify({
      success: true,
      message: 'Document transferred successfully',
      dmsDocumentId: dmsDocId ? String(dmsDocId) : null,
      documentId: doc.id,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error('DMS single transfer error:', errMsg)
    return new Response(JSON.stringify({ error: errMsg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
