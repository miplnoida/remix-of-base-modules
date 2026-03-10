import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { FileText, Plus, Pencil, Trash2, Copy, Eye } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface NotificationTemplate {
  id: string;
  template_name: string;
  template_code: string;
  category: string;
  subject: string;
  body: string;
  channel: 'email' | 'sms' | 'letter';
  is_active: boolean;
  variables: string[];
  created_at: string;
}

const CATEGORIES = [
  'Violation Notice',
  'Payment Reminder',
  'Hearing Summons',
  'Penalty Assessment',
  'Arrangement Confirmation',
  'Breach Warning',
  'Final Demand',
  'Compliance Certificate',
];

const CHANNELS: Array<{ value: 'email' | 'sms' | 'letter'; label: string }> = [
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS' },
  { value: 'letter', label: 'Letter' },
];

const AVAILABLE_VARIABLES = [
  '{{employer_name}}', '{{employer_id}}', '{{violation_number}}', '{{violation_type}}',
  '{{amount_due}}', '{{due_date}}', '{{penalty_amount}}', '{{interest_amount}}',
  '{{hearing_date}}', '{{hearing_location}}', '{{case_number}}', '{{inspector_name}}',
  '{{arrangement_id}}', '{{installment_amount}}', '{{next_payment_date}}',
  '{{total_arrears}}', '{{period}}', '{{current_date}}', '{{deadline_date}}',
];

const SEED_TEMPLATES: NotificationTemplate[] = [
  {
    id: '1', template_name: 'Late C3 Submission Notice', template_code: 'TPL-VN-001',
    category: 'Violation Notice', subject: 'Notice of Late C3 Submission - {{violation_number}}',
    body: 'Dear {{employer_name}},\n\nThis is to notify you that your C3 submission for the period {{period}} was received after the statutory deadline.\n\nViolation Reference: {{violation_number}}\nPenalty Amount: {{penalty_amount}}\nDue Date: {{due_date}}\n\nPlease remit the outstanding amount by {{deadline_date}} to avoid further enforcement action.\n\nRegards,\nCompliance & Enforcement Division\nSt. Kitts & Nevis Social Security Board',
    channel: 'email', is_active: true, variables: ['employer_name', 'period', 'violation_number', 'penalty_amount', 'due_date', 'deadline_date'],
    created_at: '2024-01-15',
  },
  {
    id: '2', template_name: 'Payment Reminder SMS', template_code: 'TPL-PR-001',
    category: 'Payment Reminder', subject: 'Payment Reminder',
    body: 'REMINDER: {{employer_name}}, your payment of {{amount_due}} for {{period}} is due on {{due_date}}. Ref: {{case_number}}. Contact SSB for assistance.',
    channel: 'sms', is_active: true, variables: ['employer_name', 'amount_due', 'period', 'due_date', 'case_number'],
    created_at: '2024-01-20',
  },
  {
    id: '3', template_name: 'Court Hearing Summons', template_code: 'TPL-HS-001',
    category: 'Hearing Summons', subject: 'Summons to Appear - Case {{case_number}}',
    body: 'Dear {{employer_name}},\n\nYou are hereby summoned to appear before the Magistrate Court in connection with non-compliance proceedings.\n\nCase Number: {{case_number}}\nHearing Date: {{hearing_date}}\nLocation: {{hearing_location}}\n\nFailure to appear may result in a warrant being issued.\n\nIssued by,\nLegal Division\nSt. Kitts & Nevis Social Security Board',
    channel: 'letter', is_active: true, variables: ['employer_name', 'case_number', 'hearing_date', 'hearing_location'],
    created_at: '2024-02-01',
  },
  {
    id: '4', template_name: 'Penalty Assessment Notice', template_code: 'TPL-PA-001',
    category: 'Penalty Assessment', subject: 'Penalty Assessment - {{violation_number}}',
    body: 'Dear {{employer_name}},\n\nFollowing a review of your compliance record, the following penalties have been assessed:\n\nViolation: {{violation_type}}\nReference: {{violation_number}}\nPenalty: {{penalty_amount}}\nInterest: {{interest_amount}}\nTotal Due: {{amount_due}}\nDue Date: {{due_date}}\n\nYou may request a review within 14 days of this notice.\n\nCompliance & Enforcement Division',
    channel: 'email', is_active: true, variables: ['employer_name', 'violation_type', 'violation_number', 'penalty_amount', 'interest_amount', 'amount_due', 'due_date'],
    created_at: '2024-02-10',
  },
  {
    id: '5', template_name: 'Arrangement Confirmation', template_code: 'TPL-AC-001',
    category: 'Arrangement Confirmation', subject: 'Payment Arrangement Confirmed - {{arrangement_id}}',
    body: 'Dear {{employer_name}},\n\nYour payment arrangement has been approved.\n\nArrangement ID: {{arrangement_id}}\nTotal Debt: {{total_arrears}}\nInstallment Amount: {{installment_amount}}\nFirst Payment Due: {{next_payment_date}}\n\nPlease ensure timely payments to avoid breach of this arrangement.\n\nCompliance & Enforcement Division',
    channel: 'email', is_active: true, variables: ['employer_name', 'arrangement_id', 'total_arrears', 'installment_amount', 'next_payment_date'],
    created_at: '2024-03-01',
  },
  {
    id: '6', template_name: 'Breach Warning', template_code: 'TPL-BW-001',
    category: 'Breach Warning', subject: 'WARNING: Payment Arrangement Breach - {{arrangement_id}}',
    body: 'Dear {{employer_name}},\n\nYour payment arrangement {{arrangement_id}} is in breach due to a missed installment.\n\nMissed Amount: {{installment_amount}}\nDue Date: {{due_date}}\n\nIf payment is not received within 7 days, the arrangement will be terminated and the full balance of {{total_arrears}} will become immediately due.\n\nCompliance & Enforcement Division',
    channel: 'email', is_active: true, variables: ['employer_name', 'arrangement_id', 'installment_amount', 'due_date', 'total_arrears'],
    created_at: '2024-03-15',
  },
  {
    id: '7', template_name: 'Final Demand Letter', template_code: 'TPL-FD-001',
    category: 'Final Demand', subject: 'FINAL DEMAND - Outstanding Amount {{amount_due}}',
    body: 'Dear {{employer_name}},\n\nDespite previous correspondence, the amount of {{amount_due}} remains outstanding for period {{period}}.\n\nThis is a FINAL DEMAND. If payment is not received by {{deadline_date}}, legal proceedings will be initiated without further notice.\n\nCase Reference: {{case_number}}\n\nLegal Division\nSt. Kitts & Nevis Social Security Board',
    channel: 'letter', is_active: true, variables: ['employer_name', 'amount_due', 'period', 'deadline_date', 'case_number'],
    created_at: '2024-04-01',
  },
];

const emptyForm: Omit<NotificationTemplate, 'id' | 'created_at'> = {
  template_name: '', template_code: '', category: '', subject: '', body: '',
  channel: 'email', is_active: true, variables: [],
};

let nextCode = 8;
function generateCode(channel: string): string {
  const prefix = channel === 'email' ? 'EM' : channel === 'sms' ? 'SM' : 'LT';
  return `TPL-${prefix}-${String(nextCode++).padStart(3, '0')}`;
}

export default function ComplianceTemplates() {
  const [templates, setTemplates] = useState<NotificationTemplate[]>(SEED_TEMPLATES);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [previewTemplate, setPreviewTemplate] = useState<NotificationTemplate | null>(null);
  const [filterChannel, setFilterChannel] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const filtered = templates.filter(t =>
    (filterChannel === 'all' || t.channel === filterChannel) &&
    (filterCategory === 'all' || t.category === filterCategory)
  );

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...emptyForm, template_code: generateCode('email') });
    setDialogOpen(true);
  };

  const openEdit = (t: NotificationTemplate) => {
    setEditingId(t.id);
    setForm({ template_name: t.template_name, template_code: t.template_code, category: t.category, subject: t.subject, body: t.body, channel: t.channel, is_active: t.is_active, variables: t.variables });
    setDialogOpen(true);
  };

  const openPreview = (t: NotificationTemplate) => {
    setPreviewTemplate(t);
    setPreviewOpen(true);
  };

  const handleSave = () => {
    if (!form.template_name || !form.category || !form.subject || !form.body) {
      toast.error('Please fill in all required fields');
      return;
    }
    // Extract variables from body
    const vars = [...form.body.matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1]);
    if (editingId) {
      setTemplates(prev => prev.map(t => t.id === editingId ? { ...t, ...form, variables: vars } : t));
      toast.success('Template updated');
    } else {
      setTemplates(prev => [...prev, { ...form, id: crypto.randomUUID(), variables: vars, created_at: new Date().toISOString().split('T')[0] }]);
      toast.success('Template created');
    }
    setDialogOpen(false);
  };

  const handleDuplicate = (t: NotificationTemplate) => {
    const newT: NotificationTemplate = {
      ...t,
      id: crypto.randomUUID(),
      template_name: `${t.template_name} (Copy)`,
      template_code: generateCode(t.channel),
      created_at: new Date().toISOString().split('T')[0],
    };
    setTemplates(prev => [...prev, newT]);
    toast.success('Template duplicated');
  };

  const handleDelete = (id: string) => {
    setTemplates(prev => prev.filter(t => t.id !== id));
    toast.success('Template deleted');
  };

  const handleToggle = (id: string) => {
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, is_active: !t.is_active } : t));
  };

  const channelBadge = (ch: string) => {
    const colors: Record<string, string> = {
      email: 'bg-primary/10 text-primary border-primary/20',
      sms: 'bg-warning/10 text-warning border-warning/20',
      letter: 'bg-accent/10 text-accent-foreground border-accent/20',
    };
    return <Badge variant="outline" className={colors[ch] || ''}>{ch.toUpperCase()}</Badge>;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-semibold text-foreground">Notification Templates</h1>
          </div>
          <p className="text-muted-foreground">Manage templates for compliance notices, reminders, summons, and letters</p>
        </div>
        <Button onClick={openAdd} className="gap-2"><Plus className="h-4 w-4" />Add Template</Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={filterChannel} onValueChange={setFilterChannel}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Channel" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Channels</SelectItem>
            {CHANNELS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Variables</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.template_name}</TableCell>
                  <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{t.template_code}</code></TableCell>
                  <TableCell>{t.category}</TableCell>
                  <TableCell>{channelBadge(t.channel)}</TableCell>
                  <TableCell><Badge variant="secondary">{t.variables.length} vars</Badge></TableCell>
                  <TableCell>
                    <Switch checked={t.is_active} onCheckedChange={() => handleToggle(t.id)} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openPreview(t)}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDuplicate(t)}><Copy className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No templates found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Template' : 'Add Notification Template'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Template Name *</Label>
              <Input value={form.template_name} onChange={e => setForm(p => ({ ...p, template_name: e.target.value }))} placeholder="e.g. Late Filing Notice" />
            </div>
            <div className="space-y-2">
              <Label>Template Code</Label>
              <Input value={form.template_code} readOnly className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Channel *</Label>
              <Select value={form.channel} onValueChange={v => { setForm(p => ({ ...p, channel: v as any, template_code: editingId ? p.template_code : generateCode(v) })); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CHANNELS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Subject Line *</Label>
              <Input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="e.g. Notice of Non-Compliance - {{violation_number}}" />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Body *</Label>
              <Textarea value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} rows={10} placeholder="Template body with {{variables}}..." />
            </div>
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground">Available Variables (click to insert)</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {AVAILABLE_VARIABLES.map(v => (
                  <Badge
                    key={v}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary/10 text-xs"
                    onClick={() => setForm(p => ({ ...p, body: p.body + ' ' + v }))}
                  >
                    {v}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editingId ? 'Update' : 'Create'} Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Template Preview</DialogTitle>
          </DialogHeader>
          {previewTemplate && (
            <div className="space-y-4">
              <div className="flex gap-2 items-center">
                {channelBadge(previewTemplate.channel)}
                <Badge variant="outline">{previewTemplate.category}</Badge>
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{previewTemplate.template_code}</code>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Subject</Label>
                <p className="font-medium text-foreground">{previewTemplate.subject}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Body</Label>
                <pre className="whitespace-pre-wrap text-sm bg-muted/50 p-4 rounded-lg border text-foreground">{previewTemplate.body}</pre>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Variables Used</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {previewTemplate.variables.map(v => <Badge key={v} variant="secondary" className="text-xs">{`{{${v}}}`}</Badge>)}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
