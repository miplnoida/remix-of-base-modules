/**
 * SourceInspector — shows where every value on the rendered template comes from
 * (Organization / Department / Location / Asset Library / Text Block / System Default / Missing).
 *
 * The designer renders the live A4 preview on the left; this panel sits on the
 * right of (or below) the preview and gives the administrator full transparency
 * into the resolver chain so there is no guesswork about "why is this logo here?".
 */
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ExternalLink } from "lucide-react";

export type SourceScope =
  | "ORGANIZATION"
  | "MODULE"
  | "DEPARTMENT"
  | "LOCATION"
  | "ASSET_LIBRARY"
  | "TEXT_BLOCK"
  | "SYSTEM_DEFAULT"
  | "TEMPLATE"
  | "MISSING";

export interface SourceRow {
  label: string;
  value: string | null;
  scope: SourceScope;
  detail?: string;
  href?: string;
}

const SCOPE_STYLE: Record<SourceScope, string> = {
  ORGANIZATION: "bg-primary/10 text-primary border-primary/30",
  MODULE: "bg-secondary text-secondary-foreground",
  DEPARTMENT: "bg-accent text-accent-foreground",
  LOCATION: "bg-muted text-muted-foreground",
  ASSET_LIBRARY: "bg-blue-500/10 text-blue-700 border-blue-500/30",
  TEXT_BLOCK: "bg-purple-500/10 text-purple-700 border-purple-500/30",
  SYSTEM_DEFAULT: "bg-muted text-muted-foreground",
  TEMPLATE: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  MISSING: "bg-destructive/10 text-destructive border-destructive/30",
};

export function SourceInspector({ rows, title = "Source Inspector" }: { rows: SourceRow[]; title?: string }) {
  const missing = rows.filter((r) => r.scope === "MISSING");
  return (
    <div className="border rounded-md bg-background text-xs flex flex-col min-h-0">
      <div className="px-3 py-1.5 border-b font-medium flex items-center justify-between">
        <span>{title}</span>
        <span className="text-muted-foreground">{rows.length} values</span>
      </div>
      {missing.length > 0 && (
        <div className="px-3 py-2 border-b bg-destructive/5 text-destructive flex items-start gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>
            {missing.length} value{missing.length === 1 ? "" : "s"} could not be resolved — recipients will see blanks.
          </span>
        </div>
      )}
      <div className="overflow-y-auto divide-y">
        {rows.map((r, i) => (
          <div key={i} className="px-3 py-2 flex items-start gap-2 hover:bg-accent/30">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-medium">{r.label}</span>
                {r.href && (
                  <a href={r.href} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              <div className="text-muted-foreground truncate" title={r.value ?? ""}>
                {r.value || <span className="italic">— not set —</span>}
              </div>
              {r.detail && <div className="text-[10px] text-muted-foreground/80">{r.detail}</div>}
            </div>
            <Badge variant="outline" className={`text-[10px] ${SCOPE_STYLE[r.scope]}`}>
              {r.scope.replace("_", " ")}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
