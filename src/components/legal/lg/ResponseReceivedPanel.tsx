import { useEffect, useState } from "react";
import { CheckCircle2, FileText, PlayCircle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { continueReview } from "@/services/legal/lgIntakeService";

const sb = supabase as any;

interface DocLink {
  id: string;
  file_name: string | null;
  mime_type: string | null;
  storage_bucket: string | null;
  storage_path: string | null;
  document_source: string | null;
  linked_at: string;
}

interface InfoReq {
  id: string;
  request_no: string;
  request_reason: string;
  response_notes: string | null;
  responded_by: string | null;
  responded_at: string | null;
  status: string;
  documents: DocLink[];
}

interface Props {
  intakeId: string;
  intakeStatus: string;
  actor: string;
  onContinued?: () => void;
}

export default function ResponseReceivedPanel({ intakeId, intakeStatus, actor, onContinued }: Props) {
  const [referralId, setReferralId] = useState<string | null>(null);
  const [items, setItems] = useState<InfoReq[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { data: ref } = await sb
        .from("legal_referral")
        .select("id")
        .eq("lg_intake_id", intakeId)
        .maybeSingle();
      if (!ref?.id) { setReferralId(null); setItems([]); return; }
      setReferralId(ref.id);

      const { data: requests } = await sb
        .from("legal_referral_info_request")
        .select("id, request_no, request_reason, response_notes, responded_by, responded_at, status")
        .eq("legal_referral_id", ref.id)
        .eq("status", "RESPONDED")
        .order("responded_at", { ascending: false });

      const reqs = (requests ?? []) as any[];
      if (!reqs.length) { setItems([]); return; }

      const { data: docs } = await sb
        .from("legal_referral_document_link")
        .select("id, info_request_id, file_name, mime_type, storage_bucket, storage_path, document_source, linked_at")
        .in("info_request_id", reqs.map((r) => r.id));

      const grouped: InfoReq[] = reqs.map((r) => ({
        ...r,
        documents: (docs ?? []).filter((d: any) => d.info_request_id === r.id),
      }));
      setItems(grouped);
    } catch (e: any) {
      toast.error("Failed to load response", { description: e?.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [intakeId]);

  async function downloadDoc(d: DocLink) {
    if (!d.storage_bucket || !d.storage_path) {
      toast.error("Document has no storage reference");
      return;
    }
    const { data, error } = await sb.storage.from(d.storage_bucket).createSignedUrl(d.storage_path, 300);
    if (error) { toast.error("Download failed", { description: error.message }); return; }
    window.open(data.signedUrl, "_blank");
  }

  async function handleContinue() {
    setBusy(true);
    try {
      await continueReview(intakeId, actor);
      toast.success("Review resumed");
      onContinued?.();
    } catch (e: any) {
      toast.error("Failed to continue review", { description: e?.message });
    } finally {
      setBusy(false);
    }
  }

  if (loading) return null;
  if (!referralId || items.length === 0) return null;

  const canContinue = intakeStatus === "INFO_REQUESTED";

  return (
    <Card className="border-emerald-500/40 bg-emerald-500/5">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          Source Response Received
          <Badge className="bg-emerald-600 hover:bg-emerald-600">Response Received</Badge>
        </CardTitle>
        {canContinue && (
          <Button size="sm" onClick={handleContinue} disabled={busy}>
            <PlayCircle className="h-4 w-4 mr-2" />Continue Review
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((ir) => (
          <div key={ir.id} className="border-l-2 border-emerald-500 pl-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="font-medium">
                <Badge variant="outline" className="mr-2">{ir.request_no}</Badge>
                Responded by {ir.responded_by ?? "—"}
              </div>
              <div className="text-xs text-muted-foreground">
                {ir.responded_at ? new Date(ir.responded_at).toLocaleString() : "—"}
              </div>
            </div>
            <div className="text-xs text-muted-foreground italic">
              Original request: {ir.request_reason}
            </div>
            {ir.response_notes && (
              <div className="text-sm whitespace-pre-wrap bg-background/60 rounded p-2 border">
                {ir.response_notes}
              </div>
            )}
            {ir.documents.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground">
                  Response Documents ({ir.documents.length})
                </div>
                <ul className="space-y-1">
                  {ir.documents.map((d) => (
                    <li key={d.id} className="flex items-center justify-between text-sm bg-background/60 rounded px-2 py-1 border">
                      <span className="flex items-center gap-2 truncate">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="truncate">{d.file_name ?? d.storage_path}</span>
                        {d.document_source && (
                          <Badge variant="outline" className="text-xs">{d.document_source}</Badge>
                        )}
                      </span>
                      <Button size="sm" variant="ghost" onClick={() => downloadDoc(d)}>
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
