/**
 * EPIC CH-T1 — Email Preview panel.
 *
 * Renders the exact email operators are about to send. Purely a resolver
 * surface — never creates a request/message. Displays template metadata,
 * sender, recipient, subject, body, token values, review policy, send policy
 * and any warnings/blockers.
 */
import { useCallback, useState } from "react";
import { RefreshCcw, ShieldAlert, ShieldCheck, Mail, Info, Eye } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  renderCommHubTemplatePreview,
  previewSatisfiesSendGate,
  type CommHubPreviewInput,
  type CommHubPreviewResult,
} from "@/pages/admin/communicationHub/preview/commHubPreviewService";
import { toast } from "sonner";

interface Props {
  input: CommHubPreviewInput;
  disabled?: boolean;
  onPreviewChange?: (preview: CommHubPreviewResult | null) => void;
  autoLoad?: boolean;
}

export default function CommHubTemplatePreviewCard({
  input,
  disabled,
  onPreviewChange,
  autoLoad,
}: Props) {
  const [preview, setPreview] = useState<CommHubPreviewResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const p = await renderCommHubTemplatePreview(input);
      setPreview(p);
      onPreviewChange?.(p);
      if (p.ok) toast.success("Email preview refreshed.");
      else toast.warning("Preview generated with issues — see blockers.");
    } catch (e: any) {
      setError(e?.message ?? String(e));
      setPreview(null);
      onPreviewChange?.(null);
      toast.error(`Preview failed: ${e?.message ?? "unknown"}`);
    } finally {
      setBusy(false);
    }
  }, [input, onPreviewChange]);

  // Auto-load on mount if requested
  useState(() => {
    if (autoLoad) void refresh();
    return undefined;
  });

  const gate = previewSatisfiesSendGate(preview);
  const rp = preview?.review_policy ?? null;
  const sp = preview?.send_policy ?? null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4" /> Email Preview
            {preview?.ok && gate.ready ? (
              <Badge variant="default" className="text-[10px]"><ShieldCheck className="h-3 w-3 mr-1" />Ready to send</Badge>
            ) : preview ? (
              <Badge variant="destructive" className="text-[10px]"><ShieldAlert className="h-3 w-3 mr-1" />Blocked</Badge>
            ) : (
              <Badge variant="outline" className="text-[10px]"><Eye className="h-3 w-3 mr-1" />Not generated</Badge>
            )}
          </CardTitle>
          <CardDescription className="text-xs">
            Exact rendered email that will be sent. Does not create a request or send anything.
          </CardDescription>
        </div>
        <Button size="sm" variant="outline" onClick={refresh} disabled={disabled || busy}>
          <RefreshCcw className={`h-3.5 w-3.5 mr-1 ${busy ? "animate-spin" : ""}`} /> Refresh Preview
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        {error && (
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle className="text-xs">Preview failed</AlertTitle>
            <AlertDescription className="text-xs"><code>{error}</code></AlertDescription>
          </Alert>
        )}

        {!preview && !error && (
          <div className="text-muted-foreground">
            Click <em>Refresh Preview</em> to render the exact email using the current template, sender profile, and token values.
          </div>
        )}

        {preview && (
          <>
            <div className="grid gap-2 md:grid-cols-2 rounded border p-2 bg-muted/30">
              <div><strong>Event:</strong> <code>{input.module_code}/{input.event_code}</code></div>
              <div><strong>Template:</strong> <code>{preview.resolved_template_code ?? "—"}</code></div>
              <div><strong>Version:</strong> v{preview.version_no ?? "?"} <span className="text-muted-foreground">({preview.version_status ?? "—"})</span></div>
              <div><strong>Sender profile:</strong> <code>{preview.sender_profile_id?.slice(0, 8) ?? "—"}…</code>{preview.sender_verified ? " · verified" : " · unverified"}</div>
              <div><strong>From:</strong> {preview.from_display_name ? `${preview.from_display_name} <${preview.from_email}>` : preview.from_email}</div>
              <div><strong>Reply-To:</strong> {preview.reply_to_email ?? "—"}</div>
              <div><strong>To:</strong> {preview.recipient_name ? `${preview.recipient_name} <${preview.recipient_email}>` : preview.recipient_email}</div>
              <div><strong>Generated at:</strong> {preview.generated_at ?? "—"}</div>
            </div>

            <div>
              <div className="font-semibold mb-1">Subject</div>
              <div className="rounded border p-2 bg-background font-medium">
                {preview.subject_preview || <em className="text-muted-foreground">(empty)</em>}
              </div>
            </div>

            <div>
              <div className="font-semibold mb-1">Rendered body</div>
              <div className="rounded border p-3 bg-background max-h-96 overflow-auto">
                {preview.html_preview ? (
                  <div dangerouslySetInnerHTML={{ __html: preview.html_preview }} />
                ) : (
                  <pre className="whitespace-pre-wrap font-sans">{preview.text_preview ?? ""}</pre>
                )}
              </div>
              {preview.text_preview && (
                <details className="mt-1">
                  <summary className="cursor-pointer text-muted-foreground">Plain text version</summary>
                  <pre className="whitespace-pre-wrap font-sans rounded border p-2 bg-muted/30 mt-1">{preview.text_preview}</pre>
                </details>
              )}
            </div>

            <div>
              <div className="font-semibold mb-1">Token values</div>
              <div className="rounded border bg-background overflow-x-auto">
                <table className="w-full">
                  <thead className="text-left text-muted-foreground bg-muted/40">
                    <tr><th className="p-1.5">Token</th><th className="p-1.5">Value</th></tr>
                  </thead>
                  <tbody>
                    {Object.entries(preview.token_values ?? {}).map(([k, v]) => (
                      <tr key={k} className="border-t">
                        <td className="p-1.5 font-mono">{k}</td>
                        <td className="p-1.5">{String(v ?? "")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {(preview.missing_tokens ?? []).length > 0 && (
                <div className="mt-1 text-amber-700">
                  <strong>Empty:</strong> {(preview.missing_tokens ?? []).map((t) => <code key={t} className="mr-1">{t}</code>)}
                </div>
              )}
              {(preview.unresolved_tokens ?? []).length > 0 && (
                <div className="mt-1 text-destructive">
                  <strong>Unresolved:</strong> {(preview.unresolved_tokens ?? []).map((t) => <code key={t} className="mr-1">{t}</code>)}
                </div>
              )}
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <div className="rounded border p-2">
                <div className="font-semibold flex items-center gap-1 mb-1"><Info className="h-3 w-3" /> Review policy</div>
                {rp ? (
                  <div className="space-y-0.5">
                    <div>mode: <code>{rp.review_mode}</code></div>
                    <div>preview_required: <code>{String(rp.preview_required)}</code></div>
                    <div>approval: <code>{rp.approval_status}</code></div>
                    <div>approved_version: <code>{rp.approved_template_version_id?.slice(0, 8) ?? "—"}…</code></div>
                  </div>
                ) : <div className="text-destructive">Missing — event has no review policy.</div>}
              </div>
              <div className="rounded border p-2">
                <div className="font-semibold flex items-center gap-1 mb-1"><Info className="h-3 w-3" /> Send policy</div>
                {sp ? (
                  <div className="space-y-0.5">
                    <div>send: <code>{sp.send_policy}</code></div>
                    <div>recipients: <code>{sp.recipient_policy}</code></div>
                    <div>internal_domains: <code>{Array.isArray(sp.allowed_internal_domains) ? sp.allowed_internal_domains.join(", ") : "—"}</code></div>
                    <div>approved: <code>{String(sp.approved)}</code></div>
                  </div>
                ) : <div className="text-muted-foreground">Not resolved.</div>}
              </div>
            </div>

            {(preview.warnings ?? []).length > 0 && (
              <Alert>
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle className="text-xs">Warnings</AlertTitle>
                <AlertDescription className="text-xs">
                  <ul className="list-disc pl-5">
                    {(preview.warnings ?? []).map((w) => <li key={w}><code>{w}</code></li>)}
                  </ul>
                  {(preview.warnings ?? []).some((w) => w.startsWith("dummy_wording:")) && (
                    <div className="mt-1 text-amber-700">
                      Template appears to contain test/dummy wording. Review required before auto-live.
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {!gate.ready && (
              <Alert variant="destructive">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle className="text-xs">Send blocked by preview gate</AlertTitle>
                <AlertDescription className="text-xs">
                  <ul className="list-disc pl-5">
                    {gate.reasons.map((r) => <li key={r}><code>{r}</code></li>)}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
