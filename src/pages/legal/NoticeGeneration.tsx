import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Send, Eye, Loader2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLgCases, useLgReference, useCreateLgNotice } from '@/hooks/legal/useLgCases';
import { useLegalTemplates, useLegalTemplate, useLgTokenContext } from '@/hooks/legal/useLgTemplates';
import { renderTokens } from '@/services/legal/lgTemplateService';

const DELIVERY_CHANNELS = [
  { code: 'EMAIL', label: 'Email' },
  { code: 'REGISTERED_MAIL', label: 'Registered Mail' },
  { code: 'PERSONAL_SERVICE', label: 'Personal Service' },
  { code: 'SMS', label: 'SMS' },
  { code: 'COURIER', label: 'Courier' },
];

const NoticeGeneration = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: cases = [], isLoading: casesLoading } = useLgCases({});
  const { data: noticeTypes = [] } = useLgReference('LG_NOTICE_TYPE');
  const { data: templates = [], isLoading: tplLoading } = useLegalTemplates();
  const createNotice = useCreateLgNotice();

  const [form, setForm] = useState({
    lg_case_id: '',
    notice_type_code: '',
    template_id: '',
    delivery_method_code: '',
    subject: '',
    body: '',
    issued_date: new Date().toISOString().slice(0, 10),
    response_due_date: '',
  });

  const { data: template } = useLegalTemplate(form.template_id || undefined);
  const { data: ctx, isLoading: ctxLoading } = useLgTokenContext(form.lg_case_id || undefined);

  const selectedCase = useMemo(
    () => cases.find((c) => c.id === form.lg_case_id),
    [cases, form.lg_case_id]
  );

  // Apply template into editor whenever template (or case) changes
  useEffect(() => {
    if (!template) return;
    setForm((p) => ({
      ...p,
      subject: template.subject || template.name,
      body: template.body,
    }));
  }, [template?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handle = (field: keyof typeof form, value: string) =>
    setForm((p) => ({ ...p, [field]: value }));

  const rendered = useMemo(() => {
    if (!ctx) return { subject: form.subject, body: form.body, unresolved: [] as string[] };
    const s = renderTokens(form.subject, ctx);
    const b = renderTokens(form.body, ctx);
    return {
      subject: s.rendered,
      body: b.rendered,
      unresolved: Array.from(new Set([...s.unresolved, ...b.unresolved])),
    };
  }, [ctx, form.subject, form.body]);

  const validate = (): string | null => {
    if (!form.lg_case_id) return 'Select a legal case';
    if (!form.notice_type_code) return 'Select a notice type';
    if (!form.subject.trim()) return 'Subject is required';
    if (!form.body.trim()) return 'Body is required';
    return null;
  };

  const handleGenerate = async () => {
    const err = validate();
    if (err) {
      toast({ title: 'Validation', description: err, variant: 'destructive' });
      return;
    }
    try {
      const notice = await createNotice.mutateAsync({
        lg_case_id: form.lg_case_id,
        notice_type_code: form.notice_type_code,
        subject: rendered.subject,
        body: rendered.body,
        delivery_channel: form.delivery_method_code || null,
        issued_date: form.issued_date || null,
        response_due_date: form.response_due_date || null,
        status: 'DRAFT',
        // extended columns
        template_id: form.template_id || null,
        generated_at: new Date().toISOString(),
      } as any);
      toast({ title: 'Notice created', description: notice.notice_no });
      navigate(`/legal/lg/cases/${form.lg_case_id}`);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message ?? 'Failed to create notice', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Generate Legal Notice</h1>
            <p className="text-sm text-muted-foreground">
              Notices are generated from central templates and resolved against live case context — no hard-coded letter text.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Notice Details</CardTitle>
            <CardDescription>Pick a case, a template, and the delivery method. Tokens resolve automatically.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Legal Case *</Label>
                <Select value={form.lg_case_id} onValueChange={(v) => handle('lg_case_id', v)}>
                  <SelectTrigger><SelectValue placeholder={casesLoading ? 'Loading...' : 'Select case'} /></SelectTrigger>
                  <SelectContent>
                    {cases.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.lg_case_no} — {c.summary?.slice(0, 40) ?? c.case_type_code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Notice Type *</Label>
                <Select value={form.notice_type_code} onValueChange={(v) => handle('notice_type_code', v)}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {noticeTypes.map((t) => <SelectItem key={t.code} value={t.code}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>Template *</Label>
                <Select value={form.template_id} onValueChange={(v) => handle('template_id', v)}>
                  <SelectTrigger><SelectValue placeholder={tplLoading ? 'Loading templates...' : 'Choose a legal template'} /></SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Templates are managed in the central template library (category: legal).
                </p>
              </div>
              <div>
                <Label>Delivery Method</Label>
                <Select value={form.delivery_method_code} onValueChange={(v) => handle('delivery_method_code', v)}>
                  <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                  <SelectContent>
                    {DELIVERY_CHANNELS.map((d) => <SelectItem key={d.code} value={d.code}>{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Issued Date</Label>
                <Input type="date" value={form.issued_date} onChange={(e) => handle('issued_date', e.target.value)} />
              </div>
              <div>
                <Label>Response Due</Label>
                <Input type="date" value={form.response_due_date} onChange={(e) => handle('response_due_date', e.target.value)} />
              </div>
              {selectedCase && (
                <div className="md:col-span-2">
                  <Label>Case Summary</Label>
                  <div className="text-sm p-2 border rounded bg-muted/30">
                    <Badge variant="outline" className="mr-2">{selectedCase.status_code}</Badge>
                    <Badge variant="outline" className="mr-2">{selectedCase.current_stage_code}</Badge>
                    {selectedCase.summary || '—'}
                  </div>
                </div>
              )}
            </div>

            <div>
              <Label>Subject (editable, tokens supported)</Label>
              <Input value={form.subject} onChange={(e) => handle('subject', e.target.value)} maxLength={250} />
            </div>
            <div>
              <Label>Body (editable, tokens supported)</Label>
              <Textarea rows={12} value={form.body} onChange={(e) => handle('body', e.target.value)} />
            </div>

            {rendered.unresolved.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Unresolved tokens: {rendered.unresolved.join(', ')}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2 justify-end">
              <Button onClick={handleGenerate} disabled={createNotice.isPending}>
                {createNotice.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
                Create Notice
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Eye className="h-5 w-5" /> Live Preview</CardTitle>
            <CardDescription>
              {ctxLoading ? 'Resolving case context…' : 'Tokens resolved from the selected case.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded p-4 space-y-2 bg-background">
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <FileText className="h-3.5 w-3.5" />
                {selectedCase?.lg_case_no ?? '—'} · {noticeTypes.find((t) => t.code === form.notice_type_code)?.label ?? ''}
              </div>
              <div className="font-semibold">{rendered.subject || '(no subject)'}</div>
              <div className="whitespace-pre-wrap text-sm">{rendered.body || '(empty body)'}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NoticeGeneration;
