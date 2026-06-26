import { useLgDepartmentProfileFull } from "@/hooks/legal/useLgDepartmentProfileFull";
import { buildDepartmentMergeContext } from "@/lib/legal/departmentMergeContext";

interface Props {
  variant?: "full" | "compact";
  className?: string;
}

/**
 * Shared letterhead/header block used by legal PDFs, print layouts, and
 * generated-document previews. Reads exclusively from Department Profile so
 * the issuing authority shown on every artefact stays in sync with admin
 * configuration.
 */
export function LegalLetterhead({ variant = "full", className }: Props) {
  const { data } = useLgDepartmentProfileFull();
  const ctx = buildDepartmentMergeContext(data);

  if (data?.show_on_pdfs === false) return null;
  if (!ctx.institution && !ctx.department) return null;

  return (
    <div className={`flex items-start gap-4 border-b pb-3 ${className ?? ""}`}>
      {ctx.logoUrl && (
        <img src={ctx.logoUrl} alt="" className="h-14 w-14 object-contain" />
      )}
      <div className="flex-1">
        <div className="text-base font-semibold leading-tight">{ctx.institution}</div>
        <div className="text-sm text-muted-foreground">{ctx.department}</div>
        {variant === "full" && (
          <div className="text-xs text-muted-foreground mt-1 whitespace-pre-line">
            {ctx.addressBlock}
          </div>
        )}
        {variant === "full" && (ctx.phone || ctx.email || ctx.website) && (
          <div className="text-xs text-muted-foreground mt-1">
            {[ctx.phone && `Tel: ${ctx.phone}`, ctx.email, ctx.website]
              .filter(Boolean)
              .join("  •  ")}
          </div>
        )}
      </div>
    </div>
  );
}
