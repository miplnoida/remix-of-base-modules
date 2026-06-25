import { useEffect, useState } from "react";
import { FileText, ExternalLink, Loader2, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  listReferralDocuments,
  getDownloadUrl,
  type ReferralDocumentRow,
} from "@/services/legal/coreLegalReferralDocumentService";
import {
  loadComplianceHistory,
  loadBenefitsHistory,
  type HistoryEvent,
} from "@/services/legal/legalReferralHistoryService";
import HistoryTimelinePanel from "./HistoryTimelinePanel";

interface Props {
  referralId: string;
  sourceModule: "COMPLIANCE" | "BENEFITS" | "FINANCE" | string;
  employerId?: string | null;
  ceCaseId?: string | null;
  claimId?: string | null;
  ssn?: string | null;
}

export default function ReferralPacketPanel({
  referralId,
  sourceModule,
  employerId,
  ceCaseId,
  claimId,
  ssn,
}: Props) {
  const [docs, setDocs] = useState<ReferralDocumentRow[]>([]);
  const [events, setEvents] = useState<HistoryEvent[]>([]);
  const [summary, setSummary] = useState<{ label: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [d, ctx] = await Promise.all([
          listReferralDocuments(referralId),
          sourceModule === "BENEFITS"
            ? loadBenefitsHistory({ claimId, ssn })
            : loadComplianceHistory({ employerId, ceCaseId }),
        ]);
        setDocs(d);
        setEvents(ctx.events);
        if (sourceModule === "BENEFITS") {
          const c = ctx as any;
          setSummary([
            { label: "Payments", value: c.payments_count ?? 0 },
            { label: "Overpayments", value: c.overpayments_count ?? 0 },
            { label: "Appeals", value: c.appeals_count ?? 0 },
          ]);
        } else {
          const c = ctx as any;
          setSummary([
            { label: "Notices", value: c.notices_count ?? 0 },
            { label: "Visits", value: c.visits_count ?? 0 },
            { label: "Inspections", value: c.inspections_count ?? 0 },
            { label: "Audits", value: c.audits_count ?? 0 },
            { label: "Arrangements", value: c.arrangements_count ?? 0 },
            { label: "Breaches", value: c.breaches_count ?? 0 },
          ]);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [referralId, sourceModule, employerId, ceCaseId, claimId, ssn]);

  async function handleDownload(d: ReferralDocumentRow) {
    if (!d.storage_bucket || !d.storage_path) return;
    setDownloadingId(d.id);
    try {
      const url = await getDownloadUrl(d.storage_bucket, d.storage_path, 600);
      if (url) window.open(url, "_blank", "noopener");
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4" /> Referral Packet — Documents
            </span>
            <Badge variant="outline">{docs.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground py-4 text-center">
              <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Loading…
            </div>
          ) : docs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No documents attached to this referral.
            </p>
          ) : (
            <div className="border rounded-md divide-y">
              {docs.map((d) => (
                <div key={d.id} className="flex items-center justify-between p-2 text-sm">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {d.display_title ?? d.file_name ?? d.source_entity_type}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {d.document_type_code} · {d.document_source}
                        {d.source_reference_no ? ` · ${d.source_reference_no}` : ""}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {d.is_required && <Badge variant="destructive" className="text-xs">Required</Badge>}
                    <TransferBadge status={d.transfer_status} />
                    {d.document_source === "NEW_UPLOAD" && d.storage_path && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDownload(d)}
                        disabled={downloadingId === d.id}
                      >
                        {downloadingId === d.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <ExternalLink className="h-3 w-3" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <HistoryTimelinePanel
        title="Referral Packet — Source Officer / Case History"
        events={events}
        summary={summary}
        loading={loading}
        emptyMessage="No history events available."
      />
    </div>
  );
}

function TransferBadge({ status }: { status: ReferralDocumentRow["transfer_status"] }) {
  if (status === "TRANSFERRED" || status === "UPLOADED")
    return (
      <Badge variant="outline" className="text-xs gap-1">
        <CheckCircle2 className="h-3 w-3 text-emerald-600" /> {status}
      </Badge>
    );
  if (status === "PENDING" || status === "QUEUED")
    return (
      <Badge variant="outline" className="text-xs gap-1">
        <Clock className="h-3 w-3 text-amber-600" /> {status}
      </Badge>
    );
  if (status === "FAILED")
    return (
      <Badge variant="outline" className="text-xs gap-1">
        <AlertCircle className="h-3 w-3 text-red-600" /> {status}
      </Badge>
    );
  return <Badge variant="outline" className="text-xs">{status}</Badge>;
}
