/**
 * EPIC-04A §4 — Unified Communications feed.
 *
 * Consolidates all outbound/inbound comms on a legal matter into one grid:
 *   - Notices          (lg_notice)
 *   - Letters          (core_generated_document owned by lg_case)
 *   - Info requests    (lg_intake_info_request tied to intake for this case)
 *   - Correspondence   (notices with delivery_channel INBOUND fall here)
 *
 * Missing tables return [] silently. No mock data.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateForDisplay } from "@/lib/format-config";

const sb = supabase as any;

type Kind = "NOTICE" | "LETTER" | "INFO_REQUEST" | "CORRESPONDENCE";

interface CommRow {
  id: string;
  kind: Kind;
  ref: string;
  subject: string | null;
  channel: string | null;
  status: string | null;
  dispatched_at: string | null;
  created_at: string;
}

async function safeArr<T>(p: Promise<{ data: T[] | null }>): Promise<T[]> {
  try { const { data } = await p; return (data ?? []) as T[]; } catch { return []; }
}

async function loadComms(lgCaseId: string): Promise<CommRow[]> {
  const [notices, letters, infoReq] = await Promise.all([
    safeArr<any>(sb.from("lg_notice")
      .select("id, notice_no, notice_type_code, subject, delivery_channel, status, issued_date, created_at, dispatched_at")
      .eq("lg_case_id", lgCaseId)),
    safeArr<any>(sb.from("core_generated_document")
      .select("id, document_no, document_type_code, subject, delivery_channel, status, created_at, dispatched_at")
      .eq("owner_entity_id", lgCaseId).eq("owner_entity_table", "lg_case")),
    safeArr<any>(sb.from("lg_intake_info_request")
      .select("id, request_no, subject, status, requested_at, responded_at, request_channel")
      .eq("lg_case_id", lgCaseId)),
  ]);

  const rows: CommRow[] = [];

  notices.forEach((n) => rows.push({
    id: `notice-${n.id}`,
    kind: String(n.delivery_channel ?? "").toUpperCase().includes("INBOUND") ? "CORRESPONDENCE" : "NOTICE",
    ref: n.notice_no ?? String(n.id).slice(0, 8),
    subject: n.subject ?? n.notice_type_code ?? null,
    channel: n.delivery_channel ?? null,
    status: n.status ?? null,
    dispatched_at: n.dispatched_at ?? n.issued_date ?? null,
    created_at: n.created_at,
  }));

  letters.forEach((l) => rows.push({
    id: `letter-${l.id}`,
    kind: "LETTER",
    ref: l.document_no ?? String(l.id).slice(0, 8),
    subject: l.subject ?? l.document_type_code ?? null,
    channel: l.delivery_channel ?? null,
    status: l.status ?? null,
    dispatched_at: l.dispatched_at ?? null,
    created_at: l.created_at,
  }));

  infoReq.forEach((r) => rows.push({
    id: `info-${r.id}`,
    kind: "INFO_REQUEST",
    ref: r.request_no ?? String(r.id).slice(0, 8),
    subject: r.subject ?? "Information request",
    channel: r.request_channel ?? null,
    status: r.responded_at ? "RESPONDED" : (r.status ?? "PENDING"),
    dispatched_at: r.requested_at ?? null,
    created_at: r.requested_at ?? new Date().toISOString(),
  }));

  return rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

const KIND_LABEL: Record<Kind, string> = {
  NOTICE: "Notice", LETTER: "Letter",
  INFO_REQUEST: "Info Request", CORRESPONDENCE: "Correspondence",
};

export function UnifiedCommunicationsFeed({ lgCaseId }: { lgCaseId: string }) {
  const [active, setActive] = useState<Set<Kind>>(new Set(["NOTICE", "LETTER", "INFO_REQUEST", "CORRESPONDENCE"]));
  const q = useQuery({
    queryKey: ["lg-unified-comms", lgCaseId],
    queryFn: () => loadComms(lgCaseId),
    enabled: !!lgCaseId,
  });

  const rows = useMemo(() => (q.data ?? []).filter((r) => active.has(r.kind)), [q.data, active]);
  const toggle = (k: Kind) => {
    const next = new Set(active);
    if (next.has(k)) next.delete(k); else next.add(k);
    setActive(next);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Communications</CardTitle>
        <CardDescription>
          Unified feed of notices, letters, information requests and correspondence with dispatch status.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-1">
          {(Object.keys(KIND_LABEL) as Kind[]).map((k) => (
            <Button
              key={k}
              size="sm"
              variant={active.has(k) ? "default" : "outline"}
              className="h-6 px-2 text-[11px]"
              onClick={() => toggle(k)}
            >
              {KIND_LABEL[k]}
            </Button>
          ))}
        </div>

        {q.isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No communications recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr className="text-left border-b">
                  <th className="py-1.5 pr-2">Type</th>
                  <th className="pr-2">Reference</th>
                  <th className="pr-2">Subject</th>
                  <th className="pr-2">Channel</th>
                  <th className="pr-2">Status</th>
                  <th className="pr-2">Dispatched</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-1.5 pr-2"><Badge variant="outline">{KIND_LABEL[r.kind]}</Badge></td>
                    <td className="pr-2 font-medium">{r.ref}</td>
                    <td className="pr-2">{r.subject ?? "—"}</td>
                    <td className="pr-2">{r.channel ?? "—"}</td>
                    <td className="pr-2">{r.status ? <Badge>{r.status}</Badge> : "—"}</td>
                    <td className="pr-2">{r.dispatched_at ? formatDateForDisplay(r.dispatched_at) : "—"}</td>
                    <td>{formatDateForDisplay(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default UnifiedCommunicationsFeed;
