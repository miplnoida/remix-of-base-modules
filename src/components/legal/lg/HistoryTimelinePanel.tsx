import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Bell, Building2, ClipboardCheck, FileSearch, FileText, Footprints,
  Gavel, HandCoins, Mail, ShieldAlert, User, Wallet,
} from "lucide-react";
import type { HistoryEvent } from "@/services/legal/legalReferralHistoryService";

const ICONS: Record<HistoryEvent["category"], any> = {
  OFFICER: User,
  NOTICE: Bell,
  VISIT: Footprints,
  AUDIT: FileSearch,
  INSPECTION: ClipboardCheck,
  RESPONSE: Mail,
  ARRANGEMENT: HandCoins,
  BREACH: ShieldAlert,
  CLAIM: FileText,
  AWARD: Building2,
  OVERPAYMENT: Wallet,
  COMMUNICATION: Mail,
  OTHER: Gavel,
};

const VARIANT: Record<HistoryEvent["category"], string> = {
  OFFICER: "bg-blue-50 text-blue-700",
  NOTICE: "bg-amber-50 text-amber-700",
  VISIT: "bg-emerald-50 text-emerald-700",
  AUDIT: "bg-purple-50 text-purple-700",
  INSPECTION: "bg-indigo-50 text-indigo-700",
  RESPONSE: "bg-cyan-50 text-cyan-700",
  ARRANGEMENT: "bg-teal-50 text-teal-700",
  BREACH: "bg-red-50 text-red-700",
  CLAIM: "bg-slate-50 text-slate-700",
  AWARD: "bg-green-50 text-green-700",
  OVERPAYMENT: "bg-orange-50 text-orange-700",
  COMMUNICATION: "bg-cyan-50 text-cyan-700",
  OTHER: "bg-gray-50 text-gray-700",
};

interface Props {
  title?: string;
  events: HistoryEvent[];
  summary?: { label: string; value: number | string }[];
  loading?: boolean;
  emptyMessage?: string;
}

export default function HistoryTimelinePanel({
  title = "Officer / Case History",
  events,
  summary,
  loading,
  emptyMessage,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {summary && summary.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {summary.map((s) => (
              <div key={s.label} className="border rounded-md p-2 text-center">
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div className="text-sm text-muted-foreground py-6 text-center">Loading history…</div>
        ) : events.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            {emptyMessage ?? "No history events for this entity."}
          </p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
            {events.map((e) => {
              const Icon = ICONS[e.category] ?? Gavel;
              return (
                <div key={e.key} className="flex items-start gap-3 border-l-2 border-muted pl-3 py-1">
                  <div className={`rounded-full p-1.5 ${VARIANT[e.category]}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{e.title}</span>
                      {e.reference_no && (
                        <Badge variant="outline" className="text-xs font-mono">
                          {e.reference_no}
                        </Badge>
                      )}
                    </div>
                    {e.description && (
                      <div className="text-xs text-muted-foreground">{e.description}</div>
                    )}
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {e.occurred_at ? new Date(e.occurred_at).toLocaleString() : "—"}
                      {e.actor ? ` · ${e.actor}` : ""}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
