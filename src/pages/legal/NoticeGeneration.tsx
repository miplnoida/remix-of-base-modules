import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Send, Eye, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLgCases, useLgReference, useCreateLgNotice } from '@/hooks/legal/useLgCases';

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
  const createNotice = useCreateLgNotice();

  const [formData, setFormData] = useState({
    lg_case_id: '',
    notice_type_code: '',
    delivery_channel: '',
    subject: '',
    body: '',
    issued_date: new Date().toISOString().slice(0, 10),
    response_due_date: '',
  });
  const [showPreview, setShowPreview] = useState(false);

  const selectedCase = useMemo(
    () => cases.find(c => c.id === formData.lg_case_id),
    [cases, formData.lg_case_id]
  );

  const handle = (field: keyof typeof formData, value: string) =>
    setFormData(p => ({ ...p, [field]: value }));

  const validate = (): string | null => {
    if (!formData.lg_case_id) return 'Select a case';
    if (!formData.notice_type_code) return 'Select a notice type';
    if (!formData.subject.trim()) return 'Subject is required';
    if (!formData.body.trim()) return 'Body is required';
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
        lg_case_id: formData.lg_case_id,
        notice_type_code: formData.notice_type_code,
        subject: formData.subject,
        body: formData.body,
        delivery_channel: formData.delivery_channel || null,
        issued_date: formData.issued_date || null,
        response_due_date: formData.response_due_date || null,
        status: 'DRAFT',
      });
      toast({ title: 'Notice created', description: notice.notice_no });
      navigate(`/legal/cases/${formData.lg_case_id}`);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message ?? 'Failed to create notice', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
          <div>
            <h1 className="text-2xl font-bold">Generate Legal Notice</h1>
            <p className="text-sm text-muted-foreground">Create and issue a notice against a legal case</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Notice Details</CardTitle>
            <CardDescription>All notices are stored against the selected legal case</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Case *</Label>
                <Select value={formData.lg_case_id} onValueChange={v => handle('lg_case_id', v)}>
                  <SelectTrigger><SelectValue placeholder={casesLoading ? 'Loading...' : 'Select case'} /></SelectTrigger>
                  <SelectContent>
                    {cases.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.lg_case_no} — {c.summary?.slice(0, 40) ?? c.case_type_code}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Notice Type *</Label>
                <Select value={formData.notice_type_code} onValueChange={v => handle('notice_type_code', v)}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {noticeTypes.map(t => <SelectItem key={t.code} value={t.code}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Delivery Channel</Label>
                <Select value={formData.delivery_channel} onValueChange={v => handle('delivery_channel', v)}>
                  <SelectTrigger><SelectValue placeholder="Select channel" /></SelectTrigger>
                  <SelectContent>
                    {DELIVERY_CHANNELS.map(d => <SelectItem key={d.code} value={d.code}>{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Issued Date</Label>
                <Input type="date" value={formData.issued_date} onChange={e => handle('issued_date', e.target.value)} />
              </div>
              <div>
                <Label>Response Due</Label>
                <Input type="date" value={formData.response_due_date} onChange={e => handle('response_due_date', e.target.value)} />
              </div>
              {selectedCase && (
                <div>
                  <Label>Case Summary</Label>
                  <div className="text-sm p-2 border rounded bg-muted/30">
                    <Badge variant="outline" className="mr-2">{selectedCase.status_code}</Badge>
                    {selectedCase.summary || '—'}
                  </div>
                </div>
              )}
            </div>

            <div>
              <Label>Subject *</Label>
              <Input value={formData.subject} onChange={e => handle('subject', e.target.value)} maxLength={250} />
            </div>
            <div>
              <Label>Body *</Label>
              <Textarea rows={10} value={formData.body} onChange={e => handle('body', e.target.value)} />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowPreview(p => !p)}>
                <Eye className="h-4 w-4 mr-1" /> {showPreview ? 'Hide' : 'Preview'}
              </Button>
              <Button onClick={handleGenerate} disabled={createNotice.isPending}>
                {createNotice.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
                Create Notice
              </Button>
            </div>
          </CardContent>
        </Card>

        {showPreview && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded p-4 space-y-2 bg-background">
                <div className="text-xs text-muted-foreground">{selectedCase?.lg_case_no ?? '—'} · {noticeTypes.find(t => t.code === formData.notice_type_code)?.label ?? ''}</div>
                <div className="font-semibold">{formData.subject || '(no subject)'}</div>
                <div className="whitespace-pre-wrap text-sm">{formData.body || '(empty body)'}</div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default NoticeGeneration;
