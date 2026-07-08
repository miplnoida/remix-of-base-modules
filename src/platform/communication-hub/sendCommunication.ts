/**
 * Enterprise Communication Hub — sendCommunication() façade (Phase 1B).
 *
 * Single entry point for every business module that wants to send a
 * communication. This function:
 *   1. Validates the event against the business event catalogue.
 *   2. Resolves default channels if none were supplied.
 *   3. Enforces idempotency (via `communication_request.idempotency_key`).
 *   4. Resolves branding + template context via existing resolvers
 *      (`resolveBusinessCommunicationContext` → `coreTemplateResolverService`).
 *   5. Creates one `communication_request` parent record.
 *   6. Creates `communication_recipient` snapshots.
 *   7. Creates one `communication_message` per (channel × recipient) in
 *      queued / pending status. It does NOT invoke any provider — real
 *      dispatch happens in the async edge dispatcher (Phase 1C).
 *   8. Writes lifecycle entries to `communication_event_log` at every
 *      stage (REQUEST_CREATED → MESSAGE_QUEUED).
 *
 * Guardrails honoured:
 *   - No parallel comm system — reuses `communication_*` spine.
 *   - No template / provider / branding duplication — reuses existing
 *     resolvers and `notification_providers`.
 *   - No synchronous provider I/O in a UI action.
 *   - No provider secrets touched from this module.
 *   - Feature-flag gated so BN / Legal / Compliance runtime flows are
 *     unaffected until they are explicitly cut over in Phase 1C.
 */
import { supabase } from '@/integrations/supabase/client';
import { findBusinessEvent } from '@/platform/comm-template-governance/businessEventCatalogue';
import { resolveBusinessCommunicationContext } from '@/lib/comm/businessCommunicationResolver';
import { coreTemplateResolverService } from '@/services/coreTemplateResolverService';
import {
  mapChannel,
  type CommHubChannel,
  type CommHubMessageChannel,
  type CommHubRecipientInput,
  type SendCommunicationInput,
  type SendCommunicationMessageResult,
  type SendCommunicationResult,
} from './types';
import { logLifecycle } from './eventLogService';
import {
  findRequestByIdempotencyKey,
  generateCorrelationId,
  listMessagesForRequest,
} from './idempotency';

const db: any = supabase;

/** Feature-flag: façade is opt-in until Phase 1C module cutover. */
export function isCommunicationHubSendEnabled(): boolean {
  try {
    const env: any = (import.meta as any)?.env ?? {};
    const raw =
      env.VITE_COMMUNICATION_HUB_SEND_ENABLED ??
      env.COMMUNICATION_HUB_SEND_ENABLED ??
      (globalThis as any)?.__COMMUNICATION_HUB_SEND_ENABLED__;
    if (raw === true || raw === 'true' || raw === '1') return true;
    return false;
  } catch {
    return false;
  }
}

function toArray<T>(v: T | T[]): T[] {
  return Array.isArray(v) ? v : [v];
}

function nextRequestNo(): string {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `CR-${stamp}-${rand}`;
}

export async function sendCommunication(
  input: SendCommunicationInput,
): Promise<SendCommunicationResult> {
  const warnings: string[] = [];
  const correlationId = input.correlationId ?? generateCorrelationId();
  const idempotencyKey = input.idempotencyKey ?? null;
  const testMode = !!input.testMode;
  const featureEnabled = isCommunicationHubSendEnabled();

  // --- 1. Validate event ---------------------------------------------------
  const eventDef = findBusinessEvent(input.eventCode);
  if (!eventDef) {
    warnings.push(`Unknown eventCode '${input.eventCode}' — not in businessEventCatalogue.`);
  }

  // --- 2. Resolve default channels ----------------------------------------
  const channels: CommHubChannel[] =
    input.channels && input.channels.length > 0
      ? input.channels
      : (eventDef?.defaultChannels ?? ['EMAIL']);

  // --- Feature-flag / test-mode short-circuit -----------------------------
  if (!featureEnabled && !testMode) {
    return {
      ok: false,
      requestId: null,
      requestNo: null,
      correlationId,
      idempotencyKey,
      status: 'disabled',
      messageIds: [],
      messages: [],
      warnings: [...warnings, 'COMMUNICATION_HUB_SEND_ENABLED flag is off.'],
      reusedExistingRequest: false,
      featureDisabled: true,
    };
  }

  // --- 3. Idempotency check ------------------------------------------------
  if (idempotencyKey) {
    const existing = await findRequestByIdempotencyKey(idempotencyKey);
    if (existing) {
      const rows = await listMessagesForRequest(existing.id);
      return {
        ok: true,
        requestId: existing.id,
        requestNo: existing.request_no,
        correlationId: existing.correlation_id ?? correlationId,
        idempotencyKey,
        status: existing.status,
        messageIds: rows.map((r) => r.id),
        messages: rows.map((r) => ({
          id: r.id,
          channel: r.channel as CommHubMessageChannel,
          status: r.status,
          recipientId: r.recipient_id,
        })),
        warnings: [...warnings, 'Reused existing request via idempotency_key.'],
        reusedExistingRequest: true,
        testMode,
      };
    }
  }

  const recipients = toArray(input.recipient).filter(Boolean);
  if (recipients.length === 0) {
    return {
      ok: false,
      requestId: null,
      requestNo: null,
      correlationId,
      idempotencyKey,
      status: 'failed',
      messageIds: [],
      messages: [],
      warnings: [...warnings, 'No recipient supplied.'],
      reusedExistingRequest: false,
      testMode,
      error: 'NO_RECIPIENT',
    };
  }

  // --- 4/5. Create request row --------------------------------------------
  const requestNo = nextRequestNo();
  const scheduledAt = input.scheduledAt
    ? new Date(input.scheduledAt).toISOString()
    : null;

  const contextPayload: Record<string, unknown> = {
    correlation_id: correlationId,
    event_name: eventDef?.name ?? null,
    default_recipient_type: eventDef?.defaultRecipient ?? null,
    requested_channels: channels,
    metadata: input.metadata ?? {},
    test_mode: testMode,
  };

  const { data: reqRow, error: reqErr } = await db
    .from('communication_request')
    .insert({
      request_no: requestNo,
      module_code: input.moduleCode,
      department_code: input.departmentCode ?? null,
      event_code: input.eventCode,
      entity_type: input.reference?.entityType ?? null,
      entity_id: input.reference?.entityId ?? null,
      reference_no: input.reference?.referenceNo ?? null,
      country_code: input.countryCode ?? null,
      language_code: input.languageCode ?? null,
      channels: channels.map((c) => mapChannel(c)),
      priority: input.priority ?? 'normal',
      scheduled_at: scheduledAt,
      status: 'pending',
      payload: (input.data ?? {}) as Record<string, unknown>,
      context: contextPayload,
      idempotency_key: idempotencyKey,
      requested_by: input.requestedBy ?? null,
    })
    .select('id, request_no')
    .single();

  if (reqErr || !reqRow) {
    return {
      ok: false,
      requestId: null,
      requestNo: null,
      correlationId,
      idempotencyKey,
      status: 'failed',
      messageIds: [],
      messages: [],
      warnings,
      reusedExistingRequest: false,
      testMode,
      error: reqErr?.message ?? 'REQUEST_INSERT_FAILED',
    };
  }
  const requestId: string = reqRow.id;

  await logLifecycle({
    stage: 'REQUEST_CREATED',
    requestId,
    actorUserId: input.requestedBy,
    payload: { correlation_id: correlationId, channels },
  });
  await logLifecycle({
    stage: 'REQUEST_VALIDATED',
    requestId,
    actorUserId: input.requestedBy,
    payload: { eventKnown: !!eventDef },
  });

  // --- 6. Persist recipients ----------------------------------------------
  const recipientRowIds: Array<{ id: string; input: CommHubRecipientInput }> = [];
  for (const r of recipients) {
    const { data: recRow, error: recErr } = await db
      .from('communication_recipient')
      .insert({
        request_id: requestId,
        role: r.role ?? 'to',
        recipient_type: r.type ?? eventDef?.defaultRecipient ?? null,
        recipient_user_id: r.userId ?? null,
        recipient_person_id: r.personId ?? null,
        recipient_employer_id: r.employerId ?? null,
        name: r.name ?? null,
        email: r.email ?? null,
        phone: r.phone ?? null,
        postal_address: r.postalAddress ?? null,
        channel_hint: r.channelHint ? mapChannel(r.channelHint) : null,
      })
      .select('id')
      .single();
    if (!recErr && recRow) recipientRowIds.push({ id: recRow.id, input: r });
    else warnings.push(`Recipient insert failed: ${recErr?.message ?? 'unknown'}`);
  }

  // --- 7/8. Resolve template + branding PER CHANNEL -----------------------
  // `resolveBusinessCommunicationContext` accepts a `channel` hint and
  // forwards it to `coreTemplateResolverService.resolveRenderContext`, so
  // signature / footer / disclaimer are all channel-aware. We resolve once
  // per channel and cache by channel to avoid re-work when multiple
  // recipients share it.
  interface PerChannelRender {
    templateCode: string | null;
    templateVersionId: string | null;
    subject: string | null;
    bodyHtml: string | null;
    bodyText: string | null;
    letterheadId: string | null;
    footerId: string | null;
    disclaimerId: string | null;
    signatureSource: string | null;
  }
  const perChannel = new Map<CommHubChannel, PerChannelRender>();
  for (const ch of channels) {
    let out: PerChannelRender = {
      templateCode: null,
      templateVersionId: null,
      subject: null,
      bodyHtml: null,
      bodyText: null,
      letterheadId: null,
      footerId: null,
      disclaimerId: null,
      signatureSource: null,
    };
    try {
      const bctx = await resolveBusinessCommunicationContext({
        moduleCode: input.moduleCode,
        departmentCode: input.departmentCode ?? null,
        businessEventCode: input.eventCode,
        templateCode: input.templateCode ?? null,
        languageCode: input.languageCode ?? null,
        channel: ch,
        country: input.countryCode ?? 'KN',
      });
      warnings.push(...(bctx.warnings ?? []));
      out.templateCode = bctx.resolvedTemplateCode ?? null;
      const version = bctx.render?.version as any;
      out.templateVersionId = version?.id ?? null;
      out.subject = version?.subject ?? null;
      out.letterheadId = bctx.render?.letterhead?.id ?? null;
      out.footerId = bctx.render?.footer?.id ?? null;
      out.disclaimerId = bctx.render?.disclaimer?.id ?? null;
      out.signatureSource = bctx.render?.signature?.source ?? null;
      if (bctx.render) {
        out.bodyHtml = coreTemplateResolverService.composeFinalHtml(bctx.render);
        out.bodyText = version?.body_text ?? null;
      }
    } catch (err: any) {
      warnings.push(`Template/branding resolve skipped for ${ch}: ${err?.message ?? err}`);
    }
    perChannel.set(ch, out);
  }

  const firstResolved = Array.from(perChannel.values()).find((r) => r.templateVersionId);
  await logLifecycle({
    stage: 'TEMPLATE_RESOLVED',
    requestId,
    payload: {
      template_version_ids: Array.from(perChannel.entries()).map(([c, r]) => ({
        channel: c, template_version_id: r.templateVersionId,
      })),
    },
  });
  await logLifecycle({
    stage: 'BRANDING_RESOLVED',
    requestId,
    payload: {
      letterhead_id: firstResolved?.letterheadId ?? null,
      signature_source: firstResolved?.signatureSource ?? null,
      footer_id: firstResolved?.footerId ?? null,
      disclaimer_id: firstResolved?.disclaimerId ?? null,
    },
  });
  await logLifecycle({
    stage: 'CONTENT_RENDERED',
    requestId,
    payload: {
      channels_rendered: Array.from(perChannel.entries()).map(([c, r]) => ({
        channel: c, has_body: !!(r.bodyHtml || r.bodyText),
      })),
    },
  });

  // --- 9. Create one message per channel × recipient ----------------------
  // NOTE(RLS): messages are inserted from the caller's Supabase session. The
  // Phase 1A RLS policy restricts writes to admins / system_administration
  // holders. Phase 1C will move enqueue into an edge function or
  // SECURITY DEFINER RPC (`public.send_communication_v1`) so any authorised
  // module user can enqueue without weakening RLS. See PHASE_1C_NOTES.
  const messages: SendCommunicationMessageResult[] = [];
  const inputSubject = (input.data as any)?.subject ?? null;
  for (const rec of recipientRowIds) {
    for (const ch of channels) {
      const mappedChannel: CommHubMessageChannel = mapChannel(ch);
      const rendered = perChannel.get(ch)!;
      // For letter/print/pdf we intentionally leave body_html/body_text
      // empty on the message row — the rendered artefact is materialised
      // as a core_generated_document by the dispatcher and linked via
      // communication_message.generated_document_id + communication_attachment.
      const isDocumentChannel = mappedChannel === 'letter' || mappedChannel === 'print';
      const { data: msgRow, error: msgErr } = await db
        .from('communication_message')
        .insert({
          request_id: requestId,
          recipient_id: rec.id,
          channel: mappedChannel,
          template_version_id: rendered.templateVersionId,
          subject: inputSubject ?? rendered.subject ?? null,
          body_text: isDocumentChannel ? null : rendered.bodyText,
          body_html: isDocumentChannel ? null : rendered.bodyHtml,
          rendered_at: rendered.bodyHtml || rendered.bodyText ? new Date().toISOString() : null,
          status: 'queued',
        })
        .select('id, channel, status')
        .single();
      if (msgErr || !msgRow) {
        warnings.push(`Message insert failed (${mappedChannel}): ${msgErr?.message ?? 'unknown'}`);
        continue;
      }
      messages.push({
        id: msgRow.id,
        channel: msgRow.channel as CommHubMessageChannel,
        status: msgRow.status,
        recipientId: rec.id,
      });
      await logLifecycle({
        stage: 'MESSAGE_CREATED',
        requestId,
        messageId: msgRow.id,
        payload: {
          channel: mappedChannel,
          template_version_id: rendered.templateVersionId,
          document_channel: isDocumentChannel,
        },
      });
      // 12. Async hand-off — record queued state; real dispatch is Phase 1C.
      await logLifecycle({
        stage: 'MESSAGE_QUEUED',
        requestId,
        messageId: msgRow.id,
        payload: { channel: mappedChannel, test_mode: testMode },
      });
    }
  }

  // Request status vocab (CHECK): pending | approved | dispatching |
  // completed | partial | failed | cancelled. No worker has actually
  // started sending yet — keep the request in `pending` (queued semantics)
  // and let the Phase 1C dispatcher transition it to `dispatching` when it
  // picks up messages.
  const finalStatus = messages.length === 0 ? 'failed' : 'pending';
  if (finalStatus === 'failed') {
    await db.from('communication_request').update({ status: finalStatus }).eq('id', requestId);
  }

  return {
    ok: messages.length > 0,
    requestId,
    requestNo: reqRow.request_no,
    correlationId,
    idempotencyKey,
    status: finalStatus,
    messageIds: messages.map((m) => m.id),
    messages,
    warnings,
    reusedExistingRequest: false,
    testMode,
  };
}

export const communicationHub = {
  sendCommunication,
  isCommunicationHubSendEnabled,
};
