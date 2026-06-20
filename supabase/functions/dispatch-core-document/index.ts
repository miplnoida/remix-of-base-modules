// Dispatch a pre-generated core_generated_document via its channel.
// - EMAIL: enqueues to transactional_emails using existing email queue
// - SMS:   stub (logs FAILED with provider-pending unless a future provider is wired)
// - INAPP: inserts into in_app_notifications and marks DELIVERED
// - PDF/WEBHOOK/PRINT: marks GENERATED -> DELIVERED (no transport needed at platform level)
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SENDER_DOMAIN = 'notify.mishainfotech.us'
const FROM_NAME = 'SKN Social Security Board'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  let body: any
  try { body = await req.json() } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }
  const generatedDocumentId: string | undefined = body.generated_document_id
  if (!generatedDocumentId) return json({ error: 'generated_document_id is required' }, 400)

  const { data: doc, error: docErr } = await supabase
    .from('core_generated_document').select('*').eq('id', generatedDocumentId).maybeSingle()
  if (docErr || !doc) return json({ error: 'Document not found', details: docErr?.message }, 404)

  const channel = (doc.channel_code || 'PDF').toUpperCase()
  const recipient = doc.recipient_address || body.recipient_address

  try {
    if (channel === 'EMAIL') {
      if (!recipient) throw new Error('recipient_address required for EMAIL channel')
      const messageId = crypto.randomUUID()
      const { error: enqErr } = await supabase.rpc('enqueue_email', {
        queue_name: 'transactional_emails',
        payload: {
          message_id: messageId,
          to: recipient,
          from: `${FROM_NAME} <noreply@${SENDER_DOMAIN}>`,
          sender_domain: SENDER_DOMAIN,
          subject: doc.subject || 'Notice from SKN Social Security Board',
          html: doc.generated_html,
          text: stripHtml(doc.generated_html || ''),
          purpose: 'transactional',
          label: `core_template:${doc.template_id}`,
          idempotency_key: doc.reference_no,
          queued_at: new Date().toISOString(),
        },
      })
      if (enqErr) throw enqErr
      await mark(supabase, doc.id, 'QUEUED')
      return json({ success: true, channel, message_id: messageId, status: 'QUEUED' })
    }

    if (channel === 'INAPP' || channel === 'PORTAL_MSG') {
      const user = body.recipient_user_id || recipient
      if (!user) throw new Error('recipient (user_id) required for portal channel')
      await supabase.from('in_app_notifications').insert({
        user_id: user,
        title: doc.subject || 'Notification',
        body: stripHtml(doc.generated_html || '').slice(0, 1000),
        category: doc.doc_type_code,
        link: `/legal/documents/${doc.id}`,
      })
      await mark(supabase, doc.id, 'DELIVERED', new Date().toISOString())
      return json({ success: true, channel, status: 'DELIVERED' })
    }

    if (channel === 'SMS') {
      // Provider not wired yet - mark FAILED so it surfaces in monitoring
      await mark(supabase, doc.id, 'FAILED')
      return json({ success: false, channel, status: 'FAILED', reason: 'SMS provider not configured' }, 200)
    }

    if (channel === 'PRINT_LETTER' || channel === 'PRINT') {
      // Queue for print spool; an admin/operator will release to the network printer.
      await supabase.from('in_app_notifications').insert({
        user_id: body.print_operator_user_id || recipient || 'system',
        title: `[Print Queue] ${doc.subject || doc.doc_type_code}`,
        body: `Document ${doc.reference_no} is ready for printing.`,
        category: 'PRINT_QUEUE',
        link: `/legal/documents/${doc.id}`,
      }).then(() => {}, () => {})
      await mark(supabase, doc.id, 'QUEUED_FOR_PRINT')
      return json({ success: true, channel, status: 'QUEUED_FOR_PRINT', message: 'Document queued for printing. Open the document and print from the preview.' })
    }


    // PDF / PRINT / WEBHOOK / etc — no platform-level delivery needed
    await mark(supabase, doc.id, 'DELIVERED', new Date().toISOString())
    return json({ success: true, channel, status: 'DELIVERED' })
  } catch (e: any) {
    console.error('dispatch-core-document failed', e)
    await mark(supabase, doc.id, 'FAILED').catch(() => {})
    return json({ error: 'Dispatch failed', details: String(e?.message || e) }, 500)
  }
})

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

async function mark(supabase: any, id: string, status: string, delivered_at?: string) {
  const patch: any = { delivery_status: status }
  if (delivered_at) patch.delivered_at = delivered_at
  await supabase.from('core_generated_document').update(patch).eq('id', id)
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
