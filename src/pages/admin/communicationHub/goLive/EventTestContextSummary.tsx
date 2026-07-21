/**
 * CH-SIMPLE-P3F-UX.6B — Event Test Context summary card.
 *
 * Read-only informational summary rendered between event selection and the
 * readiness check. It NEVER decides anything and is never authoritative —
 * every field is a projection of state the operator already sees elsewhere.
 * Editing must happen in the linked setting screens.
 */
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { CheckCircle2, AlertTriangle, MinusCircle } from "lucide-react";
import { maskEmailForDisplay } from "./resolveTestRecipient";
import type { GoLiveRecipientResolution } from "./resolveTestRecipient";

type RowStatus = "ready" | "needs_attention" | "missing";

interface Row {
  label: string;
  value: string;
  status: RowStatus;
  fixHref?: string;
}

const STATUS_META: Record<RowStatus, { label: string; tone: string; Icon: typeof CheckCircle2 }> = {
  ready: { label: "Ready", tone: "text-emerald-600", Icon: CheckCircle2 },
  needs_attention: { label: "Needs attention", tone: "text-amber-600", Icon: AlertTriangle },
  missing: { label: "Missing", tone: "text-destructive", Icon: MinusCircle },
};

interface Props {
  moduleCode: string;
  moduleDisplay?: string | null;
  eventCode: string;
  eventDisplay?: string | null;
  channel: string;
  resolution: GoLiveRecipientResolution | null;
  templateName?: string | null;
  templateVersion?: string | null;
  senderMasked?: string | null;
  testDataSource?: string | null;
}

export default function EventTestContextSummary({
  moduleCode,
  moduleDisplay,
  eventCode,
  eventDisplay,
  channel,
  resolution,
  templateName,
  templateVersion,
  senderMasked,
  testDataSource,
}: Props) {
  const recipient =
    resolution && resolution.resolved === true ? resolution.recipient : null;

  const rows: Row[] = [
    {
      label: "Module",
      value: moduleDisplay ? `${moduleDisplay} (${moduleCode})` : moduleCode || "—",
      status: moduleCode ? "ready" : "missing",
    },
    {
      label: "Event",
      value: eventDisplay ? `${eventDisplay} (${eventCode})` : eventCode || "—",
      status: eventCode ? "ready" : "missing",
    },
    {
      label: "Channel",
      value: (channel || "email").toUpperCase(),
      status: channel ? "ready" : "missing",
    },
    {
      label: "Test recipient",
      value: recipient ? (maskEmailForDisplay(recipient) ?? recipient) : "—",
      status: recipient ? "ready" : "missing",
      fixHref: "/admin/communication-hub/recipient-policy",
    },
    {
      label: "Template",
      value: templateName ?? "—",
      status: templateName ? "ready" : "missing",
      fixHref: "/admin/communication-hub/design",
    },
    {
      label: "Template version",
      value: templateVersion ?? "—",
      status: templateVersion ? "ready" : "needs_attention",
      fixHref: "/admin/communication-hub/design",
    },
    {
      label: "Sender",
      value: senderMasked ?? "—",
      status: senderMasked ? "ready" : "needs_attention",
      fixHref: "/admin/communication-hub/design/sender-profiles",
    },
    {
      label: "Test-data source",
      value: testDataSource ?? "—",
      status: testDataSource ? "ready" : "missing",
      fixHref: "/admin/communication-hub/design",
    },
  ];

  return (
    <div className="border rounded-md bg-muted/30">
      <div className="px-3 py-2 border-b text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Event test context
      </div>
      <div className="divide-y">
        {rows.map((row) => {
          const meta = STATUS_META[row.status];
          return (
            <div
              key={row.label}
              className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">{row.label}</div>
                <div className="truncate font-medium">{row.value}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className={`flex items-center gap-1 ${meta.tone}`}>
                  <meta.Icon className="h-3 w-3" />
                  {meta.label}
                </Badge>
                {row.status !== "ready" && row.fixHref && (
                  <Link
                    to={row.fixHref}
                    className="text-xs underline text-muted-foreground hover:text-foreground"
                  >
                    Fix
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="px-3 py-2 text-xs text-muted-foreground border-t">
        Informational only. Editing is done from the linked setting screens.
      </div>
    </div>
  );
}
