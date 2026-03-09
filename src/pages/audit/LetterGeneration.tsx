import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, Plus } from 'lucide-react';
import { useIADocumentTemplates, useIAAnnualPlans, useIADepartments } from '@/hooks/useAuditData';
import { useToast } from '@/hooks/use-toast';
import { PageShell, StandardSearchFilterBar, DataTable, StatusBadge, EntityModal, ExportDropdown } from '@/components/common';
import type { DataTableColumn } from '@/components/common';
import { Badge } from '@/components/ui/badge';

export default function LetterGeneration() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { data: templates = [], isLoading } = useIADocumentTemplates();
  const { data: plans = [] } = useIAAnnualPlans();
  const { data: departments = [] } = useIADepartments();

  const filteredTemplates = templates.filter((t: any) =>
    (t.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.template_type || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns: DataTableColumn<any>[] = [
    { key: 'name', header: 'Template Name', render: (t) => <span className="font-medium">{t.name}</span> },
    { key: 'template_type', header: 'Type', render: (t) => <Badge variant="outline">{t.template_type || '-'}</Badge> },
    { key: 'category', header: 'Category', render: (t) => t.category || '-' },
    { key: 'is_active', header: 'Status', render: (t) => <StatusBadge status={t.is_active ? 'Active' : 'Inactive'} /> },
  ];

  return (
    <PageShell
      title="Letter Generation"
      subtitle="Generate audit letters using templates"
      breadcrumbs={[{ label: 'Internal Audit', href: '/audit/plans' }, { label: 'Letter Generation' }]}
      isLoading={isLoading}
      actions={<Button onClick={() => setIsDialogOpen(true)}><Plus className="w-4 h-4 mr-2" />Generate Letter</Button>}
    >
      <StandardSearchFilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search templates..."
      />

      <Card>
        <CardContent className="pt-6">
          <DataTable columns={columns} data={filteredTemplates} emptyMessage="No templates found" onView={() => {}} />
        </CardContent>
      </Card>

      <EntityModal open={isDialogOpen} onOpenChange={setIsDialogOpen} title="Generate Audit Letter" mode="edit" maxWidth="max-w-3xl"
        onSave={() => { toast({ title: "Letter Sent", description: "Letter generated and sent" }); setIsDialogOpen(false); }}
        saveLabel="Send Letter"
      >
        <div className="space-y-4">
          <div><Label>Template</Label><Select value={selectedTemplate} onValueChange={setSelectedTemplate}><SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger><SelectContent>{templates.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Audit Plan</Label><Select><SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger><SelectContent>{plans.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Department</Label><Select><SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger><SelectContent>{departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Recipient Email</Label><Input type="email" placeholder="recipient@ssb.kn" /></div>
        </div>
      </EntityModal>
    </PageShell>
  );
}
