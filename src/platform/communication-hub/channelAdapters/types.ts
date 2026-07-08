/**
 * Enterprise Communication Hub — channel adapter contracts.
 *
 * Channel adapters are the async workers that consume queued
 * `communication_message` rows and call the actual provider
 * (SES, SendGrid, Twilio, print spooler, in-app bus, …). They are
 * intentionally NOT invoked from `sendCommunication()` — that facade
 * only creates records and hands off to the dispatcher.
 *
 * Provider secrets MUST NEVER be referenced from frontend code. Adapter
 * implementations live in edge functions (Phase 1B stub / Phase 1C real).
 */
import type { CommHubMessageChannel } from '../types';

export interface ChannelAdapterContext {
  messageId: string;
  requestId: string;
  channel: CommHubMessageChannel;
  providerId?: string | null;
}

export interface ChannelAdapterResult {
  ok: boolean;
  providerMessageId?: string | null;
  status: 'queued' | 'sending' | 'sent' | 'delivered' | 'failed' | 'bounced' | 'suppressed';
  errorCode?: string | null;
  errorMessage?: string | null;
  providerResponse?: Record<string, unknown> | null;
}

export interface ChannelAdapter {
  readonly channel: CommHubMessageChannel;
  /**
   * Enqueue only — must NOT block the calling transaction on network I/O.
   * Real dispatch happens in the async edge worker.
   */
  enqueue(ctx: ChannelAdapterContext): Promise<ChannelAdapterResult>;
}
