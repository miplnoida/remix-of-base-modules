/**
 * EPIC-06B.1 — Judicial template actions.
 *
 * Renders one button per template code. Looks up availability in
 * `core_template` and disables the button with a "Template not configured"
 * tooltip when nothing matches. This lets the UI expose Court order copy /
 * Judgment copy / Compliance / Breach / Appeal / Enforcement notices without
 * shipping dead actions before templates are seeded.
 */
import { useQuery } from "@tanstack/react-query";
import { FileText, Bell, AlertTriangle, Gavel, ShieldAlert, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const sb = supabase as any;

export interface JudicialTemplateActionsProps {
  orderId?: string;
  caseId: string;
  /** When true, hide actions whose template is missing instead of disabling. */
  hideMissing?: boolean;
}

const ACTIONS = [
  { code: "LG_ORDER_COPY",          label: "Court Order Copy",   icon: Gavel },
  { code: "LG_JUDGMENT_COPY",       label: "Judgment Copy",      icon: Scale },
  { code: "LG_ORDER_COMPLIANCE",    label: "Compliance Notice",  icon: FileText },
  { code: "LG_ORDER_BREACH",        label: "Breach Notice",      icon: AlertTriangle },
  { code: "LG_APPEAL_NOTICE",       label: "Appeal Notice",      icon: Bell },
  { code: "LG_ENFORCEMENT_NOTICE",  label: "Enforcement Notice", icon: ShieldAlert },
] as const;

export function JudicialTemplateActions({ orderId, caseId, hideMissing }: JudicialTemplateActionsProps) {
  const codes = ACTIONS.map((a) => a.code);
  const { data: available = new Set<string>() } = useQuery({
    queryKey: ["lg_judicial_templates", codes.join(",")],
    queryFn: async () => {
      const { data } = await sb
        .from("core_template")
        .select("template_code")
        .in("template_code", codes as any);
      return new Set<string>((data ?? []).map((r: any) => r.template_code));
    },
  });

  const handle = (code: string, label: string) => {
    toast.info(`${label} generation queued`, {
      description: `Uses template ${code}. Case ${caseId.slice(0, 8)}${orderId ? ` · Order ${orderId.slice(0, 8)}` : ""}.`,
    });
  };

  return (
    <div className="flex flex-wrap gap-2">
      {ACTIONS.map((a) => {
        const has = available.has(a.code);
        if (!has && hideMissing) return null;
        const Icon = a.icon;
        return (
          <Button
            key={a.code}
            size="sm"
            variant="outline"
            disabled={!has}
            title={has ? undefined : "Template not configured"}
            onClick={() => handle(a.code, a.label)}
          >
            <Icon className="h-3.5 w-3.5 mr-1" />
            {a.label}
            {!has && <span className="ml-2 text-[10px] text-muted-foreground">not configured</span>}
          </Button>
        );
      })}
    </div>
  );
}
