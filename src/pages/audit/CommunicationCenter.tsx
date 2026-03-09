import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Send, Plus, Mail, FileText } from 'lucide-react';
import { useIADocumentTemplates, useIAAnnualPlans, useIADepartments, useIACommunications, useIACommunicationMutations } from '@/hooks/useAuditData';
import { useToast } from '@/hooks/use-toast';
import { PageShell, StandardSearchFilterBar, DataTable, StatusBadge, EntityModal, ExportDropdown } from '@/components/common';
import type { DataTableColumn } from '@/components/common';
import { Badge } from '@/components/ui/badge';

export default function CommunicationCenter() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: templates = [] } = useIADocumentTemplates();
  const { data: plans = [] } = useIAAnnualPlans();
  const { data: departments = [] } = useIADepartments();
  const { data: communications = [], isLoading } = useIACommunications();
  const { create } = useIACommunicationMutations();

  const [formData, setFormData] = useState({ template_id: '', plan_id: '', department_id: '', recipient_email: '', subject: '', body: '' });
  const resetForm = () => setFormData({ template_id: '', plan_id: '', department_id: '', recipient_email: '', subject: '', body: '' });

  const handleSend = () => {
    if (!formData.recipient_email) { toast({ title: 'Error', description: 'Recipient email required', variant: 'destructive' }); return; }
    create.mutate({ ...formData, status: 'Sent', sent_date: new Date().toISOString() }, { onSuccess: () => { setIsDialogOpen(false); resetForm(); } });
  };

  const templateColumns: DataTableColumn<any>[] = [
    { key: 'name', header: 'Name', render: (t) => <span className="font-medium">{t.name}</span> },
    { key: 'template_type', header: 'Type', render: (t) => <Badge variant="outline">{t.template_type || '-'}</Badge> },
    { key: 'category', header: 'Category', render: (t) => t.category || '-' },
    { key: 'is_active', header: 'Status', render: (t) => <StatusBadge status={t.is_active ? 'Active' : 'Inactive'} /> },
  ];

  const commColumns: DataTableColumn<any>[] = [
    { key: 'sent_date', header: 'Date', render: (c) => c.sent_date ? new Date(c.sent_date).toLocaleDateString() : '-' },
    { key: 'subject', header: 'Subject' },
    { key: 'recipient_email', header: 'Recipient' },
    { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status || 'Sent'} /> },
  ];

  return (
    <PageShell
      title="Audit Communication Center"
      subtitle="Generate and send official audit communications"
      breadcrumbs={[{ label: 'Internal Audit', href: '/audit/plans' }, { label: 'Communication Center' }]}
      isLoading={isLoading}
      actions={<Button onClick={() => setIsDialogOpen(true)}><Plus className="w-4 h-4 mr-2" />New Communication</Button>}
    >
      <StandardSearchFilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search templates or communications..."
      />

      <Tabs defaultValue="sent">
        <TabsList>
          <TabsTrigger value="templates"><FileText className="w-4 h-4 mr-2" />Templates</TabsTrigger>
          <TabsTrigger value="sent"><Mail className="w-4 h-4 mr-2" />Sent</TabsTrigger>
        </TabsList>
        <TabsContent value="templates">
          <Card>
            <CardContent className="pt-6">
              <DataTable columns={templateColumns} data={templates.filter((t: any) => (t.name || '').toLowerCase().includes(searchTerm.toLowerCase()))} emptyMessage="No templates found" />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="sent">
          <Card>
            <CardContent className="pt-6">
              <DataTable columns={commColumns} data={communications.filter((c: any) => (c.subject || '').toLowerCase().includes(searchTerm.toLowerCase()) || (c.recipient_email || '').toLowerCase().includes(searchTerm.toLowerCase()))} emptyMessage="No communications sent yet" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <EntityModal open={isDialogOpen} onOpenChange={(o) => { setIsDialogOpen(o); if (!o) resetForm(); }} title="Send Communication" mode="edit" onSave={handleSend} saveLabel="Send" isSaving={create.isPending} maxWidth="max-w-3xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Template</Label><Select value={formData.template_id} onValueChange={v => setFormData({...formData, template_id: v})}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{templates.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Plan</Label><Select value={formData.plan_id} onValueChange={v => setFormData({...formData, plan_id: v})}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{plans.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Department</Label><Select value={formData.department_id} onValueChange={v => setFormData({...formData, department_id: v})}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Recipient Email *</Label><Input value={formData.recipient_email} onChange={e => setFormData({...formData, recipient_email: e.target.value})} /></div>
          </div>
          <div><Label>Subject</Label><Input value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} /></div>
          <div><Label>Body</Label><Textarea value={formData.body} onChange={e => setFormData({...formData, body: e.target.value})} rows={6} /></div>
        </div>
      </EntityModal>
    </PageShell>
  );
}
