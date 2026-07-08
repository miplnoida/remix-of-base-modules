/**
 * Shared validation/types for the Communication Hub enqueue path.
 *
 * Kept intentionally small — pure functions only, no supabase clients, no
 * side-effects. Both the edge function (`comm-hub-enqueue`) and the
 * frontend façade (`sendCommunication`) can consume this.
 */

export const COMM_HUB_ALLOWED_CHANNELS = [
  "email", "sms", "push", "in_app", "letter", "print", "whatsapp",
] as const;

export type CommHubDbChannel = typeof COMM_HUB_ALLOWED_CHANNELS[number];

export function normalizeCommHubChannel(ch: unknown): CommHubDbChannel | null {
  if (typeof ch !== "string") return null;
  const lower = ch.toLowerCase();
  if ((COMM_HUB_ALLOWED_CHANNELS as readonly string[]).includes(lower)) {
    return lower as CommHubDbChannel;
  }
  const upper = ch.toUpperCase();
  switch (upper) {
    case "EMAIL": return "email";
    case "SMS": return "sms";
    case "PUSH": return "push";
    case "IN_APP":
    case "PORTAL": return "in_app";
    case "WHATSAPP": return "whatsapp";
    case "PRINT": return "print";
    case "DOCUMENT":
    case "PDF":
    case "LETTER": return "letter";
    default: return null;
  }
}

export interface CommHubEnqueuePayload {
  moduleCode: string;
  departmentCode?: string | null;
  eventCode: string;
  channels?: string[];
  recipients?: Array<Record<string, unknown>>;
  recipient?: Record<string, unknown> | Array<Record<string, unknown>>;
  data?: Record<string, unknown>;
  message?: { subject?: string; bodyText?: string; bodyHtml?: string };
  reference?: { entityType?: string; entityId?: string; referenceNo?: string };
  priority?: "low" | "normal" | "high" | "urgent";
  scheduledAt?: string | null;
  idempotencyKey?: string | null;
  correlationId?: string | null;
  requestedBy?: string | null;
  countryCode?: string | null;
  languageCode?: string | null;
  metadata?: Record<string, unknown>;
  testMode?: boolean;
}
