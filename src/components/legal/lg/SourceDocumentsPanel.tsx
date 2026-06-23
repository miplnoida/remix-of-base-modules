import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FileText, Lock, Eye, Loader2, Link2, ShieldAlert, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  loadSourceDocuments,
  type SourceDocument,
  type SourceDocumentContext,
} from "@/services/legal/lgSourceDocumentService";
import { useLegalDocPermissions } from "@/hooks/legal/useLegalDocPermissions";

interface Props {
  context: SourceDocumentContext;
  /** When true, render checkboxes + a Link button that calls onLink with selected docs. */
  selectable?: boolean;
  onLink?: (selected: SourceDocument[]) => Promise<void> | void;
  /** Optional set of document keys already linked (hidden from selection). */
  alreadyLinkedKeys?: Set<string>;
  title?: string;
  description?: string;
  /** Optional callback when the user requests missing documents from the source dept. */
  onRequestMissing?: () => void;
}

export default function SourceDocumentsPanel({
  context,
  selectable = false,
  onLink,
  alreadyLinkedKeys,
  title = "Source Documents",
  description = "Documents owned by the originating module. Files stay in the source module / Central DMS — Legal only stores references.",
  onRequestMissing,
}: Props) {
  const { perms } = useLegalDocPermissions();
  const canViewConfidential = perms.LEGAL_DOCUMENT_CONFIDENTIAL_VIEW;

  const query = useQuery({
    queryKey: ["lg_source_documents", context],
    queryFn: () => loadSourceDocuments(context),
    staleTime: 30_000,
  });

  const docs = query.data ?? [];
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { setSelected({}); }, [query.dataUpdatedAt]);

  const groups = useMemo(() => {
    const g: Record<string, SourceDocument[]> = {};
    for (const d of docs) {
      if (alreadyLinkedKeys?.has(d.key)) continue;
      (g[d.source_module] ??= []).push(d);
    }
    return g;
  }, [docs, alreadyLinkedKeys]);

  const visibleCount = useMemo(
    () => Object.values(groups).reduce((s, v) => s + v.length, 0),
    [groups],
  );
  const hiddenConfidential = useMemo(
    () => docs.filter(d => d.confidential && !canViewConfidential).length,
    [docs, canViewConfidential],
  );

  const selectedDocs = docs.filter(d => selected[d.key]);
  const allRelevantVisible = useMemo(
    () => Object.values(groups).flat().filter(d => !(d.confidential && !canViewConfidential)),
    [groups, canViewConfidential],
  );

  function toggle(key: string) { setSelected(s => ({ ...s, [key]: !s[key] })); }
  function selectAll() {
    const next: Record<string, boolean> = {};
    for (const d of allRelevantVisible) next[d.key] = true;
    setSelected(next);
  }

  async function handleLink() {
    if (!onLink) return;
    if (!selectedDocs.length) { toast.message("Select at least one document"); return; }
    setSubmitting(true);
    try {
      await onLink(selectedDocs);
      setSelected({});
    } catch (e: any) {
      toast.error(e?.message || "Failed to link source documents");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" /> {title}
              <Badge variant="secondary">{visibleCount}</Badge>
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" onClick={() => query.refetch()} disabled={query.isFetching}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${query.isFetching ? "animate-spin" : ""}`} /> Refresh
            </Button>
            {selectable && (
              <>
                <Button size="sm" variant="outline" onClick={selectAll} disabled={!visibleCount || submitting}>
                  Select all relevant
                </Button>
                <Button size="sm" onClick={handleLink} disabled={!selectedDocs.length || submitting}>
                  {submitting ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Link2 className="h-3.5 w-3.5 mr-1" />}
                  Link {selectedDocs.length || ""} to Legal Case
                </Button>
              </>
            )}
            {onRequestMissing && (
              <Button size="sm" variant="outline" onClick={onRequestMissing}>Request Missing Documents</Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {hiddenConfidential > 0 && (
          <Alert>
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>{hiddenConfidential} confidential document(s) hidden</AlertTitle>
            <AlertDescription>
              You need the <span className="font-mono">LEGAL_DOCUMENT_CONFIDENTIAL_VIEW</span> permission to view these.
            </AlertDescription>
          </Alert>
        )}

        {query.isLoading && (
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading source documents…
          </div>
        )}

        {!query.isLoading && visibleCount === 0 && hiddenConfidential === 0 && (
          <p className="text-sm text-muted-foreground">
            No source documents found for this {context.source_module || "referral"}.
          </p>
        )}

        {Object.entries(groups).map(([mod, list]) => (
          <div key={mod} className="space-y-2">
            <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
              {mod} · {list.length} document{list.length === 1 ? "" : "s"}
            </div>
            <div className="overflow-x-auto border rounded-md">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs">
                  <tr>
                    {selectable && <th className="w-8 p-2" />}
                    <th className="text-left p-2 font-medium">Title</th>
                    <th className="text-left p-2 font-medium">Type</th>
                    <th className="text-left p-2 font-medium">Source Ref</th>
                    <th className="text-left p-2 font-medium">Uploaded By</th>
                    <th className="text-left p-2 font-medium">Date</th>
                    <th className="text-left p-2 font-medium">Conf.</th>
                    <th className="text-left p-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map(d => {
                    const locked = d.confidential && !canViewConfidential;
                    return (
                      <tr key={d.key} className="border-t">
                        {selectable && (
                          <td className="p-2 align-top">
                            <Checkbox
                              checked={!!selected[d.key]}
                              onCheckedChange={() => toggle(d.key)}
                              disabled={locked}
                            />
                          </td>
                        )}
                        <td className="p-2 align-top">
                          <div className="font-medium">{d.title}</div>
                          {d.file_name && d.file_name !== d.title && (
                            <div className="text-xs text-muted-foreground">{d.file_name}</div>
                          )}
                        </td>
                        <td className="p-2 align-top">
                          <span className="font-mono text-xs">{d.document_type_code || "—"}</span>
                          {d.document_sub_type_code && (
                            <div className="text-xs text-muted-foreground">{d.document_sub_type_code}</div>
                          )}
                        </td>
                        <td className="p-2 align-top text-xs font-mono">{d.source_entity_type} · {d.source_reference}</td>
                        <td className="p-2 align-top">{d.uploaded_by || "—"}</td>
                        <td className="p-2 align-top">{d.uploaded_at ? new Date(d.uploaded_at).toLocaleDateString() : "—"}</td>
                        <td className="p-2 align-top">
                          {d.confidential ? (
                            <Badge variant="outline" className="gap-1">
                              <Lock className="h-3 w-3" />Conf.
                            </Badge>
                          ) : "—"}
                        </td>
                        <td className="p-2 align-top">
                          {locked ? (
                            <Badge variant="outline" className="gap-1">
                              <Lock className="h-3 w-3" /> Locked
                            </Badge>
                          ) : d.dms_document_id ? (
                            <Button size="sm" variant="ghost" onClick={() => toast.message("Opening via document-proxy…")}>
                              <Eye className="h-3.5 w-3.5 mr-1" /> View
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">Source-only</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
