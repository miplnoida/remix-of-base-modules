/**
 * EPIC 3D-UX — Shared cell renderers / badges / formatters for all
 * Communication Hub listing screens. Pure presentation. No side effects
 * apart from copy-to-clipboard toast feedback.
 */
import { useCallback } from "react";
import { format, formatDistanceToNowStrict } from "date-fns";
import { Copy } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { maskEmail as _maskEmail, maskPhone as _maskPhone } from "../utils/mask";

// ─── masking passthroughs ───────────────────────────────────────────
export function MaskedEmail({ value }: { value: string | null | undefined }) {
  return <span className="text-xs">{_maskEmail(value ?? "")}</span>;
}
export function MaskedPhone({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  return <span className="text-xs text-muted-foreground">{_maskPhone(value)}</span>;
}

// ─── truncated ids w/ copy-on-click ─────────────────────────────────
export function TruncatedId({
  value,
  length = 8,
  label = "id",
}: {
  value: string | null | undefined;
  length?: number;
  label?: string;
}) {
  const onCopy = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!value) return;
      navigator.clipboard.writeText(value).then(
        () => toast.success(`${label} copied`),
        () => toast.error(`Failed to copy ${label}`),
      );
    },
    [value, label],
  );
  if (!value) return <span className="text-muted-foreground">—</span>;
  const short = value.length > length ? `${value.slice(0, length)}…` : value;
  return (
    <button
      type="button"
      onClick={onCopy}
      title={`Click to copy ${label}: ${value}`}
      className="inline-flex items-center gap-1 font-mono text-[10px] hover:text-primary focus:outline-none focus:ring-1 focus:ring-primary rounded px-0.5"
    >
      {short}
      <Copy className="h-2.5 w-2.5 opacity-50" aria-hidden />
    </button>
  );
}

// ─── time formatters ────────────────────────────────────────────────
export function AbsoluteTime({
  value,
  pattern = "yyyy-MM-dd HH:mm",
}: {
  value: string | null | undefined;
  pattern?: string;
}) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  try {
    return (
      <span className="text-xs font-mono" title={new Date(value).toISOString()}>
        {format(new Date(value), pattern)}
      </span>
    );
  } catch {
    return <span className="text-muted-foreground">—</span>;
  }
}
export function RelativeTime({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  try {
    const d = new Date(value);
    return (
      <span className="text-xs" title={format(d, "yyyy-MM-dd HH:mm:ss")}>
        {formatDistanceToNowStrict(d, { addSuffix: true })}
      </span>
    );
  } catch {
    return <span className="text-muted-foreground">—</span>;
  }
}

// ─── badges ─────────────────────────────────────────────────────────
type BadgeVariant = "default" | "secondary" | "outline" | "destructive";

const DELIVERY_STATUS: Record<string, BadgeVariant> = {
  pending: "secondary",
  queued: "secondary",
  sending: "secondary",
  sent: "default",
  delivered: "default",
  failed: "destructive",
  bounced: "destructive",
  complained: "destructive",
  cancelled: "outline",
  suppressed: "outline",
};

export function StatusBadge({
  value,
  map = DELIVERY_STATUS,
}: {
  value: string | null | undefined;
  map?: Record<string, BadgeVariant>;
}) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  const variant = map[value] ?? "outline";
  return (
    <Badge variant={variant} className="text-[10px] font-normal">
      {value}
    </Badge>
  );
}

export function TestLiveBadge({ testMode }: { testMode: boolean | null | undefined }) {
  if (testMode == null) return <span className="text-muted-foreground">—</span>;
  return (
    <Badge variant={testMode ? "secondary" : "default"} className="text-[10px]">
      {testMode ? "test" : "live"}
    </Badge>
  );
}

export function RiskBadge({ risk }: { risk: string | null | undefined }) {
  if (!risk) return <span className="text-muted-foreground">—</span>;
  const variant: BadgeVariant =
    risk === "high" ? "destructive" : risk === "medium" ? "secondary" : "outline";
  return (
    <Badge variant={variant} className="text-[10px]">
      {risk}
    </Badge>
  );
}

export function YesNoBadge({
  value,
  yesLabel = "yes",
  noLabel = "no",
}: {
  value: boolean | null | undefined;
  yesLabel?: string;
  noLabel?: string;
}) {
  if (value == null) return <span className="text-muted-foreground">—</span>;
  return (
    <Badge variant={value ? "default" : "outline"} className="text-[10px]">
      {value ? yesLabel : noLabel}
    </Badge>
  );
}

// ─── module/event pair ──────────────────────────────────────────────
export function ModuleEventPair({
  moduleCode,
  eventCode,
  className,
}: {
  moduleCode: string | null | undefined;
  eventCode: string | null | undefined;
  className?: string;
}) {
  if (!moduleCode && !eventCode) return <span className="text-muted-foreground">—</span>;
  return (
    <div className={cn("text-xs leading-tight", className)}>
      <div>{moduleCode ?? "—"}</div>
      <div className="text-muted-foreground">{eventCode ?? ""}</div>
    </div>
  );
}
