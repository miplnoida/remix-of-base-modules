/**
 * EnterpriseContextDebugPanel
 * ---------------------------
 * Dev-only collapsible panel that exposes the Enterprise Context resolver
 * trace (which slot resolved to which scope). NEVER renders in production
 * builds so end users do not see technical traces.
 *
 * Enabled when `import.meta.env.DEV === true` or
 * `VITE_DEBUG_ENTERPRISE_CONTEXT === "true"`.
 */
import { useState } from "react";
import { Bug, ChevronDown, ChevronRight } from "lucide-react";

interface TraceEntry {
  slot: string;
  source: string;
  ok: boolean;
}

interface Props {
  moduleCode: string;
  trace: TraceEntry[];
  labels?: {
    moduleName?: string;
    departmentName?: string;
    organizationName?: string;
    locationName?: string;
  };
}

function isDebugEnabled() {
  try {
    if ((import.meta as any).env?.DEV) return true;
    if ((import.meta as any).env?.VITE_DEBUG_ENTERPRISE_CONTEXT === "true") return true;
  } catch {
    /* ignore */
  }
  return false;
}

export function EnterpriseContextDebugPanel({ moduleCode, trace, labels }: Props) {
  const [open, setOpen] = useState(false);
  if (!isDebugEnabled()) return null;
  if (!trace || trace.length === 0) return null;

  return (
    <div className="border border-dashed border-amber-300 bg-amber-50/40 rounded text-xs">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 px-2 py-1 text-amber-800 hover:bg-amber-100/50 w-full text-left"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <Bug className="h-3 w-3" />
        <span className="font-mono">enterprise-context · {moduleCode}</span>
        <span className="ml-auto text-amber-700">
          {trace.filter((t) => t.ok).length}/{trace.length} resolved
        </span>
      </button>
      {open && (
        <div className="px-3 pb-2 space-y-1">
          {labels && (
            <div className="text-amber-900 font-mono">
              module=<b>{labels.moduleName}</b>{" "}
              dept=<b>{labels.departmentName}</b>{" "}
              org=<b>{labels.organizationName || "—"}</b>{" "}
              loc=<b>{labels.locationName || "—"}</b>
            </div>
          )}
          <div className="grid grid-cols-3 gap-x-3 font-mono">
            {trace.map((t, i) => (
              <div key={i} className="flex gap-1">
                <span className={t.ok ? "text-emerald-700" : "text-rose-700"}>●</span>
                <span>{t.slot}</span>
                <span className="text-muted-foreground">→ {t.source}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
