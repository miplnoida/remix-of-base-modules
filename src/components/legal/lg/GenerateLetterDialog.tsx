import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Loader2, Send } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  legalTemplateContextService,
  type LegalTemplateContext,
} from "@/services/legal/legalTemplateContextService";

const sb = supabase as any;

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  caseId: string;
  template: {
    template_id: string;
    code?: string | null;
    name: string;
  } | null;
  channel: string;
  busy: boolean;
  onConfirm: (args: {
    recipientPartyId: string | null;
    actionDeadline: string | null;
    context: LegalTemplateContext;
  }) => void;
}

const REQUIRED_TOKENS_BY_DEFAULT = new Set([
  "recipient.name",
  "recipient.address_line1",
  "officer.name",
  "officer.title",
  "legal.case_no",
]);

export function GenerateLetterDialog({ open, onOpenChange, caseId, template, channel, busy, onConfirm }: Props) {
  const [recipientPartyId, setRecipientPartyId] = useState<string>("__auto__");
  const [actionDeadline, setActionDeadline] = useState<string>("");

  // Reset state when reopened
  useEffect(() => {
    if (open) {
      setRecipientPartyId("__auto__");
      setActionDeadline("");
    }
  }, [open, template?.template_id]);

  // Candidate recipients
  const recipients = useQuery({
    queryKey: ["legal-recipient-candidates", caseId],
    enabled: open && !!caseId,
    queryFn: () => legalTemplateContextService.listRecipientCandidates(caseId),
  });

  // Active template version body for unresolved scan
  const tplBody = useQuery({
    queryKey: ["legal-template-body", template?.template_id],
    enabled: open && !!template?.template_id,
    queryFn: async () => {
      const { data: tpl } = await sb
        .from("core_template")
        .select("active_version_id")
        .eq("id", template!.template_id)
        .maybeSingle();
      const activeVersionId = tpl?.active_version_id;
      if (!activeVersionId) return null;
      const { data } = await sb
        .from("core_template_version")
        .select("subject, body_html, body_text")
        .eq("id", activeVersionId)
        .maybeSingle();
      return data ?? null;
    },
  });

  // Build context as user changes recipient/deadline
  const context = useQuery({
    queryKey: [
      "legal-template-context",
      caseId,
      template?.template_id,
      recipientPartyId,
      actionDeadline,
    ],
    enabled: open && !!caseId && !!template?.template_id,
    queryFn: () =>
      legalTemplateContextService.buildContext(caseId, template!.template_id, {
        recipientPartyId: recipientPartyId === "__auto__" ? null : recipientPartyId,
        actionDeadline: actionDeadline || null,
        documentType: template?.code ?? null,
        templateCode: template?.code ?? null,
      }),
  });

  const { unresolved, requiredMissing, usesDeadline } = useMemo(() => {
    const v = tplBody.data;
    const texts = [v?.subject, v?.body_html, v?.body_text];
    const usesDeadline = texts.some((t) => t && /\{\{\s*legal\.action_deadline\s*\}\}/.test(t));
    if (!context.data) return { unresolved: [] as string[], requiredMissing: [] as string[], usesDeadline };
    const flat = legalTemplateContextService.flattenContext(context.data);
    const u = legalTemplateContextService.findUnresolvedTokens(texts, flat);
    const reqMissing = u.filter((t) => REQUIRED_TOKENS_BY_DEFAULT.has(t) || /^(recipient|officer|legal)\./.test(t));
    return { unresolved: u, requiredMissing: reqMissing, usesDeadline };
  }, [tplBody.data, context.data]);

  const deadlineMissing = usesDeadline && !context.data?.legal.action_deadline;
  const canConfirm = !busy && !!context.data && requiredMissing.length === 0 && !deadlineMissing;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" /> Generate {template?.name ?? "Letter"}
          </DialogTitle>
          <DialogDescription>
            Confirm recipient and deadline. The template is validated for unresolved tokens before generation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div>
            <Label>Recipient</Label>
            <Select value={recipientPartyId} onValueChange={setRecipientPartyId}>
              <SelectTrigger>
                <SelectValue placeholder="Auto-resolve from case parties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__auto__">Auto — pick best match</SelectItem>
                {(recipients.data ?? []).map((r) => (
                  <SelectItem key={r.party_id!} value={r.party_id!}>
                    {r.name} {r.party_role ? `(${r.party_role})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {context.data?.recipient.name && (
              <div className="text-xs text-muted-foreground mt-1">
                Resolved: <strong>{context.data.recipient.name}</strong>
                {context.data.recipient.party_role ? ` · ${context.data.recipient.party_role}` : ""}
                {context.data.recipient.address_line1 ? ` · ${context.data.recipient.address_line1}` : ""}
              </div>
            )}
          </div>

          {usesDeadline && (
            <div>
              <Label>
                Action deadline {deadlineMissing && <span className="text-destructive">*</span>}
              </Label>
              <Input
                type="date"
                value={actionDeadline}
                onChange={(e) => setActionDeadline(e.target.value)}
                placeholder="Required by template"
              />
              {deadlineMissing && (
                <p className="text-xs text-destructive mt-1">
                  This template uses <code>{"{{legal.action_deadline}}"}</code> — enter a deadline.
                </p>
              )}
            </div>
          )}

          <div className="rounded border p-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium">Officer</span>
              <Badge variant="outline" className="text-[10px]">Auto-resolved</Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              {context.data?.officer.name || "—"} · {context.data?.officer.title || "—"}
              {context.data?.officer.email ? ` · ${context.data.officer.email}` : ""}
            </div>
          </div>

          <div className="rounded border p-2">
            <div className="text-xs font-medium mb-1">Token validation</div>
            {context.isLoading || tplBody.isLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Resolving context…
              </div>
            ) : unresolved.length === 0 ? (
              <div className="flex items-center gap-2 text-xs text-green-700">
                <CheckCircle2 className="h-3 w-3" /> All tokens resolved.
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">
                  Unresolved: {unresolved.map((t) => <code key={t} className="mr-1">{`{{${t}}}`}</code>)}
                </div>
                {requiredMissing.length > 0 && (
                  <Alert variant="destructive" className="py-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Required tokens cannot be resolved: {requiredMissing.join(", ")}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </div>

          <div className="text-xs text-muted-foreground">
            Channel: <Badge variant="secondary" className="text-[10px]">{channel}</Badge>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            disabled={!canConfirm}
            onClick={() =>
              onConfirm({
                recipientPartyId: recipientPartyId === "__auto__" ? null : recipientPartyId,
                actionDeadline: actionDeadline || null,
                context: context.data!,
              })
            }
          >
            {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
            Generate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default GenerateLetterDialog;
