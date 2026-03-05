import { useState } from "react";
import { Plus, Eye, Edit, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useIAWorkingPapers, useIAWorkingPaperMutations } from '@/hooks/useAuditData';
import { useToast } from "@/hooks/use-toast";
import { PageShell, SearchBar, FilterBar, DataTable, StatusBadge, EntityModal } from '@/components/common';
import type { DataTableColumn, FilterField } from '@/components/common';

const WorkingPapers = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({ status: 'all' });
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewItem, setViewItem] = useState<any>(null);
  const [editItem, setEditItem] = useState<any>(null);

  const { data: workingPapers = [], isLoading } = useIAWorkingPapers();
  const { create } = useIAWorkingPaperMutations();

  const [formData, setFormData] = useState({ title: '', description: '', objective: '', audit_area: '', procedure: '', test_performed: '', results: '', observations: '', conclusion: '' });
  const resetForm = () => setFormData({ title: '', description: '', objective: '', audit_area: '', procedure: '', test_performed: '', results: '', observations: '', conclusion: '' });

  const filteredWPs = workingPapers.filter((wp: any) => {
    const matchesSearch = (wp.title || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filters.status === "all" || wp.status === filters.status;
    return matchesSearch && matchesStatus;
  });

  const handleCreate = () => {
    if (!formData.title || !formData.objective) {
      toast({ title: "Validation Error", description: "Title and objective are required", variant: "destructive" });
      return;
    }
    create.mutate(formData, { onSuccess: () => { setIsCreateOpen(false); resetForm(); } });
  };

  const filterFields: FilterField[] = [
    { key: 'status', label: 'Status', type: 'select', options: [
      { value: 'all', label: 'All Statuses' },
      { value: 'Draft', label: 'Draft' },
      { value: 'Under Review', label: 'Under Review' },
      { value: 'Approved', label: 'Approved' },
    ]},
  ];

  const statCards = [
    { label: 'Total', value: workingPapers.length },
    { label: 'Draft', value: workingPapers.filter((wp: any) => wp.status === "Draft").length },
    { label: 'Under Review', value: workingPapers.filter((wp: any) => wp.status === "Under Review").length },
    { label: 'Approved', value: workingPapers.filter((wp: any) => wp.status === "Approved").length },
  ];

  const columns: DataTableColumn<any>[] = [
    { key: 'title', header: 'Title', render: (wp) => <span className="font-medium">{wp.title}</span> },
    { key: 'audit_area', header: 'Audit Area', render: (wp) => wp.audit_area || '-' },
    { key: 'status', header: 'Status', render: (wp) => <StatusBadge status={wp.status} /> },
    { key: 'created_at', header: 'Created', render: (wp) => wp.created_at ? new Date(wp.created_at).toLocaleDateString() : '-' },
  ];

  const formFields = (
    <div className="space-y-4">
      <div className="space-y-2"><Label>Title *</Label><Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} /></div>
      <div className="space-y-2"><Label>Audit Area</Label><Input value={formData.audit_area} onChange={e => setFormData({...formData, audit_area: e.target.value})} /></div>
      <div className="space-y-2"><Label>Objective *</Label><Textarea value={formData.objective} onChange={e => setFormData({...formData, objective: e.target.value})} /></div>
      <div className="space-y-2"><Label>Description</Label><Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} /></div>
      <div className="space-y-2"><Label>Procedure</Label><Textarea value={formData.procedure} onChange={e => setFormData({...formData, procedure: e.target.value})} /></div>
      <div className="space-y-2"><Label>Results</Label><Textarea value={formData.results} onChange={e => setFormData({...formData, results: e.target.value})} /></div>
      <div className="space-y-2"><Label>Observations</Label><Textarea value={formData.observations} onChange={e => setFormData({...formData, observations: e.target.value})} /></div>
      <div className="space-y-2"><Label>Conclusion</Label><Textarea value={formData.conclusion} onChange={e => setFormData({...formData, conclusion: e.target.value})} /></div>
    </div>
  );

  return (
    <PageShell
      title="Working Papers"
      subtitle="Manage audit working papers with full traceability"
      breadcrumbs={[{ label: 'Internal Audit', href: '/audit/plans' }, { label: 'Working Papers' }]}
      isLoading={isLoading}
      actions={<Button onClick={() => setIsCreateOpen(true)}><Plus className="mr-2 h-4 w-4" />New Working Paper</Button>}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Card key={card.label}>
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <p className="text-2xl font-bold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-3">
            <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search working papers..." />
            <FilterBar filters={filterFields} values={filters} onChange={(k, v) => setFilters(prev => ({ ...prev, [k]: v }))} onReset={() => setFilters({ status: 'all' })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <DataTable columns={columns} data={filteredWPs} emptyMessage="No working papers found" onView={(wp) => setViewItem(wp)} onEdit={(wp) => setEditItem(wp)} />
        </CardContent>
      </Card>

      {/* Create Modal */}
      <EntityModal open={isCreateOpen} onOpenChange={(o) => { setIsCreateOpen(o); if (!o) resetForm(); }} title="Create New Working Paper" mode="create" onSave={handleCreate} saveLabel="Create Working Paper" isSaving={create.isPending} maxWidth="max-w-3xl">
        {formFields}
      </EntityModal>

      {/* View Modal */}
      <EntityModal open={!!viewItem} onOpenChange={() => setViewItem(null)} title="Working Paper Details" mode="view" maxWidth="max-w-3xl">
        {viewItem && (
          <div className="space-y-4">
            <div><Label className="text-muted-foreground">Title</Label><p className="font-medium">{viewItem.title}</p></div>
            <div><Label className="text-muted-foreground">Audit Area</Label><p>{viewItem.audit_area || '-'}</p></div>
            <div><Label className="text-muted-foreground">Status</Label><div className="mt-1"><StatusBadge status={viewItem.status} /></div></div>
            <div><Label className="text-muted-foreground">Objective</Label><p>{viewItem.objective || '-'}</p></div>
            <div><Label className="text-muted-foreground">Observations</Label><p>{viewItem.observations || '-'}</p></div>
            <div><Label className="text-muted-foreground">Conclusion</Label><p>{viewItem.conclusion || '-'}</p></div>
          </div>
        )}
      </EntityModal>
    </PageShell>
  );
};

export default WorkingPapers;
