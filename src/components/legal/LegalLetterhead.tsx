import { useOrganizationContext } from "@/hooks/org/useOrganizationContext";
import { useLgDepartmentProfileFull } from "@/hooks/legal/useLgDepartmentProfileFull";
import { buildDepartmentMergeContext } from "@/lib/legal/departmentMergeContext";

interface Props {
  variant?: "full" | "compact";
  className?: string;
}

/**
 * Shared letterhead/header block used by legal PDFs, print layouts, and
 * generated-document previews.
 *
 * Reads from the enterprise `organizationContextResolver` (organization +
 * department + module + primary location + branding assets). Falls back to
 * the legacy `lg_department_profile` row ONLY to preserve `show_on_pdfs` and
 * any field that has not been migrated to `core_department_profile` yet.
 *
 * @see resolveOrganizationContext
 */
export function LegalLetterhead({ variant = "full", className }: Props) {
  const { data: ctx } = useOrganizationContext({ moduleCode: "LEGAL" });
  const { data: legacy } = useLgDepartmentProfileFull();
  const legacyCtx = buildDepartmentMergeContext(legacy);

  if (legacy?.show_on_pdfs === false) return null;

  const institution = ctx?.organization?.legal_name || ctx?.organization?.short_name || legacyCtx.institution;
  const department  = ctx?.department?.department_name || legacyCtx.department;
  const logoUrl     = ctx?.logo?.url || ctx?.letterhead?.url || ctx?.organization?.primary_logo_url || legacyCtx.logoUrl;
  const loc         = ctx?.location;
  const addressBlock = loc
    ? [loc.address_line_1, loc.address_line_2, loc.city, loc.country_code].filter(Boolean).join("\n")
    : legacyCtx.addressBlock;
  const phone   = loc?.phone   || legacyCtx.phone;
  const email   = loc?.email   || legacyCtx.email;
  const website = ctx?.organization?.website || legacyCtx.website;

  if (!institution && !department) return null;

  return (
    <div className={`flex items-start gap-4 border-b pb-3 ${className ?? ""}`}>
      {logoUrl && <img src={logoUrl} alt="" className="h-14 w-14 object-contain" />}
      <div className="flex-1">
        <div className="text-base font-semibold leading-tight">{institution}</div>
        <div className="text-sm text-muted-foreground">{department}</div>
        {variant === "full" && addressBlock && (
          <div className="text-xs text-muted-foreground mt-1 whitespace-pre-line">{addressBlock}</div>
        )}
        {variant === "full" && (phone || email || website) && (
          <div className="text-xs text-muted-foreground mt-1">
            {[phone && `Tel: ${phone}`, email, website].filter(Boolean).join("  •  ")}
          </div>
        )}
      </div>
    </div>
  );
}

