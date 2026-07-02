import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  Plus, Edit, Trash2, Eye, Copy, Mail, Search, History,
  Layout, FileText, ChevronRight, Code, Sparkles, Save,
  Info, AlertCircle, CheckCircle, Clock, RefreshCw, Tag,
  MessageSquare, Bell, Smartphone
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSupabaseAuth } from "@/contexts/SupabaseAuthContext";
import { cn } from "@/lib/utils";
import { resolveNotification } from "@/lib/enterprise/NotificationResolver";
import { composeEmailFromLayout } from "@/lib/enterprise/resolvers/emailBrandingResolver";

// ─── Types ─────────────────────────────────────────────────────────────────────
type ChannelType = 'email' | 'sms' | 'push' | 'in_app';

interface NotificationTemplate {
  id: string;
  name: string;
  template_code: string | null;
  channel: string;
  subject: string | null;
  body: string;
  html_body: string | null;
  placeholders: { key: string }[] | null;
  is_enabled: boolean;
  trigger_event: string | null;
  category: string | null;
  description: string | null;
  version_no: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  module_id: string | null;
  default_layout_id: string | null;
  module?: { id: string; display_name: string } | null;
}

interface BaseLayoutOption {
  id: string;
  code: string;
  name: string;
  description: string | null;
  layout_kind: string;
  body_placeholder_html: string | null;
  header_html: string | null;
  footer_html: string | null;
  email_max_width: number | null;
  email_background_hex: string | null;
  email_font_family: string | null;
  is_active: boolean;
}

interface LayoutComponent {
  id: string;
  component_type: 'header' | 'footer';
  display_name: string;
  html_content: string;
  is_active: boolean;
  version_no: number;
  updated_at: string;
}

interface TemplateVersion {
  id: string;
  template_id: string;
  version_no: number;
  name: string;
  subject: string | null;
  body: string | null;
  changed_by: string | null;
  changed_at: string;
  change_summary: string | null;
}

interface AuditLog {
  id: string;
  template_name: string | null;
  action: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  performed_at: string;
  details: any;
}

// ─── Channel Config ────────────────────────────────────────────────────────────
const CHANNEL_CONFIG: Record<ChannelType, { label: string; icon: typeof Mail; description: string }> = {
  email: { label: 'Email', icon: Mail, description: 'HTML email templates with shared header/footer layout' },
  sms: { label: 'SMS', icon: MessageSquare, description: 'Plain-text SMS templates with character limits' },
  push: { label: 'Push', icon: Bell, description: 'Push notification templates with title and short body' },
  in_app: { label: 'In-App', icon: Smartphone, description: 'In-app message templates with optional action links' },
};

// ─── Constants ─────────────────────────────────────────────────────────────────
const TEMPLATE_CATEGORIES = [
  'informational', 'action-required', 'approval-notification',
  'rejection-notification', 'reminder', 'system-alert', 'escalation'
];

const TRIGGER_EVENTS = [
  'ip_registration_submitted', 'ip_registration_approved', 'ip_registration_rejected',
  'ip_meeting_scheduled', 'ip_meeting_rescheduled', 'ip_meeting_cancelled',
  'ip_document_required', 'ip_account_activated',
  'employer_registration_submitted', 'employer_registration_approved', 'employer_registration_rejected',
  'employer_meeting_scheduled',
  'claim_submitted', 'claim_approved', 'claim_rejected', 'claim_payment_issued',
  'claim_additional_info_required', 'sickness_cert_reminder',
  'compliance_notice_1', 'compliance_notice_2', 'compliance_final_notice',
  'compliance_legal_escalated', 'inspection_scheduled',
  'payment_received', 'payment_overdue', 'payment_plan_created',
  'waiver_approved', 'waiver_rejected', 'c3_submission_confirmed',
  'invoice_email_sent', 'receipt_email_sent',
  'user_account_created', 'password_reset_requested', 'api_key_generated',
  'system_lockdown_activated', 'role_assigned', 'security_alert',
  'workflow_task_assigned', 'workflow_sla_breach', 'workflow_escalated', 'workflow_completed',
  'meeting_scheduled', 'meeting_rescheduled', 'meeting_cancelled', 'meeting_outcome',
];

const AVAILABLE_PLACEHOLDERS = [
  { key: '{{APPLICANT_NAME}}', description: 'Full name of the applicant' },
  { key: '{{EMPLOYER_NAME}}', description: "Employer's company name" },
  { key: '{{REF_NUMBER}}', description: 'Application/case reference number' },
  { key: '{{SSN}}', description: 'Social Security Number' },
  { key: '{{MEETING_DATE}}', description: 'Meeting date (formatted)' },
  { key: '{{MEETING_TIME}}', description: 'Meeting time' },
  { key: '{{MEETING_LOCATION}}', description: 'Meeting location/address' },
  { key: '{{MEETING_WITH}}', description: 'Officer handling the meeting' },
  { key: '{{STATUS}}', description: 'Current application/case status' },
  { key: '{{REMARKS}}', description: 'Notes or remarks' },
  { key: '{{REJECTION_REASON}}', description: 'Reason for rejection' },
  { key: '{{NEXT_STEPS}}', description: 'What the recipient should do next' },
  { key: '{{AMOUNT}}', description: 'Financial amount (XCD)' },
  { key: '{{DUE_DATE}}', description: 'Payment or submission due date' },
  { key: '{{PERIOD}}', description: 'Contribution or billing period' },
  { key: '{{PENALTY_AMOUNT}}', description: 'Penalty amount (XCD)' },
  { key: '{{CLAIM_NUMBER}}', description: 'Benefit claim reference' },
  { key: '{{BENEFIT_TYPE}}', description: 'Type of benefit applied for' },
  { key: '{{PAYMENT_DATE}}', description: 'Date of payment' },
  { key: '{{INSPECTOR_NAME}}', description: "Inspector's name" },
  { key: '{{CASE_NUMBER}}', description: 'Compliance case number' },
  { key: '{{USERNAME}}', description: "User's login username" },
  { key: '{{RESET_LINK}}', description: 'Password reset URL' },
  { key: '{{API_KEY}}', description: 'Generated API key (masked)' },
  { key: '{{ASSIGNED_ROLE}}', description: 'Role name assigned to user' },
  { key: '{{TODAY}}', description: "Today's date" },
  { key: '{{OFFICE_PHONE}}', description: 'Office contact number' },
  { key: '{{OFFICE_EMAIL}}', description: 'Office email address' },
  { key: '{{EXPIRY_DATE}}', description: 'Application/token expiry date' },
  { key: '{{DOCUMENT_LIST}}', description: 'List of required documents' },
  { key: '{{TASK_NAME}}', description: 'Workflow task name' },
  { key: '{{ASSIGNED_TO}}', description: 'Person task is assigned to' },
  { key: '{{SLA_DEADLINE}}', description: 'SLA deadline datetime' },
  { key: '{{DOCUMENT_NUMBER}}', description: 'Invoice or receipt number' },
  { key: '{{PAYER_NAME}}', description: 'Name of the payer' },
  { key: '{{PAYER_ID}}', description: 'Payer identifier (SSN/RegNo)' },
  { key: '{{TOTAL_AMOUNT}}', description: 'Total document amount' },
  { key: '{{CURRENCY_CODE}}', description: 'Currency code (e.g. XCD)' },
  { key: '{{DOCUMENT_DATE}}', description: 'Document creation date' },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────
const extractPlaceholders = (text: string): string[] => {
  const matches = text.match(/\{\{([^}]+)\}\}/g) || [];
  return [...new Set(matches)];
};

const categoryColor = (cat: string) => {
  const map: Record<string, string> = {
    'informational': 'bg-blue-100 text-blue-800',
    'action-required': 'bg-orange-100 text-orange-800',
    'approval-notification': 'bg-green-100 text-green-800',
    'rejection-notification': 'bg-red-100 text-red-800',
    'reminder': 'bg-yellow-100 text-yellow-800',
    'system-alert': 'bg-purple-100 text-purple-800',
    'escalation': 'bg-rose-100 text-rose-800',
  };
  return map[cat] || 'bg-gray-100 text-gray-700';
};

const DEFAULT_HTML_BODY = `<p style="color: #333; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">
  Dear <strong>{{APPLICANT_NAME}}</strong>,
</p>
<p style="color: #555; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
  Write your email body content here. Use placeholders from the panel on the right.
</p>

<div style="background: #f0faf4; border: 1px solid #b7dfc8; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
  <h3 style="color: #1a7a45; margin: 0 0 12px 0; font-size: 15px;">Details</h3>
  <table style="width:100%; border-collapse: collapse;">
    <tr>
      <td style="color:#555; font-size:13px; padding:4px 0; width:40%;">Reference:</td>
      <td style="color:#222; font-size:13px; padding:4px 0; font-weight:bold;">{{REF_NUMBER}}</td>
    </tr>
  </table>
</div>

<p style="color: #777; font-size: 13px; margin-top: 24px;">
  If you need assistance, please contact our office.
</p>`;

const SMS_MAX_SINGLE = 160;
const SMS_MAX_CONCAT = 320;
const PUSH_MAX_BODY = 255;

const SAMPLE_DATA: Record<string, string> = {
  '{{APPLICANT_NAME}}': 'John Michael Smith', '{{REF_NUMBER}}': 'IP-REG-2026-123456',
  '{{MEETING_DATE}}': 'Wednesday, February 18, 2026', '{{MEETING_TIME}}': '09:40 AM',
  '{{MEETING_LOCATION}}': 'Bay Road, Basseterre, St. Kitts', '{{MEETING_WITH}}': 'Inspector Jane Doe',
  '{{STATUS}}': 'Approved', '{{REMARKS}}': 'All documents verified successfully.',
  '{{REJECTION_REASON}}': 'Incomplete documentation provided.', '{{AMOUNT}}': 'XCD 2,500.00',
  '{{SSN}}': '123-456-789', '{{TODAY}}': new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
  '{{EMPLOYER_NAME}}': 'ABC Construction Ltd.', '{{CLAIM_NUMBER}}': 'CLM-2024-567',
  '{{DOCUMENT_NUMBER}}': 'INV-2026-001234', '{{PAYER_NAME}}': 'John Smith',
  '{{PAYER_ID}}': '123456', '{{TOTAL_AMOUNT}}': '2,500.00',
  '{{CURRENCY_CODE}}': 'XCD', '{{DOCUMENT_DATE}}': 'March 31, 2026',
};

const replaceSampleData = (text: string) => {
  let result = text;
  Object.entries(SAMPLE_DATA).forEach(([k, v]) => { result = result.split(k).join(v); });
  return result;
};

// Canonical base layout code per channel — always picked by default when the
// admin creates a new template. Ensures every notification template is bound
// to a standard wrapper (header/footer/signature/disclaimer come from the
// layout, not copied into the body).
const DEFAULT_BASE_LAYOUT_CODE: Record<ChannelType, string> = {
  email: 'BASE_EMAIL',
  sms: 'BASE_SMS',
  push: 'BASE_PUSH',
  in_app: 'BASE_IN_APP',
};

// Which base layouts are eligible for a given channel. EMAIL accepts any
// email-family layout (BASE_EMAIL and its variants), other channels are
// pinned to their single canonical wrapper.
const layoutMatchesChannel = (layout: BaseLayoutOption, channel: ChannelType) => {
  if (channel === 'email') {
    return layout.layout_kind === 'EMAIL' || layout.code.startsWith('BASE_EMAIL');
  }
  return layout.code === DEFAULT_BASE_LAYOUT_CODE[channel];
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function NotificationTemplateManager() {
  const { user } = useSupabaseAuth();
  const queryClient = useQueryClient();
  const [activeChannel, setActiveChannel] = useState<ChannelType>('email');
  const [activeTab, setActiveTab] = useState("templates");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [moduleFilter, setModuleFilter] = useState("all");

  // Dialogs
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isVersionsOpen, setIsVersionsOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isLayoutOpen, setIsLayoutOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplate | null>(null);

  // Editor state
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');
  const [useHtmlBody, setUseHtmlBody] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    template_code: '',
    subject: '',
    body: '',
    html_body: DEFAULT_HTML_BODY,
    category: 'informational',
    trigger_event: '',
    description: '',
    is_enabled: true,
    module_id: '',
    change_summary: '',
    action_url: '',
    default_layout_id: '',
  });

  // Preview mode: raw content, wrapped with base layout, or fully resolved
  // through the runtime pipeline (branding + signature + footer + disclaimer).
  const [previewMode, setPreviewMode] = useState<'raw' | 'layout' | 'resolved'>('resolved');
  const [previewMobile, setPreviewMobile] = useState(false);

  // Layout editor state
  const [layoutData, setLayoutData] = useState({ header: '', footer: '' });
  const [editingLayoutType, setEditingLayoutType] = useState<'header' | 'footer'>('header');

  const isEmail = activeChannel === 'email';
  const isSms = activeChannel === 'sms';
  const isPush = activeChannel === 'push';
  const isInApp = activeChannel === 'in_app';
  const channelConfig = CHANNEL_CONFIG[activeChannel];
  const ChannelIcon = channelConfig.icon;

  // ── Queries ─────────────────────────────────────────────────────────────────
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['templates-full', activeChannel],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_templates')
        .select('*, module:app_modules(id, display_name)')
        .eq('channel', activeChannel)
        .order('name');
      if (error) throw error;
      return (data || []) as unknown as NotificationTemplate[];
    },
  });

  const { data: modules = [] } = useQuery({
    queryKey: ['parent-modules-for-templates'],
    queryFn: async () => {
      const { data, error } = await supabase.from('app_modules').select('id, display_name').is('parent_id', null).eq('is_enabled', true).order('display_name');
      if (error) throw error;
      return data;
    },
  });

  // All active base layouts across every channel. Filtered in the editor via
  // `layoutMatchesChannel` so the dropdown only shows relevant options.
  const { data: baseLayouts = [] } = useQuery({
    queryKey: ['base-layouts-active'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('core_template_layout')
        .select('id, code, name, description, layout_kind, body_placeholder_html, header_html, footer_html, email_max_width, email_background_hex, email_font_family, is_active')
        .eq('is_base_layout', true)
        .eq('is_active', true)
        .order('code');
      if (error) throw error;
      return (data ?? []) as BaseLayoutOption[];
    },
  });

  const layoutsForChannel = baseLayouts.filter(l => layoutMatchesChannel(l, activeChannel));
  const canonicalLayoutId = baseLayouts.find(l => l.code === DEFAULT_BASE_LAYOUT_CODE[activeChannel])?.id ?? '';
  const selectedLayout = baseLayouts.find(l => l.id === formData.default_layout_id) ?? null;

  const { data: layoutComponents = [] } = useQuery({
    queryKey: ['email-layout-components'],
    queryFn: async () => {
      const { data, error } = await supabase.from('email_layout_components').select('*').order('component_type');
      if (error) throw error;
      return data as LayoutComponent[];
    },
  });

  const { data: versions = [] } = useQuery({
    queryKey: ['template-versions', selectedTemplate?.id],
    enabled: !!selectedTemplate?.id && isVersionsOpen,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_template_versions')
        .select('*')
        .eq('template_id', selectedTemplate!.id)
        .order('version_no', { ascending: false });
      if (error) throw error;
      return data as TemplateVersion[];
    },
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['template-audit-logs'],
    enabled: activeTab === 'audit',
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_template_audit_logs')
        .select('*')
        .order('performed_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as AuditLog[];
    },
  });

  // ── Mutations ───────────────────────────────────────────────────────────────
  const saveTemplate = useMutation({
    mutationFn: async () => {
      if (!formData.default_layout_id) {
        throw new Error('Please select a Base Layout — templates cannot be saved without one.');
      }
      const bodyContent = isEmail && useHtmlBody ? formData.html_body : formData.body;
      const detected = extractPlaceholders(bodyContent);
      const payload: Record<string, any> = {
        name: formData.name,
        template_code: formData.template_code || null,
        channel: activeChannel,
        subject: (isEmail || isPush || isInApp) ? (formData.subject || null) : null,
        body: bodyContent,
        html_body: (isEmail && useHtmlBody) ? formData.html_body : null,
        placeholders: detected.map(k => ({ key: k })),
        is_enabled: formData.is_enabled,
        trigger_event: formData.trigger_event || null,
        category: formData.category,
        description: formData.description || null,
        module_id: formData.module_id || null,
        default_layout_id: formData.default_layout_id,
        updated_by: user?.id,
        updated_at: new Date().toISOString(),
      };

      if (editorMode === 'create') {
        const { data, error } = await supabase.from('notification_templates').insert([{ ...payload, created_by: user?.id }] as any).select().single();
        if (error) throw error;
        await supabase.from('notification_template_audit_logs').insert({
          template_id: data.id, template_name: formData.name,
          action: 'CREATED', performed_by: user?.id,
          details: { template_code: formData.template_code, channel: activeChannel }
        });
      } else {
        const oldVersion = selectedTemplate!.version_no;
        const { error } = await supabase.from('notification_templates')
          .update({ ...payload, version_no: oldVersion + 1 } as any)
          .eq('id', selectedTemplate!.id);
        if (error) throw error;
        await supabase.from('notification_template_versions').insert({
          template_id: selectedTemplate!.id,
          version_no: oldVersion,
          name: selectedTemplate!.name,
          subject: selectedTemplate!.subject,
          body: selectedTemplate!.body,
          html_body: selectedTemplate!.html_body,
          placeholders: selectedTemplate!.placeholders,
          changed_by: user?.id,
          change_summary: formData.change_summary || `Updated to v${oldVersion + 1}`,
        });
        await supabase.from('notification_template_audit_logs').insert({
          template_id: selectedTemplate!.id, template_name: formData.name,
          action: 'UPDATED', field_name: 'content', performed_by: user?.id,
          details: { change_summary: formData.change_summary, channel: activeChannel }
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates-full', activeChannel] });
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
      toast.success(editorMode === 'create' ? 'Template created successfully' : 'Template updated successfully');
      setIsEditorOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleTemplate = useMutation({
    mutationFn: async (t: NotificationTemplate) => {
      const { error } = await supabase.from('notification_templates').update({ is_enabled: !t.is_enabled, updated_by: user?.id }).eq('id', t.id);
      if (error) throw error;
      await supabase.from('notification_template_audit_logs').insert({
        template_id: t.id, template_name: t.name,
        action: t.is_enabled ? 'DEACTIVATED' : 'ACTIVATED', performed_by: user?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates-full', activeChannel] });
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteTemplate = useMutation({
    mutationFn: async () => {
      if (!selectedTemplate) return;
      await supabase.from('notification_template_audit_logs').insert({
        template_id: selectedTemplate.id, template_name: selectedTemplate.name,
        action: 'DELETED', performed_by: user?.id,
      });
      const { error } = await supabase.from('notification_templates').delete().eq('id', selectedTemplate.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates-full', activeChannel] });
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
      toast.success('Template deleted');
      setIsDeleteOpen(false);
      setSelectedTemplate(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveLayout = useMutation({
    mutationFn: async () => {
      const component = layoutComponents.find(c => c.component_type === editingLayoutType);
      if (!component) throw new Error('Layout component not found');
      const { error } = await supabase.from('email_layout_components').update({
        html_content: editingLayoutType === 'header' ? layoutData.header : layoutData.footer,
        version_no: component.version_no + 1,
        updated_by: user?.id,
        updated_at: new Date().toISOString(),
      }).eq('id', component.id);
      if (error) throw error;
      await supabase.from('notification_template_audit_logs').insert({
        action: `LAYOUT_${editingLayoutType.toUpperCase()}_UPDATED`, performed_by: user?.id,
        details: { component_type: editingLayoutType }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-layout-components'] });
      toast.success(`${editingLayoutType.charAt(0).toUpperCase() + editingLayoutType.slice(1)} saved — changes will reflect on all email templates`);
      setIsLayoutOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditorMode('create');
    setFormData({
      name: '', template_code: '', subject: '', body: '',
      html_body: isEmail ? DEFAULT_HTML_BODY : '',
      category: 'informational', trigger_event: '', description: '',
      is_enabled: true, module_id: '', change_summary: '', action_url: '',
      default_layout_id: canonicalLayoutId,
    });
    setUseHtmlBody(isEmail);
    setIsEditorOpen(true);
  };

  const openEdit = (t: NotificationTemplate) => {
    setSelectedTemplate(t);
    setEditorMode('edit');
    setUseHtmlBody(isEmail && !!t.html_body);
    setFormData({
      name: t.name, template_code: t.template_code || '', subject: t.subject || '',
      body: t.body, html_body: t.html_body || t.body,
      category: t.category || 'informational', trigger_event: t.trigger_event || '',
      description: t.description || '', is_enabled: t.is_enabled, module_id: t.module_id || '',
      change_summary: '', action_url: '',
      default_layout_id: t.default_layout_id || canonicalLayoutId,
    });
    setIsEditorOpen(true);
  };

  const openLayoutEditor = (type: 'header' | 'footer') => {
    setEditingLayoutType(type);
    setLayoutData({
      header: layoutComponents.find(c => c.component_type === 'header')?.html_content || '',
      footer: layoutComponents.find(c => c.component_type === 'footer')?.html_content || '',
    });
    setIsLayoutOpen(true);
  };

  const insertPlaceholder = (key: string) => {
    if (isEmail && useHtmlBody) {
      setFormData(f => ({ ...f, html_body: f.html_body + key }));
    } else {
      setFormData(f => ({ ...f, body: f.body + key }));
    }
  };

  const renderPreviewHtml = (t: NotificationTemplate) => {
    const header = layoutComponents.find(c => c.component_type === 'header')?.html_content || '';
    const footer = layoutComponents.find(c => c.component_type === 'footer')?.html_content || '';
    const body = t.html_body || t.body;
    const merged = header.replace('{{EMAIL_TITLE}}', t.subject || t.name) + body + footer;
    return replaceSampleData(merged);
  };

  const filteredTemplates = templates.filter(t => {
    const matchSearch = !searchTerm || t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.template_code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.trigger_event || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = categoryFilter === 'all' || t.category === categoryFilter;
    const matchMod = moduleFilter === 'all' || t.module_id === moduleFilter;
    return matchSearch && matchCat && matchMod;
  });

  const currentBodyText = isEmail && useHtmlBody ? formData.html_body : formData.body;
  const bodyCharCount = formData.body.length;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Notification Template Manager</h1>
          <p className="text-muted-foreground mt-1">
            Manage notification templates across all channels — Email, SMS, Push, and In-App.
          </p>
        </div>
        <div className="flex gap-2">
          {isEmail && (
            <Button variant="outline" onClick={() => openLayoutEditor('header')}>
              <Layout className="h-4 w-4 mr-2" />Layout Editor
            </Button>
          )}
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />New Template
          </Button>
        </div>
      </div>

      {/* ── Channel Tabs ── */}
      <div className="flex items-center gap-1 border-b border-border pb-0">
        {(Object.entries(CHANNEL_CONFIG) as [ChannelType, typeof CHANNEL_CONFIG['email']][]).map(([key, config]) => {
          const Icon = config.icon;
          return (
            <button
              key={key}
              onClick={() => { setActiveChannel(key); setSearchTerm(''); setCategoryFilter('all'); setModuleFilter('all'); }}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-[3px] transition-colors",
                activeChannel === key
                  ? "border-b-primary text-foreground"
                  : "border-b-transparent text-muted-foreground hover:text-foreground hover:border-b-muted-foreground/30"
              )}
            >
              <Icon className="h-4 w-4" />
              {config.label}
            </button>
          );
        })}
      </div>

      {/* Channel description */}
      <p className="text-sm text-muted-foreground">{channelConfig.description}</p>

      {/* Layout Status Cards — Email only */}
      {isEmail && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {['header', 'footer'].map(type => {
            const comp = layoutComponents.find(c => c.component_type === type);
            return (
              <Card key={type} className="border-l-4 border-l-primary cursor-pointer hover:shadow-md transition-shadow" onClick={() => openLayoutEditor(type as 'header' | 'footer')}>
                <CardContent className="py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Layout className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium capitalize">{type} Layout</p>
                      <p className="text-xs text-muted-foreground">{comp ? `Version ${comp.version_no} • Updated ${new Date(comp.updated_at).toLocaleDateString()}` : 'Not configured'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {comp?.is_active && <Badge variant="outline" className="text-success border-success/30 bg-success/10">Active</Badge>}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Main Tabs — Templates / Audit */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="templates"><FileText className="h-4 w-4 mr-1.5" />Templates ({templates.length})</TabsTrigger>
          <TabsTrigger value="audit"><History className="h-4 w-4 mr-1.5" />Audit Logs</TabsTrigger>
        </TabsList>

        {/* ── Templates Tab ── */}
        <TabsContent value="templates" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="py-4">
              <div className="flex flex-wrap gap-3">
                <div className="flex-1 min-w-[220px] relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search by name, code, or trigger…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-48"><SelectValue placeholder="All Categories" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {TEMPLATE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={moduleFilter} onValueChange={setModuleFilter}>
                  <SelectTrigger className="w-44"><SelectValue placeholder="All Modules" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Modules</SelectItem>
                    {modules.map(m => <SelectItem key={m.id} value={m.id}>{m.display_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Templates Table */}
          {isLoading ? (
            <div className="text-center py-16 text-muted-foreground">Loading templates…</div>
          ) : filteredTemplates.length === 0 ? (
            <Card className="text-center py-16">
              <CardContent>
                <ChannelIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No {channelConfig.label} templates found</h3>
                <p className="text-muted-foreground mb-4">Create your first template or adjust filters.</p>
                <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Create Template</Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table sticky>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Template Name</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Trigger Event</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Module</TableHead>
                      <TableHead>Ver.</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTemplates.map(t => (
                      <TableRow key={t.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{t.name}</p>
                            {t.subject && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{t.subject}</p>}
                          </div>
                        </TableCell>
                        <TableCell>
                          {t.template_code ? (
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{t.template_code}</code>
                          ) : <span className="text-muted-foreground text-xs">—</span>}
                        </TableCell>
                        <TableCell>
                          {t.trigger_event ? (
                            <span className="text-xs text-muted-foreground">{t.trigger_event}</span>
                          ) : '—'}
                        </TableCell>
                        <TableCell>
                          {t.category && (
                            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", categoryColor(t.category))}>
                              {t.category.replace(/-/g, ' ')}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{t.module?.display_name || '—'}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-center">v{t.version_no}</TableCell>
                        <TableCell>
                          <Switch checked={t.is_enabled} onCheckedChange={() => toggleTemplate.mutate(t)} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" title="Preview" onClick={() => { setSelectedTemplate(t); setIsPreviewOpen(true); }}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(t)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" title="Version History" onClick={() => { setSelectedTemplate(t); setIsVersionsOpen(true); }}>
                              <History className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" title="Delete" className="text-destructive hover:text-destructive" onClick={() => { setSelectedTemplate(t); setIsDeleteOpen(true); }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Audit Tab ── */}
        <TabsContent value="audit">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><History className="h-5 w-5" />Template Audit Logs</CardTitle><CardDescription>Track all changes made to notification templates</CardDescription></CardHeader>
            <CardContent className="p-0">
              <Table sticky>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date/Time</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map(log => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{new Date(log.performed_at).toLocaleString()}</TableCell>
                      <TableCell className="text-sm">{log.template_name || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={log.action.includes('DELETE') ? 'destructive' : log.action.includes('CREATE') ? 'default' : 'secondary'} className="text-xs">{log.action}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{log.field_name || (log.details ? JSON.stringify(log.details).substring(0, 60) : '—')}</TableCell>
                    </TableRow>
                  ))}
                  {auditLogs.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No audit logs yet.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ════════════════════════════════════════════════════════════
          TEMPLATE EDITOR DIALOG
      ════════════════════════════════════════════════════════════ */}
      <Dialog open={isEditorOpen} onOpenChange={open => { if (!open) setIsEditorOpen(false); }}>
        <DialogContent className="max-w-7xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-5 pb-3 border-b shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <ChannelIcon className="h-5 w-5 text-primary" />
              {editorMode === 'create' ? `Create ${channelConfig.label} Template` : `Edit Template: ${selectedTemplate?.name}`}
            </DialogTitle>
            <DialogDescription>
              {isEmail
                ? 'Header and footer are automatically applied from the shared layout. Edit only the body content.'
                : `Configure the ${channelConfig.label} template content and metadata.`}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-1 overflow-hidden">
            {/* Left panel — meta fields */}
            <div className="w-72 border-r flex flex-col shrink-0">
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                  <div className="space-y-1.5">
                    <Label>Template Name *</Label>
                    <Input placeholder="e.g., Meeting Scheduled" value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Template Code *</Label>
                    <Input placeholder="e.g., IP_MEETING_SCHEDULED" value={formData.template_code} onChange={e => setFormData(f => ({ ...f, template_code: e.target.value.toUpperCase().replace(/\s/g, '_') }))} className="font-mono text-xs" />
                    <p className="text-xs text-muted-foreground">Unique identifier used in code to fetch this template.</p>
                  </div>

                  {/* Subject — Email, Push, In-App only */}
                  {(isEmail || isPush || isInApp) && (
                    <div className="space-y-1.5">
                      <Label>{isEmail ? 'Email Subject *' : 'Title *'}</Label>
                      <Input
                        placeholder={isEmail ? 'e.g., Your Appointment Has Been Scheduled' : 'e.g., New Notification'}
                        value={formData.subject}
                        onChange={e => setFormData(f => ({ ...f, subject: e.target.value }))}
                      />
                    </div>
                  )}

                  {/* Action URL — Push and In-App only */}
                  {(isPush || isInApp) && (
                    <div className="space-y-1.5">
                      <Label>Action URL</Label>
                      <Input placeholder="e.g., /claims/CLM-001" value={formData.action_url} onChange={e => setFormData(f => ({ ...f, action_url: e.target.value }))} />
                      <p className="text-xs text-muted-foreground">Optional deep link when user taps the notification.</p>
                    </div>
                  )}

                  <Separator />
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5">
                      <Layout className="h-3.5 w-3.5" />
                      Base Layout <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.default_layout_id}
                      onValueChange={v => setFormData(f => ({ ...f, default_layout_id: v }))}
                    >
                      <SelectTrigger className={cn(!formData.default_layout_id && "border-destructive")}>
                        <SelectValue placeholder="Select base layout" />
                      </SelectTrigger>
                      <SelectContent>
                        {layoutsForChannel.map(l => (
                          <SelectItem key={l.id} value={l.id}>
                            <div className="flex flex-col">
                              <span className="text-xs font-mono">{l.code}</span>
                              <span className="text-xs text-muted-foreground">{l.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                        {layoutsForChannel.length === 0 && (
                          <div className="p-3 text-xs text-muted-foreground">No base layouts found for {channelConfig.label}.</div>
                        )}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-1.5 text-xs">
                      {formData.default_layout_id === canonicalLayoutId ? (
                        <Badge variant="outline" className="text-xs">Standard {DEFAULT_BASE_LAYOUT_CODE[activeChannel]}</Badge>
                      ) : formData.default_layout_id ? (
                        <Badge variant="secondary" className="text-xs">Custom Override</Badge>
                      ) : (
                        <span className="text-destructive">Required — pick a layout wrapper.</span>
                      )}
                    </div>
                    {selectedLayout?.description && (
                      <p className="text-xs text-muted-foreground">{selectedLayout.description}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label>Module</Label>
                    <Select value={formData.module_id} onValueChange={v => setFormData(f => ({ ...f, module_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select module" /></SelectTrigger>
                      <SelectContent>{modules.map(m => <SelectItem key={m.id} value={m.id}>{m.display_name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Category</Label>
                    <Select value={formData.category} onValueChange={v => setFormData(f => ({ ...f, category: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{TEMPLATE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Trigger Event</Label>
                    <Select value={formData.trigger_event} onValueChange={v => setFormData(f => ({ ...f, trigger_event: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select trigger" /></SelectTrigger>
                      <SelectContent className="max-h-48">{TRIGGER_EVENTS.map(e => <SelectItem key={e} value={e}><span className="text-xs font-mono">{e}</span></SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Description</Label>
                    <Textarea placeholder="When is this template used?" value={formData.description} onChange={e => setFormData(f => ({ ...f, description: e.target.value }))} rows={3} className="text-sm" />
                  </div>
                  {editorMode === 'edit' && (
                    <div className="space-y-1.5">
                      <Label>Change Summary</Label>
                      <Textarea placeholder="What changed in this version?" value={formData.change_summary} onChange={e => setFormData(f => ({ ...f, change_summary: e.target.value }))} rows={2} className="text-sm" />
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Switch checked={formData.is_enabled} onCheckedChange={v => setFormData(f => ({ ...f, is_enabled: v }))} />
                    <Label>Active</Label>
                  </div>
                </div>
              </ScrollArea>
            </div>

            {/* Center — body editor */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Code className="h-4 w-4" />
                  {isEmail ? 'Email Body (HTML)' : isSms ? 'SMS Body (Plain Text)' : isPush ? 'Push Body' : 'In-App Body'}
                </div>
                <div className="flex items-center gap-2">
                  {isSms && (
                    <span className={cn("text-xs font-mono", bodyCharCount > SMS_MAX_CONCAT ? 'text-destructive' : bodyCharCount > SMS_MAX_SINGLE ? 'text-amber-600' : 'text-muted-foreground')}>
                      {bodyCharCount}/{SMS_MAX_SINGLE} chars
                      {bodyCharCount > SMS_MAX_SINGLE && ` (${Math.ceil(bodyCharCount / 153)} segments)`}
                    </span>
                  )}
                  {isPush && (
                    <span className={cn("text-xs font-mono", bodyCharCount > PUSH_MAX_BODY ? 'text-destructive' : 'text-muted-foreground')}>
                      {bodyCharCount}/{PUSH_MAX_BODY} chars
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {extractPlaceholders(currentBodyText).length} placeholders detected
                  </span>
                </div>
              </div>
              <div className="flex-1 flex flex-col p-4 overflow-hidden">
                {isEmail && (
                  <div className="p-2 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-800 mb-3 flex items-start gap-2">
                    <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    The shared header and footer are automatically applied. Only edit the body content below.
                  </div>
                )}
                {isSms && (
                  <div className="p-2 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-800 mb-3 flex items-start gap-2">
                    <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    SMS messages are plain text only. Keep under {SMS_MAX_SINGLE} characters for a single segment. Messages up to {SMS_MAX_CONCAT} characters will be sent as multi-part SMS.
                  </div>
                )}
                {isPush && (
                  <div className="p-2 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-800 mb-3 flex items-start gap-2">
                    <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    Push notification body should be concise — maximum {PUSH_MAX_BODY} characters.
                  </div>
                )}
                <Textarea
                  className={cn("flex-1 resize-none", isEmail ? "font-mono text-xs" : "text-sm")}
                  value={isEmail && useHtmlBody ? formData.html_body : formData.body}
                  onChange={e => {
                    if (isEmail && useHtmlBody) {
                      setFormData(f => ({ ...f, html_body: e.target.value }));
                    } else {
                      setFormData(f => ({ ...f, body: e.target.value }));
                    }
                  }}
                  placeholder={
                    isEmail ? 'Write HTML email body content here…'
                    : isSms ? 'Write SMS message here…'
                    : isPush ? 'Write push notification body here…'
                    : 'Write in-app message body here…'
                  }
                  maxLength={isSms ? SMS_MAX_CONCAT : isPush ? PUSH_MAX_BODY : undefined}
                />
              </div>
            </div>

            {/* Right — placeholders panel */}
            <div className="w-64 border-l flex flex-col shrink-0">
              <div className="px-4 py-2 border-b bg-muted/30">
                <p className="text-sm font-medium flex items-center gap-1.5"><Tag className="h-4 w-4" />Placeholders</p>
                <p className="text-xs text-muted-foreground">Click to append to body</p>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-3 space-y-1">
                  {AVAILABLE_PLACEHOLDERS.map(p => (
                    <button key={p.key} onClick={() => insertPlaceholder(p.key)}
                      className="w-full text-left px-2 py-1.5 rounded hover:bg-muted transition-colors group">
                      <code className="text-xs text-primary font-mono block">{p.key}</code>
                      <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">{p.description}</span>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>

          <div className="px-6 py-3 border-t flex items-center justify-between shrink-0 bg-background">
            <p className="text-xs text-muted-foreground">
              {editorMode === 'edit' ? `Current version: v${selectedTemplate?.version_no}` : 'New template will be created at v1'}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsEditorOpen(false)}>Cancel</Button>
              <Button onClick={() => saveTemplate.mutate()} disabled={saveTemplate.isPending || !formData.name || !formData.template_code || !formData.default_layout_id}>
                <Save className="h-4 w-4 mr-2" />
                {saveTemplate.isPending ? 'Saving…' : editorMode === 'create' ? 'Create Template' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════════════
          PREVIEW DIALOG
      ════════════════════════════════════════════════════════════ */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-3xl h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-5 pb-3 border-b shrink-0">
            <DialogTitle className="flex items-center gap-2"><Eye className="h-5 w-5" />Preview: {selectedTemplate?.name}</DialogTitle>
            <DialogDescription>
              {isEmail ? 'Rendered with sample data. Header and footer applied from shared layout.' : 'Rendered with sample placeholder data.'}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1">
            <div className="p-6">
              {selectedTemplate && isEmail && (
                <div className="border rounded-lg overflow-hidden shadow-sm">
                  <div className="bg-muted/50 px-4 py-2 text-xs text-muted-foreground border-b flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5" />
                    <strong>Subject:</strong> {selectedTemplate.subject}
                  </div>
                  <div className="p-4">
                    <iframe
                      srcDoc={renderPreviewHtml(selectedTemplate)}
                      className="w-full min-h-[500px] border-0"
                      title="Email Preview"
                      sandbox="allow-same-origin"
                    />
                  </div>
                </div>
              )}

              {selectedTemplate && isSms && (
                <div className="max-w-sm mx-auto">
                  <div className="bg-muted rounded-2xl p-1">
                    <div className="bg-background rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground border-b pb-2">
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>SMS Preview</span>
                      </div>
                      <div className="bg-primary/10 rounded-lg p-3 text-sm leading-relaxed">
                        {replaceSampleData(selectedTemplate.body)}
                      </div>
                      <p className="text-xs text-muted-foreground text-right">
                        {selectedTemplate.body.length} characters • {selectedTemplate.body.length <= SMS_MAX_SINGLE ? '1 segment' : `${Math.ceil(selectedTemplate.body.length / 153)} segments`}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {selectedTemplate && isPush && (
                <div className="max-w-sm mx-auto space-y-4">
                  <div className="bg-muted rounded-xl p-4 shadow-lg">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center shrink-0">
                        <Bell className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{replaceSampleData(selectedTemplate.subject || selectedTemplate.name)}</p>
                        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{replaceSampleData(selectedTemplate.body)}</p>
                        <p className="text-xs text-muted-foreground mt-2">now</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {selectedTemplate && isInApp && (
                <div className="max-w-md mx-auto space-y-4">
                  <Card>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground border-b pb-2">
                        <Smartphone className="h-3.5 w-3.5" />
                        <span>In-App Message Preview</span>
                      </div>
                      <h3 className="font-semibold text-base">{replaceSampleData(selectedTemplate.subject || selectedTemplate.name)}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {replaceSampleData(selectedTemplate.body)}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </ScrollArea>
          <div className="px-6 py-3 border-t shrink-0 flex justify-between">
            <p className="text-xs text-muted-foreground">Displaying sample placeholder values.</p>
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════════════
          VERSION HISTORY DIALOG
      ════════════════════════════════════════════════════════════ */}
      <Dialog open={isVersionsOpen} onOpenChange={setIsVersionsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><History className="h-5 w-5" />Version History: {selectedTemplate?.name}</DialogTitle>
            <DialogDescription>All previous versions of this template. Current version: v{selectedTemplate?.version_no}</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[500px]">
            {versions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No previous versions. This is the first version.</p>
            ) : (
              <Table sticky>
                <TableHeader><TableRow><TableHead>Version</TableHead><TableHead>Changed</TableHead><TableHead>Summary</TableHead></TableRow></TableHeader>
                <TableBody>
                  {versions.map(v => (
                    <TableRow key={v.id}>
                      <TableCell><Badge variant="outline">v{v.version_no}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(v.changed_at).toLocaleString()}</TableCell>
                      <TableCell className="text-sm">{v.change_summary || 'Content updated'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════════════
          LAYOUT EDITOR DIALOG (Email only)
      ════════════════════════════════════════════════════════════ */}
      <Dialog open={isLayoutOpen} onOpenChange={setIsLayoutOpen}>
        <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-5 pb-3 border-b shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Layout className="h-5 w-5 text-primary" />
              Edit {editingLayoutType.charAt(0).toUpperCase() + editingLayoutType.slice(1)} Layout
            </DialogTitle>
            <DialogDescription>
              ⚠️ Changes here will automatically reflect across ALL email templates. Use the placeholder <code>{'{{EMAIL_TITLE}}'}</code> in the header for the dynamic subject/title.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-1 overflow-hidden">
            <div className="flex-1 p-4 flex flex-col gap-3 overflow-hidden">
              <div className="flex gap-2 shrink-0">
                {(['header', 'footer'] as const).map(t => (
                  <Button key={t} variant={editingLayoutType === t ? 'default' : 'outline'} size="sm"
                    onClick={() => setEditingLayoutType(t)} className="capitalize">{t}</Button>
                ))}
              </div>
              <Textarea
                className="flex-1 font-mono text-xs resize-none"
                value={editingLayoutType === 'header' ? layoutData.header : layoutData.footer}
                onChange={e => setLayoutData(ld => ({ ...ld, [editingLayoutType]: e.target.value }))}
                placeholder={`Enter ${editingLayoutType} HTML…`}
              />
            </div>
            <div className="w-72 border-l flex flex-col shrink-0">
              <div className="p-3 border-b bg-muted/30 text-sm font-medium">Live Preview</div>
              <div className="flex-1 overflow-auto p-2">
                <iframe
                  srcDoc={editingLayoutType === 'header'
                    ? layoutData.header.replace('{{EMAIL_TITLE}}', 'Sample Email Title') + '<p style="padding:16px; color:#555;">Body content will appear here…</p>' + layoutData.footer
                    : '<div style="padding: 16px;"><p style="color:#555;">Body content here…</p></div>' + layoutData.footer}
                  className="w-full h-full border-0"
                  title="Layout Preview"
                  sandbox="allow-same-origin"
                />
              </div>
            </div>
          </div>
          <div className="px-6 py-3 border-t flex justify-between items-center shrink-0">
            <p className="text-xs text-amber-700 flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5" />Saving will update layout for all templates.</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsLayoutOpen(false)}>Cancel</Button>
              <Button onClick={() => saveLayout.mutate()} disabled={saveLayout.isPending}>
                <Save className="h-4 w-4 mr-2" />{saveLayout.isPending ? 'Saving…' : 'Save Layout'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════════════
          DELETE CONFIRMATION
      ════════════════════════════════════════════════════════════ */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{selectedTemplate?.name}</strong>? This action cannot be undone. If this template is mapped to a trigger event, notifications will stop sending.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTemplate.mutate()} className="bg-destructive hover:bg-destructive/90">
              Delete Template
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
