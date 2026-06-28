import { useEnterpriseContext } from "@/hooks/enterprise/useEnterpriseContext";
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
 * Resolves organization / department / module / location / branding via
 * the enterprise context resolver (`resolveEnterpriseContext`). Falls back
 * to the legacy `lg_department_profile` row ONLY to preserve `show_on_pdfs`
 * and any field not yet migrated to `core_department_profile`.
 */
export function LegalLetterhead({ variant = "full", className }: Props) {
  const { data: ctx } = useEnterpriseContext({ moduleCode: "LEGAL" });
  const { data: legacy } = useLgDepartmentProfileFull();
  const legacyCtx = buildDepartmentMergeContext(legacy);

  if (legacy?.show_on_pdfs === false) return null;

  if (import.meta.env.DEV && ctx?.trace) {
    const missing = ctx.trace.filter((t) => !t.ok).map((t) => t.slot);
    if (missing.length) console.debug("[LegalLetterhead] missing slots:", missing);
  }

  const institution =
    ctx?.organization?.name || legacyCtx.institution;
  const department = ctx?.department?.name || legacyCtx.department;
  const logoUrl =
    ctx?.organization?.primaryLogoUrl ||
    ctx?.letterhead?.logo ||
    legacyCtx.logoUrl;
  const loc = ctx?.location;
  const addressBlock = loc?.addressBlock || legacyCtx.addressBlock;
  const phone = loc?.phone || legacyCtx.phone;
  const email = loc?.email || legacyCtx.email;
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
