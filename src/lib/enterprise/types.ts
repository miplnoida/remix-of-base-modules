/**
 * Enterprise Communication Framework — shared types
 *
 * Every module (Legal, Benefits, Compliance, Finance, HR, Registration,
 * Employer Services, future modules) consumes communications exclusively
 * through `resolveCommunication()` and `generateDocument()` which return
 * these types. No module reads `comm_*` or `core_*` tables directly.
 */

import type { CommunicationContext } from "@/lib/comm/communicationResolver";

/* ------------------------------------------------------------------ */
/* Profiles                                                            */
/* ------------------------------------------------------------------ */

export type CommunicationProfileCode =
  | "STANDARD_LETTER"
  | "LEGAL_NOTICE"
  | "BENEFIT_NOTICE"
  | "PAYMENT_NOTICE"
  | "CERTIFICATE"
  | "STATEMENT"
  | "RECEIPT"
  | "EMAIL"
  | "SMS"
  | "PORTAL"
  | "MOBILE_PUSH";

export type DocumentProfileCode =
  | "RECEIPT"
  | "CERTIFICATE"
  | "STATEMENT"
  | "LETTER"
  | "NOTICE"
  | "MEMO";

export type OwnerScope =
  | "GLOBAL"
  | "ORGANIZATION"
  | "MODULE"
  | "DEPARTMENT"
  | "LOCATION"
  | "USER";

export type DeliveryChannel =
  | "EMAIL"
  | "PRINT"
  | "PDF"
  | "SMS"
  | "PORTAL"
  | "DMS"
  | "API"
  | "MOBILE_PUSH";

/* ------------------------------------------------------------------ */
/* Resolver inputs                                                     */
/* ------------------------------------------------------------------ */

export interface CommunicationRequest {
  /** Which module is sending — drives department / overrides. */
  moduleCode: string;
  /** Optional department override (otherwise resolved from module). */
  departmentCode?: string | null;
  /** Optional location override (otherwise dept default). */
  locationId?: string | null;
  /** Communication Profile to apply (drives default assets & text blocks). */
  profileCode?: CommunicationProfileCode | null;
  /** Document Profile to apply (only for document-shaped output). */
  documentProfileCode?: DocumentProfileCode | null;
  /** Template code (from core_template.code). */
  templateCode?: string | null;
  /** Target channel(s). */
  channels?: DeliveryChannel[];
  /** Token values supplied by the caller. */
  tokens?: Record<string, unknown>;
  /** Acting user (for audit and {{user.*}} tokens). */
  actorUserCode?: string | null;
}

/* ------------------------------------------------------------------ */
/* Resolver output                                                     */
/* ------------------------------------------------------------------ */

export interface ResolvedCommunication {
  /** The full inherited communication context (org → dept → location). */
  context: CommunicationContext;
  /** Resolved profile rows, when present. */
  communicationProfile: ResolvedProfile | null;
  documentProfile: ResolvedProfile | null;
  /** Resolved template (with inheritance chain applied). */
  template: ResolvedTemplate | null;
  /** All assets resolved for this communication (logo, signature, stamp…). */
  assets: ResolvedAssetMap;
  /** All text blocks resolved for this communication. */
  textBlocks: ResolvedTextBlockMap;
  /** Channels enabled for this resolution. */
  channels: DeliveryChannel[];
  /** Trace of inheritance decisions — drives the Health dashboard. */
  trace: ResolutionTraceEntry[];
}

export interface ResolvedProfile {
  id: string;
  code: string;
  name: string;
  owner_scope: OwnerScope;
  parent_id: string | null;
  /** Merged config after walking parent chain. */
  config: Record<string, unknown>;
}

export interface ResolvedTemplate {
  id: string;
  code: string;
  name: string;
  category: string | null;
  owner_scope: OwnerScope;
  parent_template_id: string | null;
  subject: string | null;
  body_html: string | null;
  body_text: string | null;
  channels: DeliveryChannel[];
  /** Tokens declared by the template (after inheritance). */
  tokens: string[];
}

export interface ResolvedAssetMap {
  [usageSlot: string]: ResolvedAssetRef | null;
}
export interface ResolvedAssetRef {
  id: string;
  code: string | null;
  category: string;
  url: string;
  resolved_via: OwnerScope | "SYSTEM_DEFAULT";
  is_fallback: boolean;
}

export interface ResolvedTextBlockMap {
  [code: string]: ResolvedTextBlock | null;
}
export interface ResolvedTextBlock {
  id: string;
  code: string;
  scope: OwnerScope;
  body_html: string;
  body_text: string;
  resolved_via: OwnerScope;
  is_fallback: boolean;
}

export interface ResolutionTraceEntry {
  layer:
    | "ORGANIZATION"
    | "MODULE"
    | "DEPARTMENT"
    | "LOCATION"
    | "USER"
    | "PROFILE"
    | "TEMPLATE"
    | "ASSET"
    | "TEXT_BLOCK";
  key: string;
  resolved_from: OwnerScope | "SYSTEM_DEFAULT" | "MISSING";
  ok: boolean;
  message?: string;
}

/* ------------------------------------------------------------------ */
/* Document generation                                                 */
/* ------------------------------------------------------------------ */

export interface GenerateDocumentRequest extends CommunicationRequest {
  /** Required when generating an actual document. */
  documentProfileCode: DocumentProfileCode;
  /** Render output formats. */
  outputs?: Array<"html" | "pdf" | "text">;
  /** If true, persist to core_generated_document and DMS. */
  persist?: boolean;
}

export interface GeneratedDocumentResult {
  resolution: ResolvedCommunication;
  html: string;
  text: string;
  pdfBlobUrl?: string;
  generatedDocumentId?: string;
  /** Validation issues that did not block generation (warnings). */
  warnings: string[];
}
