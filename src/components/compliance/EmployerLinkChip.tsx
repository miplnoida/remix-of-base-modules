import { Link } from "react-router-dom";
import { Building2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRegnoParam } from "@/hooks/useRegnoParam";

interface EmployerLinkChipProps {
  /** Employer registration number (regno). */
  regno: string | null | undefined;
  /** Optional display name shown alongside the regno. */
  name?: string | null;
  /** Show as link to Employer 360. Defaults true. */
  asLink?: boolean;
  className?: string;
}

/**
 * Inline chip used in Compliance lists / cards to surface and link to an
 * employer's Employer 360 page. Pairs with `useRegnoParam` so clicks from
 * Employer 360 → filtered list views and back round-trip cleanly.
 */
export function EmployerLinkChip({ regno, name, asLink = true, className }: EmployerLinkChipProps) {
  if (!regno) return <span className="text-muted-foreground">—</span>;
  const content = (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${className ?? ""}`}>
      <Building2 className="h-3 w-3 opacity-70" />
      {name && <span>{name}</span>}
      <span className="font-mono opacity-80">{regno}</span>
    </span>
  );
  if (!asLink) return content;
  return (
    <Link
      to={`/compliance/field/employer-360/${encodeURIComponent(regno)}`}
      className="hover:underline text-primary"
      title="Open Employer 360"
    >
      {content}
    </Link>
  );
}

/**
 * Yellow banner that compliance list pages render when filtered to a single
 * employer via `?regno=`. Includes a "Clear" affordance.
 */
export function RegnoFilterBanner() {
  const { regno, clearRegno } = useRegnoParam();
  if (!regno) return null;
  return (
    <div className="flex items-center justify-between rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4" aria-hidden="true" />
        <span>
          Filtered to employer <Badge variant="outline" className="ml-1 font-mono">{regno}</Badge>
        </span>
        <Link
          to={`/compliance/field/employer-360/${encodeURIComponent(regno)}`}
          className="ml-2 underline opacity-80 hover:opacity-100"
        >
          Open Employer 360
        </Link>
      </div>
      <Button size="sm" variant="ghost" onClick={clearRegno} className="h-7">
        <X className="h-3.5 w-3.5 mr-1" /> Clear
      </Button>
    </div>
  );
}
