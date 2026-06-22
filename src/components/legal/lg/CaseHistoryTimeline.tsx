import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Mail, Printer, Send, FileSignature, Activity as ActivityIcon, Upload, Loader2 } from "lucide-react";

const sb = supabase as any;

type Kind = "LETTER" | "NOTICE" | "DOCUMENT" | "ACTIVITY";

interface HistoryItem {
  id: string;
  kind: Kind;
  at: string;             // ISO timestamp
  by: string | null;      // user_code
  title: string;
  detail?: string | null;
  channel?: string | null;
  status?: string | null;
  reference?: string | null;
}

const KIND_META: Record<Kind, { label: string; icon: any; cls: string }> = {
  LETTER:   { label: "Letter",       icon: FileSignature, cls: "bg-blue-500" },
  NOTICE:   { label: "Notice",       icon: Send,          cls: "bg-amber-500" },
  DOCUMENT: { label: "Document",     icon: Upload,        cls: "bg-emerald-500" },
  ACTIVITY: { label: "Activity",     icon: ActivityIcon,  cls: "bg-slate-500" },
};

function channelIcon(channel?: string | null) {
  const c = (channel || "").toUpperCase();
  if (c.includes("PRINT")) return <Printer className="h-3 w-3" />;
  if (c.includes("EMAIL")) return <Mail className="h-3 w-3" />;
  if (c.includes("SMS")) return <Send className="h-3 w-3" />;
  return <FileText className="h-3 w-3" />;
}

export function CaseHistoryTimeline({ lgCaseId }: { lgCaseId: string }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"ALL" | Kind>("ALL");

  const q = useQuery({
    queryKey: ["lg_case_history_unified", lgCaseId],
    enabled: !!lgCaseId,
    queryFn: async () => {
      const [letters, notices, docs, acts] = await Promise.all([
        sb.from("core_generated_document")
          .select("id, reference_no, subject, channel_code, delivery_status, delivered_at, generated_at, generated_by, case_stage_code")
          .eq("entity_type", "lg_case").eq("entity_id", lgCaseId)
          .order("generated_at", { ascending: false }).limit(500),
        sb.from("lg_notice")
          .select("id, notice_no, subject, delivery_channel, delivery_status, delivered_at, sent_at, sent_by, created_at, created_by, status")
          .eq("lg_case_id", lgCaseId)
          .order("created_at", { ascending: false }).limit(500),
        sb.from("lg_document_link")
          .select("id, title, document_ref_no, file_name, document_category_code, document_source, linked_at, linked_by, uploaded_at, uploaded_by, version_no")
          .eq("lg_case_id", lgCaseId)
          .order("linked_at", { ascending: false }).limit(500),
        sb.from("lg_case_activity")
          .select("id, activity_type, description, performed_at, performed_by")
          .eq("lg_case_id", lgCaseId)
          .order("performed_at", { ascending: false }).limit(500),
      ]);
      if (letters.error) throw letters.error;
      if (notices.error) throw notices.error;
      if (docs.error) throw docs.error;
      if (acts.error) throw acts.error;

      const items: HistoryItem[] = [];

      for (const r of letters.data ?? []) {
        items.push({
          id: `L:${r.id}`,
          kind: "LETTER",
          at: r.generated_at ?? r.delivered_at ?? new Date().toISOString(),
          by: r.generated_by ?? null,
          title: r.subject || r.reference_no || "Letter generated",
          detail: r.case_stage_code ? `Stage: ${r.case_stage_code}` : null,
          channel: r.channel_code,
          status: r.delivery_status,
          reference: r.reference_no,
        });
        if (r.delivered_at) {
          items.push({
            id: `L:${r.id}:delivered`,
            kind: "LETTER",
            at: r.delivered_at,
            by: r.generated_by ?? null,
            title: `Letter delivered: ${r.subject || r.reference_no}`,
            channel: r.channel_code,
            status: r.delivery_status,
            reference: r.reference_no,
          });
        }
      }

      for (const r of notices.data ?? []) {
        items.push({
          id: `N:${r.id}:created`,
          kind: "NOTICE",
          at: r.created_at,
          by: r.created_by ?? null,
          title: `Notice created: ${r.subject || r.notice_no}`,
          channel: r.delivery_channel,
          status: r.status,
          reference: r.notice_no,
        });
        if (r.sent_at) {
          items.push({
            id: `N:${r.id}:sent`,
            kind: "NOTICE",
            at: r.sent_at,
            by: r.sent_by ?? r.created_by ?? null,
            title: `Notice sent: ${r.subject || r.notice_no}`,
            channel: r.delivery_channel,
            status: r.delivery_status ?? r.status,
            reference: r.notice_no,
          });
        }
        if (r.delivered_at) {
          items.push({
            id: `N:${r.id}:delivered`,
            kind: "NOTICE",
            at: r.delivered_at,
            by: r.sent_by ?? r.created_by ?? null,
            title: `Notice delivered: ${r.subject || r.notice_no}`,
            channel: r.delivery_channel,
            status: r.delivery_status,
            reference: r.notice_no,
          });
        }
      }

      for (const r of docs.data ?? []) {
        items.push({
          id: `D:${r.id}`,
          kind: "DOCUMENT",
          at: r.linked_at ?? r.uploaded_at ?? new Date().toISOString(),
          by: r.linked_by ?? r.uploaded_by ?? null,
          title: `Document linked: ${r.title || r.file_name || r.document_ref_no || "Document"}`,
          detail: [r.document_category_code, r.document_source, r.version_no ? `v${r.version_no}` : null].filter(Boolean).join(" · "),
          reference: r.document_ref_no,
        });
      }

      for (const r of acts.data ?? []) {
        // Skip activity entries that duplicate already-rendered events
        const t = (r.activity_type || "").toUpperCase();
        if (t === "DOCUMENT_LINKED" || t === "NOTICE_GENERATED") continue;
        items.push({
          id: `A:${r.id}`,
          kind: "ACTIVITY",
          at: r.performed_at,
          by: r.performed_by ?? null,
          title: r.activity_type,
          detail: r.description,
        });
      }

      items.sort((a, b) => (b.at || "").localeCompare(a.at || ""));

      // Resolve user_codes to display names from profiles
      const codes = Array.from(new Set(items.map(i => i.by).filter(Boolean))) as string[];
      const nameMap: Record<string, string> = {};
      if (codes.length) {
        const { data: profs } = await sb
          .from("profiles")
          .select("user_code, full_name")
          .in("user_code", codes);
        for (const p of (profs ?? [])) {
          if (p.user_code && p.full_name) nameMap[p.user_code] = p.full_name;
        }
      }
      return items.map(i => ({ ...i, byName: i.by ? (nameMap[i.by] || i.by) : null }));
    },
  });

  const filtered = useMemo(() => {
    const items = q.data ?? [];
    const s = search.trim().toLowerCase();
    return items.filter((it) => {
      if (filter !== "ALL" && it.kind !== filter) return false;
      if (!s) return true;
      return (
        it.title.toLowerCase().includes(s) ||
        (it.detail ?? "").toLowerCase().includes(s) ||
        (it.reference ?? "").toLowerCase().includes(s) ||
        (it.by ?? "").toLowerCase().includes(s) ||
        (it.channel ?? "").toLowerCase().includes(s)
      );
    });
  }, [q.data, search, filter]);

  const counts = useMemo(() => {
    const c = { ALL: 0, LETTER: 0, NOTICE: 0, DOCUMENT: 0, ACTIVITY: 0 } as Record<string, number>;
    for (const it of q.data ?? []) { c.ALL++; c[it.kind]++; }
    return c;
  }, [q.data]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-end gap-3 justify-between">
          <div>
            <CardTitle>Case History</CardTitle>
            <CardDescription>
              Unified timeline of every letter printed/sent, notice issued, document linked, and case activity — with who and when.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, reference, user…"
              className="w-64"
            />
            <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All events ({counts.ALL})</SelectItem>
                <SelectItem value="LETTER">Letters ({counts.LETTER})</SelectItem>
                <SelectItem value="NOTICE">Notices ({counts.NOTICE})</SelectItem>
                <SelectItem value="DOCUMENT">Documents ({counts.DOCUMENT})</SelectItem>
                <SelectItem value="ACTIVITY">Activity ({counts.ACTIVITY})</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {q.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading history…
          </div>
        ) : q.isError ? (
          <p className="text-sm text-destructive">Failed to load history.</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">No history events found.</p>
        ) : (
          <ol className="relative border-l ml-3 space-y-4">
            {filtered.map((it) => {
              const meta = KIND_META[it.kind];
              const Icon = meta.icon;
              return (
                <li key={it.id} className="ml-4">
                  <span className={`absolute -left-[9px] h-4 w-4 rounded-full ${meta.cls} flex items-center justify-center`}>
                    <Icon className="h-2.5 w-2.5 text-white" />
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{meta.label}</Badge>
                    {it.reference && <span className="text-xs font-mono text-muted-foreground">{it.reference}</span>}
                    {it.channel && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        {channelIcon(it.channel)} {it.channel}
                      </span>
                    )}
                    {it.status && <Badge variant="secondary" className="text-[10px]">{it.status}</Badge>}
                  </div>
                  <div className="text-sm font-medium mt-0.5">{it.title}</div>
                  {it.detail && <div className="text-xs text-muted-foreground">{it.detail}</div>}
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {new Date(it.at).toLocaleString()} {(it as any).byName ? `· by ${(it as any).byName}` : (it.by ? `· by ${it.by}` : "· by —")}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

export default CaseHistoryTimeline;
