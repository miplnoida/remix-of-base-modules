/**
 * LegalDocumentRenderer
 * -----------------------------------------------------------------------------
 * Reusable preview/print composition for any Legal document. Consumes the
 * shared EnterpriseContext (org/dept/module/location/branding/letterhead/
 * signature/footer/disclaimer/seal/watermark) so Legal NEVER carries its own
 * branding configuration.
 *
 * Tokens supported (resolved by `resolveTokens`):
 *   {{organization.name|shortName|website|logo|seal}}
 *   {{department.name|code|manager}}
 *   {{location.addressBlock|phone|email}}
 *   {{letterhead.header|footer}}
 *   {{email.signature}}
 *   {{disclaimer.standard}}
 *   {{case.caseNo|caseType|title|status}}
 *   {{party.name|address}}
 *   {{hearing.date|time}}
 *   {{order.reference}}
 *   {{amount.outstanding}}
 *   {{generated.date|by}}
 */
import { useMemo } from "react";
import { useEnterpriseContext } from "@/hooks/enterprise/useEnterpriseContext";
import { Loader2, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/** Safe innerHTML wrapper — never crashes the preview if html is malformed. */
function SafeHtml({ html, className }: { html?: string | null; className?: string }) {
  try {
    if (!html) return null;
    return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
  } catch {
    return <div className={className}><span className="text-muted-foreground">[content unavailable]</span></div>;
  }
}

export interface LegalRenderTokens {
  case?: {
    caseNo?: string | null;
    caseType?: string | null;
    title?: string | null;
    status?: string | null;
  };
  party?: { name?: string | null; address?: string | null };
  hearing?: { date?: string | null; time?: string | null };
  order?: { reference?: string | null };
  amount?: { outstanding?: string | number | null };
  generated?: { date?: string | null; by?: string | null };
  /** Free-form extras merged after standard tokens. */
  extra?: Record<string, unknown>;
}

export interface LegalDocumentRendererProps {
  moduleCode?: string;          // defaults LEGAL
  departmentCode?: string;      // defaults LEGAL
  documentType?: string | null; // category code (e.g. LG_DEMAND)
  templateId?: string | null;
  locationId?: string | null;
  /** Raw template body (HTML). Tokens will be substituted in-place. */
  bodyHtml: string;
  /** Document title shown above body. */
  title?: string;
  tokens?: LegalRenderTokens;
  /** Show a diagonal "DRAFT" watermark across the page. */
  draft?: boolean;
}

function tokenValue(path: string, ctx: any, t: LegalRenderTokens): string {
  const [root, key] = path.split(".");
  if (!root || !key) return `{{${path}}}`;
  const map: Record<string, any> = {
    organization: {
      name: ctx?.organization?.name,
      shortName: ctx?.organization?.shortName ?? ctx?.organization?.name,
      website: ctx?.organization?.website,
      logo: ctx?.organization?.primaryLogoUrl,
      seal: ctx?.organization?.sealUrl,
    },
    department: {
      name: ctx?.department?.name,
      code: (ctx?.department as any)?.code,
      manager: (ctx?.department as any)?.headName ?? (ctx?.department as any)?.managerName,
    },
    location: {
      addressBlock: ctx?.location?.addressBlock ?? ctx?.location?.address,
      phone: ctx?.location?.phone,
      email: ctx?.location?.email,
    },
    letterhead: {
      header: ctx?.letterhead?.header ?? "",
      footer: ctx?.letterhead?.footer ?? "",
    },
    email: { signature: (ctx as any)?.email?.signatureHtml ?? (ctx as any)?.email?.signatureText ?? "" },
    disclaimer: { standard: (ctx as any)?.disclaimer?.standard ?? "" },
    case: t.case ?? {},
    party: t.party ?? {},
    hearing: t.hearing ?? {},
    order: t.order ?? {},
    amount: t.amount ?? {},
    generated: {
      date: t.generated?.date ?? new Date().toLocaleDateString("en-GB"),
      by: t.generated?.by ?? "",
    },
  };
  const v = map[root]?.[key];
  if (v === undefined || v === null || v === "") return `{{${path}}}`;
  return String(v);
}

function resolveTokens(html: string, ctx: any, t: LegalRenderTokens): string {
  if (!html) return "";
  return html.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, p) => tokenValue(p, ctx, t));
}

export function LegalDocumentRenderer({
  moduleCode = "LEGAL",
  departmentCode = "LEGAL",
  documentType = null,
  templateId = null,
  locationId = null,
  bodyHtml,
  title,
  tokens = {},
  draft = false,
}: LegalDocumentRendererProps) {
  const { data: ctx, isLoading } = useEnterpriseContext({
    moduleCode,
    departmentCode,
    documentType,
    templateId,
    locationId,
  });

  const resolvedBody = useMemo(
    () => resolveTokens(bodyHtml, ctx, tokens),
    [bodyHtml, ctx, tokens],
  );
  const resolvedHeader = useMemo(
    () => resolveTokens(ctx?.letterhead?.header ?? "", ctx, tokens),
    [ctx, tokens],
  );
  const resolvedFooter = useMemo(
    () => resolveTokens(ctx?.letterhead?.footer ?? (ctx as any)?.print?.footer ?? "", ctx, tokens),
    [ctx, tokens],
  );
  const resolvedSignature = useMemo(
    () => resolveTokens(
      (ctx as any)?.email?.signatureHtml ?? (ctx as any)?.email?.signatureText ?? "",
      ctx, tokens,
    ),
    [ctx, tokens],
  );
  const resolvedDisclaimer = useMemo(
    () => resolveTokens((ctx as any)?.disclaimer?.standard ?? "", ctx, tokens),
    [ctx, tokens],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading enterprise context…
      </div>
    );
  }

  const logo = ctx?.organization?.primaryLogoUrl;
  const seal = ctx?.organization?.sealUrl;

  // Surface which branding slots are missing (only when previewing/draft).
  const missingAssets: string[] = [];
  if (!resolvedHeader && !logo) missingAssets.push("letterhead");
  if (!resolvedSignature) missingAssets.push("signature");
  if (!seal) missingAssets.push("seal");
  if (!resolvedDisclaimer) missingAssets.push("disclaimer");
  if (!resolvedFooter) missingAssets.push("footer");

  return (
    <div className="space-y-3">
      {draft && missingAssets.length > 0 && (
        <Alert variant="default" className="border-amber-300 bg-amber-50 text-amber-900">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-900">Missing branding assets</AlertTitle>
          <AlertDescription className="text-amber-900/80">
            The following slots have no resolved asset and will be blank on the
            issued document: <strong>{missingAssets.join(", ")}</strong>. Configure
            them in the Legal Department Profile or Organization defaults.
          </AlertDescription>
        </Alert>
      )}

      <div className="relative bg-white text-slate-900 border rounded-md shadow-sm p-6 overflow-hidden text-sm leading-relaxed">
        {/* DRAFT watermark — preview only; issued PDFs must pass draft={false}. */}
        {draft && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 flex items-center justify-center select-none"
          >
            <span className="text-[120px] font-black opacity-10 rotate-[-25deg] text-red-600">
              DRAFT
            </span>
          </div>
        )}

        {/* Letterhead */}
        <header className="relative z-10 flex items-start justify-between gap-4 border-b pb-3 mb-4">
          <div className="flex items-start gap-3">
            {logo ? (
              <img src={logo} alt="Logo" className="h-14 w-auto object-contain"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
            ) : null}
            <div>
              <div className="font-bold text-base">
                {ctx?.organization?.name ?? "Organization"}
              </div>
              <div className="text-xs text-muted-foreground">
                {ctx?.department?.name ?? "Legal Department"}
                {ctx?.department?.code ? ` (${ctx.department.code})` : ""}
              </div>
              <div className="text-xs whitespace-pre-line text-muted-foreground">
                {ctx?.location?.address ?? ""}
              </div>
              <div className="text-xs text-muted-foreground">
                {[ctx?.location?.phone, ctx?.location?.email].filter(Boolean).join(" · ")}
              </div>
            </div>
          </div>
          <SafeHtml html={resolvedHeader} className="text-xs max-w-[40%]" />
        </header>

        {/* Title / case meta */}
        {(title || tokens.case?.caseNo) && (
          <div className="relative z-10 mb-4">
            {title && <h2 className="text-lg font-semibold">{title}</h2>}
            {tokens.case?.caseNo && (
              <div className="text-xs text-muted-foreground">
                Case No: <span className="font-medium text-foreground">{tokens.case.caseNo}</span>
                {tokens.case.caseType ? ` · ${tokens.case.caseType}` : ""}
              </div>
            )}
          </div>
        )}

        {/* Recipient block */}
        {tokens.party?.name && (
          <div className="relative z-10 mb-4 text-sm">
            <div className="font-medium">To: {tokens.party.name}</div>
            {tokens.party.address && (
              <div className="text-xs whitespace-pre-line text-muted-foreground">
                {tokens.party.address}
              </div>
            )}
          </div>
        )}

        {/* Body */}
        <SafeHtml
          className="relative z-10 prose prose-sm max-w-none"
          html={resolvedBody || "<p class='text-muted-foreground'>No content.</p>"}
        />

        {/* Signature + seal */}
        <div className="relative z-10 mt-8 flex items-end justify-between gap-6 border-t pt-4">
          <div className="text-xs whitespace-pre-line">
            {resolvedSignature ? (
              <SafeHtml html={resolvedSignature} />
            ) : (
              <span className="text-muted-foreground">Authorised Signature</span>
            )}
          </div>
          {seal ? (
            <img src={seal} alt="Seal" className="h-20 w-20 object-contain opacity-90"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
          ) : null}
        </div>

        {/* Disclaimer */}
        {resolvedDisclaimer && (
          <SafeHtml
            html={resolvedDisclaimer}
            className="relative z-10 mt-4 text-[10px] text-muted-foreground border-t pt-2"
          />
        )}

        {/* Footer */}
        {resolvedFooter && (
          <SafeHtml
            html={resolvedFooter}
            className="relative z-10 mt-4 text-[10px] text-muted-foreground border-t pt-2"
          />
        )}
      </div>
    </div>
  );
}

export default LegalDocumentRenderer;
