import React, { useEffect, useMemo, useState } from "react";
import { Loader2, Send, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { sendTestEmail, type EmailTemplateRow } from "@/services/wizSettingsService";

interface SandboxDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: EmailTemplateRow[];
  initialTemplateId?: string | null;
}

const extractTokens = (text: string): string[] => {
  const matches = text.matchAll(/\{\{\s*([a-zA-Z_][\w]*)\s*\}\}/g);
  return Array.from(new Set(Array.from(matches).map((m) => m[1])));
};

const smartDefault = (token: string): string => {
  const t = token.toLowerCase();
  if (t.includes("name")) return "John Doe";
  if (t.includes("email")) return "user@example.com";
  if (t === "code" || t.includes("otp") || t.includes("token")) return "123456";
  if (t.includes("amount") || t.includes("total")) return "100.00";
  if (t.includes("date")) return new Date().toLocaleDateString();
  if (t.includes("url") || t.includes("link")) return "https://c3.ssbeservices.net";
  if (t.includes("company") || t.includes("employer")) return "Acme Corp";
  if (t.includes("ref") || t.includes("number") || t.includes("id")) return "REF-000123";
  return `sample_${token}`;
};

const substitute = (text: string, vars: Record<string, string>): string =>
  text.replace(/\{\{\s*([a-zA-Z_][\w]*)\s*\}\}/g, (_m, k) =>
    Object.prototype.hasOwnProperty.call(vars, k) ? vars[k] : `{{${k}}}`
  );

export const SandboxDialog: React.FC<SandboxDialogProps> = ({
  open,
  onOpenChange,
  templates,
  initialTemplateId,
}) => {
  const activeTemplates = useMemo(
    () => templates.filter((t) => t.is_active && !t.is_deleted),
    [templates]
  );

  const [templateId, setTemplateId] = useState<string>("");
  const [recipient, setRecipient] = useState<string>("");
  const [vars, setVars] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);

  // Pre-fill recipient with logged-in user's email
  useEffect(() => {
    if (!open) return;
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) setRecipient(data.user.email);
    });
  }, [open]);

  // Reset selected template on open
  useEffect(() => {
    if (!open) return;
    const initial = initialTemplateId && activeTemplates.find((t) => t.id === initialTemplateId)
      ? initialTemplateId
      : activeTemplates[0]?.id || "";
    setTemplateId(initial);
  }, [open, initialTemplateId, activeTemplates]);

  const selected = useMemo(
    () => activeTemplates.find((t) => t.id === templateId) || null,
    [activeTemplates, templateId]
  );

  const tokens = useMemo(() => {
    if (!selected) return [];
    return extractTokens(`${selected.subject || ""} ${selected.html_body || ""}`);
  }, [selected]);

  // Reset variable inputs when template changes — apply smart defaults
  useEffect(() => {
    setVars((prev) => {
      const next: Record<string, string> = {};
      tokens.forEach((t) => {
        next[t] = prev[t] ?? smartDefault(t);
      });
      return next;
    });
  }, [tokens]);

  const previewSubject = useMemo(
    () => (selected ? `[TEST] ${substitute(selected.subject || "", vars)}` : ""),
    [selected, vars]
  );
  const previewBody = useMemo(() => {
    if (!selected) return "";
    const banner = `<div style="background:#FEF3C7;border:1px solid #F59E0B;color:#92400E;padding:10px 14px;border-radius:6px;font-family:sans-serif;font-size:13px;margin-bottom:12px;"><strong>⚠ TEST EMAIL — Sandbox</strong></div>`;
    return banner + substitute(selected.html_body || "", vars);
  }, [selected, vars]);

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient);
  const canSend = !!selected && validEmail && !sending;

  const handleSend = async () => {
    if (!selected || !validEmail) return;
    setSending(true);
    try {
      const res = await sendTestEmail({
        template_id: selected.id,
        recipient_email: recipient,
        variables: vars,
      });
      if (res.success) {
        toast.success(`Test email sent to ${recipient}`);
        onOpenChange(false);
      } else {
        toast.error(res.error || "Failed to send test email");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send test email");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Template Sandbox
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: form */}
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Template</Label>
                <SearchableSelect
                  options={activeTemplates.map((t) => ({
                    value: t.id,
                    label: `${t.template_name} (${t.template_key})`,
                    searchText: `${t.template_key} ${t.from_module}`,
                  }))}
                  value={templateId}
                  onValueChange={(v) => setTemplateId(v)}
                  placeholder="Select a template…"
                  searchPlaceholder="Search templates…"
                  emptyMessage="No active templates"
                />
              </div>

              <div>
                <Label className="text-xs">Recipient Email *</Label>
                <Input
                  type="email"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="you@example.com"
                />
                {!validEmail && recipient && (
                  <p className="text-xs text-destructive mt-1">Enter a valid email address</p>
                )}
              </div>

              {tokens.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs">Template Variables</Label>
                  <div className="space-y-2 rounded-md border p-3 bg-muted/30">
                    {tokens.map((token) => (
                      <div key={token} className="grid grid-cols-3 gap-2 items-center">
                        <Label htmlFor={`var-${token}`} className="text-xs font-mono col-span-1 truncate">
                          {`{{${token}}}`}
                        </Label>
                        <Input
                          id={`var-${token}`}
                          className="col-span-2 h-8 text-sm"
                          value={vars[token] ?? ""}
                          onChange={(e) =>
                            setVars((prev) => ({ ...prev, [token]: e.target.value }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tokens.length === 0 && selected && (
                <p className="text-xs text-muted-foreground">
                  This template has no variables.
                </p>
              )}
            </div>

            {/* Right: live preview */}
            <div className="space-y-2">
              <Label className="text-xs">Live Preview</Label>
              <div className="border rounded-md overflow-hidden bg-background">
                <div className="px-3 py-2 bg-muted text-xs border-b">
                  <strong>Subject:</strong> {previewSubject || "—"}
                </div>
                <iframe
                  sandbox=""
                  title="sandbox-preview"
                  srcDoc={previewBody}
                  className="w-full h-[420px] bg-white"
                />
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={!canSend}>
            {sending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Send Test
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
