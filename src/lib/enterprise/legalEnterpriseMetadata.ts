/**
 * Helper that resolves the Enterprise Context for a Legal module operation and
 * returns:
 *   - `metadata`: the JSONB snapshot stamped on every `lg_document_link` row
 *     (DMS metadata: organization, department, module, location, document type,
 *     confidentiality).
 *   - `notification`: the resolved tokens used when enqueuing/sending Legal
 *     notifications (organization name, department name, sender/reply-to,
 *     email signature, footer, disclaimer).
 *
 * Every Legal DMS write and Legal notification dispatch must route through
 * here so identity, branding and confidentiality stay consistent.
 */
import {
  resolveEnterpriseContext,
  type EnterpriseContext,
} from "@/lib/enterprise/enterpriseContextResolver";

export interface LegalEnterpriseDocMetadataInput {
  /** lg_case_id, lg_intake_id, legal_referral_id … whichever applies. */
  matterId?: string | null;
  matterKind?: "LG_CASE" | "LG_INTAKE" | "LEGAL_REFERRAL" | "LG_NOTICE" | "LG_ORDER" | "LG_HEARING" | "LG_SETTLEMENT" | null;
  documentType?: string | null;
  confidential?: boolean | null;
  locationId?: string | null;
}

export interface LegalEnterpriseDocMetadata {
  organization_id: string | null;
  organization_name: string | null;
  organization_short_name: string | null;
  department_id: string | null;
  department_code: string | null;
  department_name: string | null;
  module_id: string | null;
  module_code: string;
  module_name: string;
  location_id: string | null;
  location_name: string | null;
  matter_id: string | null;
  matter_kind: string | null;
  document_type: string | null;
  confidentiality_level: "CONFIDENTIAL" | "STANDARD";
  resolved_at: string;
}

export interface LegalEnterpriseNotificationTokens {
  organization_name: string;
  organization_short_name: string;
  department_name: string;
  department_code: string;
  module_name: string;
  location_name: string;
  location_address: string;
  sender_email: string;
  reply_to_email: string;
  email_signature_html: string;
  email_signature_text: string;
  email_footer: string;
  disclaimer: string;
  org_logo_url: string;
  org_seal_url: string;
}

export interface ResolvedLegalEnterprise {
  context: EnterpriseContext | null;
  metadata: LegalEnterpriseDocMetadata;
  notification: LegalEnterpriseNotificationTokens;
}

const EMPTY_METADATA = (input: LegalEnterpriseDocMetadataInput): LegalEnterpriseDocMetadata => ({
  organization_id: null,
  organization_name: null,
  organization_short_name: null,
  department_id: null,
  department_code: "LEGAL",
  department_name: null,
  module_id: null,
  module_code: "LEGAL",
  module_name: "Legal",
  location_id: input.locationId ?? null,
  location_name: null,
  matter_id: input.matterId ?? null,
  matter_kind: input.matterKind ?? null,
  document_type: input.documentType ?? null,
  confidentiality_level: input.confidential ? "CONFIDENTIAL" : "STANDARD",
  resolved_at: new Date().toISOString(),
});

const EMPTY_NOTIFICATION: LegalEnterpriseNotificationTokens = {
  organization_name: "",
  organization_short_name: "",
  department_name: "",
  department_code: "LEGAL",
  module_name: "Legal",
  location_name: "",
  location_address: "",
  sender_email: "",
  reply_to_email: "",
  email_signature_html: "",
  email_signature_text: "",
  email_footer: "",
  disclaimer: "",
  org_logo_url: "",
  org_seal_url: "",
};

export async function resolveLegalEnterprise(
  input: LegalEnterpriseDocMetadataInput = {},
): Promise<ResolvedLegalEnterprise> {
  let ctx: EnterpriseContext | null = null;
  try {
    ctx = await resolveEnterpriseContext({
      moduleCode: "LEGAL",
      departmentCode: "LEGAL",
      locationId: input.locationId ?? null,
      documentType: input.documentType ?? null,
    });
  } catch {
    ctx = null;
  }

  if (!ctx) {
    return {
      context: null,
      metadata: EMPTY_METADATA(input),
      notification: { ...EMPTY_NOTIFICATION },
    };
  }

  const org: any = ctx.organization ?? {};
  const dept: any = ctx.department ?? {};
  const mod = ctx.module ?? ({ id: null, code: "LEGAL", displayName: "Legal" } as any);
  const loc: any = ctx.location ?? {};
  const sig: any = ctx.email_signature ?? {};
  const footer: any = ctx.footer ?? {};
  const disc: any = ctx.disclaimer ?? {};

  const metadata: LegalEnterpriseDocMetadata = {
    organization_id: org.id ?? null,
    organization_name: org.name ?? null,
    organization_short_name: org.shortName ?? null,
    department_id: dept.id ?? null,
    department_code: dept.code ?? "LEGAL",
    department_name: dept.name ?? null,
    module_id: mod.id ?? null,
    module_code: mod.code ?? "LEGAL",
    module_name: mod.displayName ?? "Legal",
    location_id: input.locationId ?? loc.id ?? null,
    location_name: loc.name ?? null,
    matter_id: input.matterId ?? null,
    matter_kind: input.matterKind ?? null,
    document_type: input.documentType ?? null,
    confidentiality_level: input.confidential ? "CONFIDENTIAL" : "STANDARD",
    resolved_at: new Date().toISOString(),
  };

  const notification: LegalEnterpriseNotificationTokens = {
    organization_name: org.name ?? "",
    organization_short_name: org.shortName ?? "",
    department_name: dept.name ?? "",
    department_code: dept.code ?? "LEGAL",
    module_name: mod.displayName ?? "Legal",
    location_name: loc.name ?? "",
    location_address: loc.address ?? loc.addressBlock ?? "",
    sender_email: sig.senderEmail || loc.email || "",
    reply_to_email: sig.senderEmail || loc.email || "",
    email_signature_html: sig.signatureHtml ?? "",
    email_signature_text: sig.signatureText ?? "",
    email_footer: footer.html ?? "",
    disclaimer: disc.standard ?? "",
    org_logo_url: org.primaryLogoUrl ?? "",
    org_seal_url: org.sealUrl ?? "",
  };

  return { context: ctx, metadata, notification };
}
