import { useCommunicationContext } from "@/hooks/comm/useCommunicationContext";
import { useLgDepartmentProfileFull } from "@/hooks/legal/useLgDepartmentProfileFull";
import { buildDepartmentMergeContext } from "@/lib/legal/departmentMergeContext";

interface Props {
  variant?: "full" | "compact";
  className?: string;
}

/**
 * Shared letterhead/header block used by legal PDFs, print layouts, and
 * generated-document previews. Reads from the enterprise Communication
 * Resolver (organization + department + primary location + letterhead asset);
 * falls back to the legacy `lg_department_profile` row when the enterprise
 * record has not been seeded yet.
 */
export function LegalLetterhead({ variant = "full", className }: Props) {
  const { data: ctx } = useCommunicationContext("LEGAL");
  const { data: legacy } = useLgDepartmentProfileFull();
  const legacyCtx = buildDepartmentMergeContext(legacy);

  if (legacy?.show_on_pdfs === false) return null;

  const institution = ctx?.organization.name || legacyCtx.institution;
  const department  = ctx?.department.name   || legacyCtx.department;
  const logoUrl     = ctx?.letterhead.logo || ctx?.organization.primaryLogoUrl || legacyCtx.logoUrl;
  const addressBlock = ctx?.location.addressBlock || legacyCtx.addressBlock;
  const phone   = ctx?.location.phone   || legacyCtx.phone;
  const email   = ctx?.location.email   || legacyCtx.email;
  const website = ctx?.organization.website || legacyCtx.website;

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
