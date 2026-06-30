import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Send, FileText, Eye, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useUserCode } from "@/hooks/useUserCode";
import { useLegalTemplates, useLgTokenContext } from "@/hooks/legal/useLgTemplates";
import { useCreateLgNotice } from "@/hooks/legal/useLgCases";
import { useLgReference } from "@/hooks/legal/useLgCases";
import { renderTokens } from "@/services/legal/lgTemplateService";
import { logLgActivity } from "@/services/legal/lgAuditService";
import { supabase } from "@/integrations/supabase/client";
import { resolveLegalEnterprise } from "@/lib/enterprise/legalEnterpriseMetadata";

const CHANNELS = ["EMAIL", "POST", "COURIER", "IN_PERSON", "PORTAL"];

interface Props { open: boolean; onOpenChange: (o: boolean) => void; lgCaseId: string; }

export function GenerateNoticeDialog({ open, onOpenChange, lgCaseId }: Props) {
  const { userCode } = useUserCode();
  const templates = useLegalTemplates();
  const ctx = useLgTokenContext(lgCaseId);
  const create = useCreateLgNotice();
  const { data: noticeTypes = [] } = useLgReference("LG_NOTICE_TYPE");

  const [templateId, setTemplateId] = useState("");
  const [noticeType, setNoticeType] = useState("");
  const [channel, setChannel] = useState("EMAIL");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [preview, setPreview] = useState(false);
  const [editedSubject, setEditedSubject] = useState(false);
  const [editedBody, setEditedBody] = useState(false);

  useEffect(() => {
    if (!open) { setTemplateId(""); setNoticeType(""); setSubject(""); setBody(""); setPreview(false); setEditedSubject(false); setEditedBody(false); }
  }, [open]);

  useEffect(() => {
    if (!templateId) return;
    const t = templates.data?.find((x) => x.id === templateId);
    if (!t) return;
    if (!editedSubject) setSubject(t.subject || "");
    if (!editedBody) setBody(t.body || "");
    if (!noticeType && t.template_code) setNoticeType(t.template_code);
  }, [templateId, templates.data]);

  const rendered = useMemo(() => {
    if (!ctx.data) return { subject, body, unresolved: [] as string[] };
    const s = renderTokens(subject, ctx.data);
    const b = renderTokens(body, ctx.data);
    const unresolved = Array.from(new Set([...s.unresolved, ...b.unresolved]));
    return { subject: s.rendered, body: b.rendered, unresolved };
  }, [subject, body, ctx.data]);

  const save = async (send: boolean) => {
    if (!noticeType) { toast.error("Notice type is required"); return; }
    if (!subject.trim() || !body.trim()) { toast.error("Subject and body are required"); return; }
    try {
      const n = await create.mutateAsync({
        lg_case_id: lgCaseId,
        notice_type_code: noticeType,
        template_id: templateId || null,
        template_ref_id: templateId || null,
        subject: rendered.subject,
        body: rendered.body,
        delivery_channel: channel,
        status: send ? "SENT" : "DRAFT",
        generated_by: userCode ?? null,
        generated_at: new Date().toISOString(),
        ...(send ? { sent_by: userCode ?? null, sent_at: new Date().toISOString(), issued_date: new Date().toISOString().slice(0, 10) } : {}),
        created_by: userCode ?? null,
      } as any);
      // If user wants to actually transmit, push through notification engine when available
      if (send) {
        try {
          const enterprise = await resolveLegalEnterprise({
            matterId: lgCaseId,
            matterKind: "LG_NOTICE",
            documentType: noticeType,
          });
          const ent = enterprise.notification;
          await (supabase as any).from("notification_queue").insert({
            channel: channel.toLowerCase(),
            subject: rendered.subject,
            body: rendered.body,
            entity_type: "lg_notice",
            entity_id: n.id,
            module: "LEGAL",
            status: "queued",
            created_by: userCode ?? null,
            template_data: {
              organization_name: ent.organization_name,
              department_name: ent.department_name,
              sender_email: ent.sender_email,
              reply_to_email: ent.reply_to_email,
              email_signature_html: ent.email_signature_html,
              email_signature_text: ent.email_signature_text,
              email_footer: ent.email_footer,
              disclaimer: ent.disclaimer,
              logo_url: ent.org_logo_url,
              enterprise_metadata: enterprise.metadata,
            },
          });
        } catch { /* notification_queue optional — no-op */ }
      }
      await logLgActivity({
        lg_case_id: lgCaseId,
        activity_type: send ? "NOTICE_SENT" : "NOTICE_GENERATED",
        description: `${n.notice_no} · ${noticeType} · ${channel}`,
        performed_by: userCode ?? null,
        payload: { notice_id: n.id, template_id: templateId || null },
      });
      toast.success(send ? `Notice ${n.notice_no} sent` : `Notice ${n.notice_no} saved as draft`);
      onOpenChange(false);
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Generate Notice</DialogTitle>
          <DialogDescription>Uses central templates and renders case tokens before sending.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div>
            <Label>Template</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger><SelectValue placeholder="Select template…" /></SelectTrigger>
              <SelectContent>{templates.data?.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Notice Type *</Label>
            <Select value={noticeType} onValueChange={setNoticeType}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                {(noticeTypes.length ? noticeTypes : [{ code: "DEMAND", label: "Demand" }, { code: "HEARING", label: "Hearing" }, { code: "REMINDER", label: "Reminder" }]).map((n) => (
                  <SelectItem key={n.code} value={n.code}>{n.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Channel</Label>
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CHANNELS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="col-span-2"><Label>Subject *</Label><Input value={subject} onChange={(e) => { setSubject(e.target.value); setEditedSubject(true); }} /></div>
          <div className="col-span-2"><Label>Body * <span className="text-xs text-muted-foreground">(supports {"{{legal.case_no}}"} etc.)</span></Label>
            <Textarea rows={8} value={body} onChange={(e) => { setBody(e.target.value); setEditedBody(true); }} />
          </div>
          {preview && (
            <div className="col-span-2 space-y-2">
              <div className="text-xs font-medium">Preview</div>
              <div className="border rounded p-3 bg-muted/40">
                <div className="font-medium text-sm">{rendered.subject}</div>
                <div className="text-sm whitespace-pre-wrap mt-2">{rendered.body}</div>
              </div>
              {rendered.unresolved.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>Unresolved tokens: {rendered.unresolved.join(", ")}</AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => setPreview((p) => !p)}><Eye className="h-4 w-4 mr-1" /> {preview ? "Hide preview" : "Preview"}</Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={create.isPending}>Cancel</Button>
          <Button variant="secondary" onClick={() => save(false)} disabled={create.isPending}>Save Draft</Button>
          <Button onClick={() => save(true)} disabled={create.isPending}>
            {create.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />} Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
