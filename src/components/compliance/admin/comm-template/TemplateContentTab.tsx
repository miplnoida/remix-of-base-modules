import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Info } from 'lucide-react';
import type {
  AuditCommunicationTemplate,
  CeCommChannel,
  CeCommType,
  CeCommLifecycleStage,
  CeReportTemplateType,
} from '@/types/auditCommunication';
import {
  COMM_TYPE_LABELS,
  COMM_CATEGORY_LABELS,
  COMM_LIFECYCLE_STAGE_LABELS,
  COMM_LIFECYCLE_STAGE_ORDER,
  COMM_LIFECYCLE_STAGE_HINTS,
  REPORT_TEMPLATE_TYPE_LABELS,
} from '@/types/auditCommunication';

interface Props {
  draft: Partial<AuditCommunicationTemplate>;
  onChange: (patch: Partial<AuditCommunicationTemplate>) => void;
}

export default function TemplateContentTab({ draft, onChange }: Props) {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6 grid gap-4 md:grid-cols-2">
          <div>
            <Label>Template code *</Label>
            <Input value={draft.template_code || ''} onChange={(e) => onChange({ template_code: e.target.value })} placeholder="audit_intimation_v1" />
          </div>
          <div>
            <Label>Template name *</Label>
            <Input value={draft.template_name || ''} onChange={(e) => onChange({ template_name: e.target.value })} placeholder="Audit Intimation Notice" />
          </div>
          <div>
            <Label>Communication type *</Label>
            <Select value={draft.comm_type} onValueChange={(v) => onChange({ comm_type: v as CeCommType })}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                {Object.entries(COMM_TYPE_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Category *</Label>
            <Select value={draft.category} onValueChange={(v) => onChange({ category: v })}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {Object.entries(COMM_CATEGORY_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Channel *</Label>
            <Select value={draft.channel} onValueChange={(v) => onChange({ channel: v as CeCommChannel })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Sort order</Label>
            <Input type="number" value={draft.sort_order ?? 0} onChange={(e) => onChange({ sort_order: Number(e.target.value) })} />
          </div>
          <div className="md:col-span-2">
            <Label>Description</Label>
            <Textarea rows={2} value={draft.description || ''} onChange={(e) => onChange({ description: e.target.value })} placeholder="Internal description for officers." />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={!!draft.is_active} onCheckedChange={(v) => onChange({ is_active: v })} />
            <Label>Active</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <Label>Email subject</Label>
            <Input value={draft.email_subject || ''} onChange={(e) => onChange({ email_subject: e.target.value })} placeholder="Audit Intimation — {{employer.name}}" />
          </div>
          <div>
            <Label>Email body (HTML or plain text)</Label>
            <Textarea rows={10} value={draft.email_body || ''} onChange={(e) => onChange({ email_body: e.target.value })}
              placeholder="Dear {{employer.name}},&#10;&#10;An audit visit is scheduled on {{inspection.visit_date}}." />
            <p className="text-xs text-muted-foreground mt-1">
              Use <code>{'{{employer.name}}'}</code>, <code>{'{{inspection.visit_date}}'}</code>, <code>{'{{case.due_date}}'}</code>, etc. See the Preview tab.
            </p>
          </div>
          <div>
            <Label>SMS body</Label>
            <Textarea rows={3} value={draft.sms_body || ''} onChange={(e) => onChange({ sms_body: e.target.value })}
              placeholder="Audit visit on {{inspection.visit_date}}. Ref: {{inspection.case_no}}." />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
