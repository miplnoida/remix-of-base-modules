import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { auditCommunicationTemplateService } from '@/services/auditCommunicationTemplateService';
import { useUserCode } from '@/hooks/useUserCode';
import type { AuditCommunicationTemplate } from '@/types/auditCommunication';
import { SEND_MODE_LABELS } from '@/services/auditCommunicationSchedulePolicyService';
import TemplateContentTab from '@/components/compliance/admin/comm-template/TemplateContentTab';
import TemplateSectionsTab from '@/components/compliance/admin/comm-template/TemplateSectionsTab';
import TemplateRecipientsTab from '@/components/compliance/admin/comm-template/TemplateRecipientsTab';
import TemplateApprovalsTab from '@/components/compliance/admin/comm-template/TemplateApprovalsTab';
import TemplateActionsTab from '@/components/compliance/admin/comm-template/TemplateActionsTab';
import TemplateSchedulingTab from '@/components/compliance/admin/comm-template/TemplateSchedulingTab';
import TemplatePreviewTab from '@/components/compliance/admin/comm-template/TemplatePreviewTab';

const EMPTY: Partial<AuditCommunicationTemplate> = {
  template_code: '',
  template_name: '',
  comm_type: 'audit_intimation',
  category: 'pre_audit',
  channel: 'email',
  email_subject: '',
  email_body: '',
  sms_body: '',
  description: '',
  is_active: true,
  sort_order: 0,
  send_mode: 'MANUAL_ONLY',
  approval_rule_json: { roles: [] },
  attachment_rule_json: {},
  recipient_rule_json: { priority: ['visit_contact', 'er_master'], allow_manual_add: true },
  branding_json: {},
  merge_fields_json: [],
  preview_sample_json: {},
  requires_approval_before_send: false,
  reschedule_allowed: true,
  cancel_on_status_change_json: [],
};

export default function AuditCommunicationTemplateEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === 'new';
  const nav = useNavigate();
  const { userCode } = useUserCode();

  const [draft, setDraft] = useState<Partial<AuditCommunicationTemplate>>(EMPTY);
  const [savedId, setSavedId] = useState<string | null>(isNew ? null : id!);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('content');

  useEffect(() => {
    if (isNew) return;
    (async () => {
      try {
        const t = await auditCommunicationTemplateService.getById(id!);
        if (!t) { toast.error('Template not found'); nav('/compliance/admin/communication-templates'); return; }
        setDraft(t);
      } catch (e: any) { toast.error(e.message); }
      finally { setLoading(false); }
    })();
  }, [id]);

  const onChange = (patch: Partial<AuditCommunicationTemplate>) => setDraft(prev => ({ ...prev, ...patch }));

  const save = async () => {
    if (!draft.template_code || !draft.template_name) {
      toast.error('Template code and name are required');
      setTab('content');
      return;
    }
    setSaving(true);
    try {
      if (savedId) {
        const updated = await auditCommunicationTemplateService.update(savedId, draft, userCode || undefined);
        setDraft(updated);
        toast.success('Template saved');
      } else {
        const created = await auditCommunicationTemplateService.create(draft, userCode || undefined);
        setSavedId(created.id);
        setDraft(created);
        toast.success('Template created');
        nav(`/compliance/admin/communication-templates/${created.id}`, { replace: true });
      }
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-4">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => nav('/compliance/admin/communication-templates')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{isNew ? 'New Communication Template' : draft.template_name}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {draft.template_code && <Badge variant="outline">{draft.template_code}</Badge>}
              {draft.send_mode && <Badge variant="secondary">{SEND_MODE_LABELS[draft.send_mode]}</Badge>}
              {draft.is_active ? <Badge>Active</Badge> : <Badge variant="outline">Inactive</Badge>}
            </div>
          </div>
        </div>
        <Button onClick={save} disabled={saving}>
          <Save className="h-4 w-4 mr-1" /> {saving ? 'Saving…' : 'Save template'}
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="sections">Sections</TabsTrigger>
          <TabsTrigger value="recipients">Recipients</TabsTrigger>
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
          <TabsTrigger value="scheduling">Scheduling</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>
        <TabsContent value="content"><TemplateContentTab draft={draft} onChange={onChange} /></TabsContent>
        <TabsContent value="sections"><TemplateSectionsTab templateId={savedId} /></TabsContent>
        <TabsContent value="recipients"><TemplateRecipientsTab draft={draft} onChange={onChange} /></TabsContent>
        <TabsContent value="approvals"><TemplateApprovalsTab draft={draft} onChange={onChange} /></TabsContent>
        <TabsContent value="actions"><TemplateActionsTab templateId={savedId} /></TabsContent>
        <TabsContent value="scheduling"><TemplateSchedulingTab templateId={savedId} draft={draft} onChange={onChange} /></TabsContent>
        <TabsContent value="preview"><TemplatePreviewTab draft={draft} /></TabsContent>
      </Tabs>
    </div>
  );
}
