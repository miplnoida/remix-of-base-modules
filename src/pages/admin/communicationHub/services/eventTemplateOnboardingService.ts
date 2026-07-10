/**
 * EPIC 4B — Event & Template Onboarding Wizard service layer.
 *
 * All writes go through Admin-only SECURITY DEFINER RPCs. No live email.
 * No cron. Dry-run recipient locked to rohit@mishainfotech.com upstream.
 */
import { supabase } from "@/integrations/supabase/client";

export type ModuleCode =
  | "EMPLOYER_REGISTRATION"
  | "COMPLIANCE"
  | "LEGAL"
  | "INSURED_PERSON"
  | "BENEFITS"
  | "CLAIMS"
  | "APPEALS"
  | "WORKFLOW"
  | "COMM_HUB";

export const KNOWN_MODULES: { code: ModuleCode; name: string }[] = [
  { code: "EMPLOYER_REGISTRATION", name: "Employer Registration" },
  { code: "COMPLIANCE", name: "Compliance & Enforcement" },
  { code: "LEGAL", name: "Legal" },
  { code: "INSURED_PERSON", name: "Insured Person" },
  { code: "BENEFITS", name: "Benefits" },
  { code: "CLAIMS", name: "Claims" },
  { code: "APPEALS", name: "Appeals" },
  { code: "WORKFLOW", name: "Workflow" },
  { code: "COMM_HUB", name: "Communication Hub (internal)" },
];

export const SERVER_PROVIDED_TOKENS: TokenMetadata[] = [
  { key: "request_no", label: "Request No", sample: "CR-PREVIEW-000001", required: true, server_provided: true, data_type: "text", sensitive: false, description: "Server-generated communication request number." },
  { key: "request_id", label: "Request ID", sample: "00000000-0000-0000-0000-000000000000", required: true, server_provided: true, data_type: "text", sensitive: false, description: "Server-generated communication request UUID." },
  { key: "generated_at", label: "Generated At", sample: new Date().toISOString(), required: true, server_provided: true, data_type: "date", sensitive: false, description: "Server-generated timestamp." },
  { key: "module_code", label: "Module Code", sample: "MODULE", required: true, server_provided: true, data_type: "text", sensitive: false, description: "Auto-filled by the Hub." },
  { key: "event_code", label: "Event Code", sample: "EVENT", required: true, server_provided: true, data_type: "text", sensitive: false, description: "Auto-filled by the Hub." },
];

export type TokenDataType = "text" | "date" | "number" | "boolean" | "url" | "email";

export interface TokenMetadata {
  key: string;
  label: string;
  sample: string;
  required: boolean;
  server_provided: boolean;
  data_type: TokenDataType;
  sensitive: boolean;
  description?: string;
}

export interface RegistryPayload {
  module_code: string;
  module_name?: string;
  event_code: string;
  event_name?: string;
  description?: string;
  trigger_description?: string;
  channel: "email";
  recipient_type?: string;
  entity_type?: string;
  risk_level: "low" | "medium" | "high";
  template_code?: string;
  token_metadata: TokenMetadata[];
  required_tokens: string[];
  recommended_phase?: string;
  notes?: string;
}

const LOCKED_RECIPIENT = "rohit@mishainfotech.com";

/** Validate token key */
export function isValidTokenKey(k: string): boolean {
  return /^[a-z][a-z0-9_]*$/.test(k);
}

/** Suggest template code */
export function suggestTemplateCode(moduleCode: string, eventCode: string): string {
  return `${moduleCode}_${eventCode}_EMAIL`;
}

/** Extract {{tokens}} */
export function extractTokens(text: string): string[] {
  const out = new Set<string>();
  const re = /\{\{\s*([a-z][a-z0-9_]*)\s*\}\}/g;
  let m;
  while ((m = re.exec(text || ""))) out.add(m[1]);
  return [...out];
}

/** Validate template body: no unclosed braces, no <script>, no unknown tokens */
export function validateTemplateBody(subject: string, body: string, tokens: TokenMetadata[]): string[] {
  const errs: string[] = [];
  const combined = `${subject}\n${body}`;
  if (/<script\b/i.test(combined)) errs.push("script tags are not allowed");
  const openBraces = (combined.match(/\{\{/g) || []).length;
  const closeBraces = (combined.match(/\}\}/g) || []).length;
  if (openBraces !== closeBraces) errs.push("unclosed {{ }} token detected");
  const known = new Set(tokens.map((t) => t.key));
  for (const t of extractTokens(combined)) {
    if (!known.has(t)) errs.push(`unknown token: {{${t}}}`);
  }
  // required non-server tokens must appear
  for (const t of tokens.filter((x) => x.required && !x.server_provided)) {
    if (!combined.includes(`{{${t.key}}}`)) errs.push(`required token {{${t.key}}} not used in subject/body`);
  }
  return errs;
}

/** Render preview with sample values */
export function renderPreview(text: string, tokens: TokenMetadata[]): string {
  let out = text || "";
  const samples: Record<string, string> = {};
  for (const t of tokens) samples[t.key] = t.sample || `[${t.key}]`;
  samples["request_no"] = "CR-PREVIEW-000001";
  samples["generated_at"] = new Date().toLocaleString();
  out = out.replace(/\{\{\s*([a-z][a-z0-9_]*)\s*\}\}/g, (_, k) => samples[k] ?? `[${k}]`);
  return out;
}

// ---- RPC wrappers ----

export async function upsertRegistry(payload: RegistryPayload, reason: string) {
  const { data, error } = await (supabase as any).rpc("upsert_comm_hub_module_event_registry", {
    p_payload: payload,
    p_reason: reason,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function updateTokenMetadata(
  moduleCode: string,
  eventCode: string,
  channel: string,
  tokens: TokenMetadata[],
  reason: string,
) {
  const { data, error } = await (supabase as any).rpc("update_comm_hub_registry_token_metadata", {
    p_module_code: moduleCode,
    p_event_code: eventCode,
    p_channel: channel,
    p_token_metadata: tokens,
    p_reason: reason,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function createTemplateWithVersion(args: {
  template_code: string;
  template_name: string;
  module_code: string;
  module_name?: string;
  description?: string;
  template_category?: string;
  subject: string;
  body_html: string;
  body_text?: string;
  required_tokens: string[];
  change_summary?: string;
  reason: string;
  confirmNewVersion?: boolean;
}) {
  const { data, error } = await (supabase as any).rpc("create_comm_hub_template_with_version", {
    p_template: {
      template_code: args.template_code,
      template_name: args.template_name,
      module_code: args.module_code,
      module_name: args.module_name,
      description: args.description,
      template_category: args.template_category ?? "NOTIFICATION",
      template_type: "EMAIL",
    },
    p_version: {
      subject: args.subject,
      body_html: args.body_html,
      body_text: args.body_text,
      change_summary: args.change_summary,
      required_tokens: args.required_tokens,
    },
    p_reason: args.reason,
    p_confirm: args.confirmNewVersion ? "CREATE NEW TEMPLATE VERSION" : "",
  });
  if (error) throw new Error(error.message);
  return data as { template_id: string; template_code: string; version_id: string; version_no: number };
}

export async function ensureEventLiveControlDryRun(
  moduleCode: string,
  eventCode: string,
  channel: string,
  riskLevel: string,
  reason: string,
) {
  const { data, error } = await (supabase as any).rpc("ensure_comm_hub_event_live_control", {
    p_module_code: moduleCode,
    p_event_code: eventCode,
    p_channel: channel,
    p_risk_level: riskLevel,
    p_reason: reason,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function mapEventToTemplate(args: {
  moduleCode: string;
  eventCode: string;
  channel: string;
  templateCode: string;
  riskLevel: string;
  reason: string;
  senderProfileId?: string | null;
}) {
  const { data: authData } = await supabase.auth.getUser();
  const { data, error } = await (supabase as any).rpc("upsert_comm_hub_event_template_mapping_v2", {
    p_module_code: args.moduleCode,
    p_event_code: args.eventCode,
    p_channel: args.channel,
    p_template_code: args.templateCode,
    p_reason: args.reason,
    p_actor_user_id: authData?.user?.id ?? null,
    p_risk_level: args.riskLevel,
    p_sender_profile_id: args.senderProfileId ?? null,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function runEventPreflight(args: {
  moduleCode: string;
  eventCode: string;
  templateCode: string;
  tokens: Record<string, string>;
}) {
  const { data, error } = await (supabase as any).functions.invoke("comm-hub-event-pilot", {
    body: {
      action: "preflight",
      moduleCode: args.moduleCode,
      eventCode: args.eventCode,
      templateCode: args.templateCode,
      recipientEmail: LOCKED_RECIPIENT,
      recipientName: "Dry-Run Recipient",
      tokens: args.tokens,
    },
  });
  if (error) throw new Error((error as any)?.message ?? "preflight failed");
  return data;
}

export async function runDryRunValidation(args: {
  moduleCode: string;
  eventCode: string;
  templateCode: string;
  tokens: Record<string, string>;
  reason: string;
}) {
  const { data, error } = await (supabase as any).functions.invoke("comm-hub-event-pilot", {
    body: {
      action: "dry_run",
      moduleCode: args.moduleCode,
      eventCode: args.eventCode,
      templateCode: args.templateCode,
      recipientEmail: LOCKED_RECIPIENT,
      recipientName: "Dry-Run Recipient",
      tokens: args.tokens,
      reason: args.reason,
      typedConfirmation: "SEND GENERIC EVENT DRY RUN",
      idempotencyKey: `wizard-${args.moduleCode}-${args.eventCode}-${crypto.randomUUID()}`,
    },
  });
  if (error) throw new Error((error as any)?.message ?? "dry-run failed");
  return data;
}

export async function fetchOnboardingStatus(moduleCode: string, eventCode: string, channel = "email") {
  const [{ data: registry }, { data: mapping }, { data: liveControl }] = await Promise.all([
    (supabase as any)
      .from("communication_hub_module_event_registry")
      .select("*")
      .eq("module_code", moduleCode)
      .eq("event_code", eventCode)
      .eq("channel", channel)
      .maybeSingle(),
    (supabase as any)
      .from("communication_hub_event_template_map")
      .select("*")
      .eq("module_code", moduleCode)
      .eq("event_code", eventCode)
      .eq("channel", channel)
      .maybeSingle(),
    (supabase as any)
      .from("communication_hub_event_live_control")
      .select("*")
      .eq("module_code", moduleCode)
      .eq("event_code", eventCode)
      .maybeSingle(),
  ]);
  return { registry, mapping, liveControl };
}

export async function findExistingTemplate(templateCode: string) {
  const { data } = await (supabase as any)
    .from("core_template")
    .select("id, code, name, status, active_version_id")
    .eq("code", templateCode)
    .maybeSingle();
  return data;
}
