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
}

interface DocumentTransferResult {
  documentId: string
  documentName: string | null
  success: boolean
  dmsDocumentId: string | null
  error: string | null
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
    const body: DmsTransferRequest = await req.json()
    const { ssn, userCode, userId, ipMasterUniqueUuid } = body

    if (!ssn || !userCode) {
      return new Response(JSON.stringify({ error: 'ssn and userCode are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!dmsBaseUrl) {
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
      return new Response(JSON.stringify({ error: 'IP master record not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (ipRecord.status !== 'V') {
      return new Response(JSON.stringify({
        error: `IP master status is "${ipRecord.status}", not "V". DMS transfer skipped.`,
        skipped: true,
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Audit: ip_master verified
    await supabase.from('system_audit_trail').insert({
      action: 'dms_transfer_initiated',
      entity_type: 'ip_master',
      entity_id: ipMasterUniqueUuid,
      module: 'IP Registration - DMS Transfer',
      user_id: userId,
      user_name: userCode,
      severity: 'info',
      before_value: null,
      after_value: { status: 'V', ssn },
      payload_json: { ssn, trigger: 'ip_master_verified' },
      timestamp: new Date().toISOString(),
    })

    // Fetch pending documents for this SSN
    const { data: documents, error: docError } = await supabase
      .from('ip_application_documents')
      .select('*')
      .eq('ssn', ssn)
      .neq('transfer_status', 'Transferred')

    if (docError) {
      throw new Error(`Failed to fetch documents: ${docError.message}`)
    }

    if (!documents || documents.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No pending documents to transfer',
        results: [],
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const results: DocumentTransferResult[] = []
    const dmsEndpoint = `${dmsBaseUrl.replace(/\/+$/, '')}/api/Dms/files`

    for (const doc of documents) {
      const docResult: DocumentTransferResult = {
        documentId: doc.id,
        documentName: doc.document_name || doc.file_name,
        success: false,
        dmsDocumentId: null,
        error: null,
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

        // Determine file URL to download from
        const fileUrl = doc.signed_url || doc.url || doc.file_path
        if (!fileUrl) {
          throw new Error('No file URL available (signed_url, url, and file_path are all null)')
        }

        // Increment transfer attempt counter
        await supabase
          .from('ip_application_documents')
          .update({ transfer_attempts: (doc.transfer_attempts || 0) + 1 })
          .eq('id', doc.id)

        // Download the file binary
        const fileResponse = await fetch(fileUrl, {
          signal: AbortSignal.timeout(30000),
        })
        if (!fileResponse.ok) {
          throw new Error(`Failed to download file from ${fileUrl}: HTTP ${fileResponse.status}`)
        }

        const fileBlob = await fileResponse.blob()
        if (fileBlob.size === 0) {
          throw new Error('Downloaded file is empty (0 bytes)')
        }

        // Determine file name for upload
        const fileName = doc.file_name || doc.document_name || 'document'

        // Build EntryFields JSON
        // Reference_ID: use source_document_id (original external doc ID) > doc.id
        const referenceId = doc.source_document_id || doc.id
        const entryFields = JSON.stringify({
          Document_Type: doc.document_type || 'General',
          Reference_ID: referenceId,
          Uploaded_By: userCode,
          Uploaded_Date: new Date().toISOString().split('T')[0],
          SSN: ssn,
        })

        // Build multipart form data for DMS API
        const formData = new FormData()
        formData.append('File', new File([fileBlob], fileName, { type: doc.mime_type || 'application/octet-stream' }))
        formData.append('CategoryId', 'PPIP')
        formData.append('UserName', userCode)
        formData.append('EntryFields', entryFields)

        // Build DMS request headers
        const dmsHeaders: Record<string, string> = {}
        if (dmsApiKey) {
          dmsHeaders['x-api-key'] = dmsApiKey
        }

        // Audit: DMS upload attempt
        await supabase.from('system_audit_trail').insert({
          action: 'dms_upload_attempt',
          entity_type: 'ip_application_documents',
          entity_id: doc.id,
          module: 'IP Registration - DMS Transfer',
          user_id: userId,
          user_name: userCode,
          severity: 'info',
          payload_json: {
            ssn,
            document_name: doc.document_name,
            document_type: doc.document_type,
            reference_id: referenceId,
            file_size: fileBlob.size,
            category_id: 'PPIP',
          },
          timestamp: new Date().toISOString(),
        })

        // Call DMS API
        const dmsResponse = await fetch(dmsEndpoint, {
          method: 'POST',
          headers: dmsHeaders,
          body: formData,
          signal: AbortSignal.timeout(60000),
        })

        const dmsResponseText = await dmsResponse.text()
        let dmsResponseJson: any = null
        try {
          dmsResponseJson = JSON.parse(dmsResponseText)
        } catch {
          dmsResponseJson = { raw: dmsResponseText }
        }

        if (!dmsResponse.ok) {
          throw new Error(`DMS API returned HTTP ${dmsResponse.status}: ${dmsResponseText.substring(0, 500)}`)
        }

        // Extract DMS document ID from response if available
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
          })
          .eq('id', doc.id)

        if (updateError) {
          console.error(`Failed to update document ${doc.id} status:`, updateError)
        }

        docResult.success = true
        docResult.dmsDocumentId = dmsDocId ? String(dmsDocId) : null

        // Audit: DMS upload success
        await supabase.from('system_audit_trail').insert({
          action: 'dms_upload_success',
          entity_type: 'ip_application_documents',
          entity_id: doc.id,
          module: 'IP Registration - DMS Transfer',
          user_id: userId,
          user_name: userCode,
          severity: 'info',
          before_value: { transfer_status: doc.transfer_status },
          after_value: { transfer_status: 'Transferred', dms_document_id: dmsDocId },
          payload_json: {
            ssn,
            document_name: doc.document_name,
            dms_response: dmsResponseJson,
          },
          timestamp: new Date().toISOString(),
        })

      } catch (docErr) {
        const errMsg = docErr instanceof Error ? docErr.message : String(docErr)
        docResult.error = errMsg
        console.error(`DMS upload failed for doc ${doc.id}:`, errMsg)

        // Mark as Failed with error reason
        await supabase
          .from('ip_application_documents')
          .update({
            transfer_status: 'Failed',
            transfer_error: errMsg.substring(0, 2000),
          })
          .eq('id', doc.id)

        // Audit: DMS upload failure
        await supabase.from('system_audit_trail').insert({
          action: 'dms_upload_failed',
          entity_type: 'ip_application_documents',
          entity_id: doc.id,
          module: 'IP Registration - DMS Transfer',
          user_id: userId,
          user_name: userCode,
          severity: 'error',
          payload_json: {
            ssn,
            document_name: doc.document_name,
            error: errMsg,
            transfer_attempts: (doc.transfer_attempts || 0) + 1,
          },
          timestamp: new Date().toISOString(),
        })
      }

      results.push(docResult)
    }

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    // Final audit summary
    await supabase.from('system_audit_trail').insert({
      action: 'dms_transfer_completed',
      entity_type: 'ip_master',
      entity_id: ipMasterUniqueUuid,
      module: 'IP Registration - DMS Transfer',
      user_id: userId,
      user_name: userCode,
      severity: failCount > 0 ? 'warning' : 'info',
      payload_json: {
        ssn,
        total_documents: documents.length,
        success_count: successCount,
        fail_count: failCount,
        results: results.map(r => ({
          documentId: r.documentId,
          success: r.success,
          dmsDocumentId: r.dmsDocumentId,
          error: r.error,
        })),
      },
      timestamp: new Date().toISOString(),
    })

    return new Response(JSON.stringify({
      success: failCount === 0,
      message: failCount === 0
        ? `All ${successCount} document(s) transferred successfully`
        : `${successCount} transferred, ${failCount} failed`,
      totalDocuments: documents.length,
      successCount,
      failCount,
      results,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error('DMS transfer error:', errMsg)
    return new Response(JSON.stringify({ error: errMsg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
