/**
 * Enterprise Communication Hub — Phase 1B façade types.
 *
 * The `sendCommunication()` façade is the single entry point for every
 * business module (Employer, IP, C3, Benefits, Compliance, Finance, Legal,
 * Workflow, Admin) to request outbound communications. It writes the
 * canonical `communication_request` / `communication_recipient` /
 * `communication_message` / `communication_event_log` records and hands
 * off to the async dispatcher — it NEVER sends synchronously.
 *
 * All identifiers reuse existing platform vocabularies:
 *   - `moduleCode`, `eventCode`  → `businessEventCatalogue`
 *   - `channels[]`               → `OutputChannel` (DOCUMENT|EMAIL|SMS|IN_APP|PORTAL|PDF|PRINT)
 *   - branding / template / signature / footer / disclaimer
 *                                → `businessCommunicationResolver` + `coreTemplateResolverService`
 *   - provider selection & retry → `notification_providers`, `communication_retry_policy`
 */
import type { OutputChannel, RecipientType } from '@/platform/comm-template-governance/businessEventCatalogue';

export type CommHubChannel = OutputChannel;

/** Canonical `communication_message.channel` values (CHECK-constrained). */
export type CommHubMessageChannel =
  | 'email' | 'sms' | 'push' | 'in_app' | 'letter' | 'print' | 'whatsapp';

export interface CommHubRecipientInput {
  type?: RecipientType | string | null;
  userId?: string | null;
  personId?: string | null;
  employerId?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  postalAddress?: Record<string, unknown> | null;
  role?: 'to' | 'cc' | 'bcc' | 'reply_to';
  channelHint?: CommHubChannel | null;
}

export interface SendCommunicationInput {
  moduleCode: string;
  departmentCode?: string | null;
  eventCode: string;
  channels?: CommHubChannel[];
  recipient: CommHubRecipientInput | CommHubRecipientInput[];
  data?: Record<string, unknown>;
  reference?: {
    entityType?: string | null;
    entityId?: string | null;
    referenceNo?: string | null;
  };
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  scheduledAt?: string | Date | null;
  idempotencyKey?: string | null;
  correlationId?: string | null;
  requestedBy?: string | null;
  templateCode?: string | null;
  languageCode?: string | null;
  countryCode?: string | null;
  metadata?: Record<string, unknown>;
  testMode?: boolean;
  /** Opt-in to legacy client-side direct-write (admin/test tools). */
  directWrite?: boolean;
  /** Optional pre-rendered message content forwarded to server enqueue. */
  message?: { subject?: string; bodyText?: string; bodyHtml?: string };

}

export interface SendCommunicationMessageResult {
  id: string;
  channel: CommHubMessageChannel;
  status: string;
  recipientId: string | null;
}

export interface SendCommunicationResult {
  ok: boolean;
  requestId: string | null;
  requestNo: string | null;
  correlationId: string;
  idempotencyKey: string | null;
  status: string;
  messageIds: string[];
  messages: SendCommunicationMessageResult[];
  warnings: string[];
  reusedExistingRequest: boolean;
  featureDisabled?: boolean;
  testMode?: boolean;
  error?: string;
}

export const COMM_HUB_LIFECYCLE_STAGES = [
  'REQUEST_CREATED',
  'REQUEST_VALIDATED',
  'TEMPLATE_RESOLVED',
  'BRANDING_RESOLVED',
  'CONTENT_RENDERED',
  'MESSAGE_CREATED',
  'MESSAGE_QUEUED',
] as const;
export type CommHubLifecycleStage = (typeof COMM_HUB_LIFECYCLE_STAGES)[number];

/** Map high-level `OutputChannel` codes to canonical `communication_message.channel`. */
export function mapChannel(ch: CommHubChannel | string): CommHubMessageChannel {
  const c = String(ch).toUpperCase();
  if (c === 'EMAIL') return 'email';
  if (c === 'SMS') return 'sms';
  if (c === 'PUSH') return 'push';
  if (c === 'IN_APP' || c === 'PORTAL') return 'in_app';
  if (c === 'WHATSAPP') return 'whatsapp';
  if (c === 'PRINT') return 'print';
  // DOCUMENT / PDF / PRINT_LETTER / LETTER all render to a printable letter artefact.
  return 'letter';
}
