import { useState } from "react";
import { Plus, Eye, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIAFindings, useIAFindingMutations } from '@/hooks/useAuditData';
import { useToast } from "@/hooks/use-toast";
import { PageShell, SearchBar, FilterBar, DataTable, StatusBadge, EntityModal } from '@/components/common';
import type { DataTableColumn, FilterField } from '@/components/common';
import { Badge } from "@/components/ui/badge";

const FindingsManagement = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({ status: 'all', risk: 'all' });
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewItem, setViewItem] = useState<any>(null);

  const { data: findings = [], isLoading } = useIAFindings();
  const { create } = useIAFindingMutations();

  const [formData, setFormData] = useState({ title: '', condition: '', criteria: '', cause: '', effect: '', risk_rating: '', impact_area: '', status: 'Draft' });
  const resetForm = () => setFormData({ title: '', condition: '', criteria: '', cause: '', effect: '', risk_rating: '', impact_area: '', status: 'Draft' });

  const filteredFindings = findings.filter((f: any) => {
    const matchesSearch = (f.title || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filters.status === "all" || f.status === filters.status;
    const matchesRisk = filters.risk === "all" || f.risk_rating === filters.risk;
    return matchesSearch && matchesStatus && matchesRisk;
  });

  const handleCreate = () => {
    if (!formData.title || !formData.condition) {
      toast({ title: "Validation Error", description: "Title and Condition are required", variant: "destructive" });
      return;
    }
    create.mutate(formData, { onSuccess: () => { setIsCreateOpen(false); resetForm(); } });
  };

  const filterFields: FilterField[] = [
    { key: 'risk', label: 'Risk', type: 'select', options: [
      { value: 'all', label: 'All Risks' },
      { value: 'High', label: 'High' },
      { value: 'Medium', label: 'Medium' },
      { value: 'Low', label: 'Low' },
    ]},
    { key: 'status', label: 'Status', type: 'select', options: [
      { value: 'all', label: 'All Statuses' },
      { value: 'Draft', label: 'Draft' },
      { value: 'Under Review', label: 'Under Review' },
      { value: 'For Mgmt Response', label: 'For Mgmt Response' },
      { value: 'Closed', label: 'Closed' },
    ]},
  ];

  const statCards = [
    { label: 'Total', value: findings.length, color: '' },
    { label: 'High Risk', value: findings.filter((f: any) => f.risk_rating === 'High').length, color: 'text-destructive' },
    { label: 'Medium', value: findings.filter((f: any) => f.risk_rating === 'Medium').length, color: 'text-orange-600' },
    { label: 'Low', value: findings.filter((f: any) => f.risk_rating === 'Low').length, color: 'text-green-600' },
  ];

  const columns: DataTableColumn<any>[] = [
    { key: 'title', header: 'Title', render: (f) => <span className="font-medium">{f.title}</span> },
    { key: 'risk_rating', header: 'Risk', render: (f) => <StatusBadge status={f.risk_rating || 'Medium'} /> },
    { key: 'impact_area', header: 'Impact', render: (f) => f.impact_area || '-' },
    { key: 'status', header: 'Status', render: (f) => <StatusBadge status={f.status} /> },
    { key: 'created_at', header: 'Created', render: (f) => f.created_at ? new Date(f.created_at).toLocaleDateString() : '-' },
  ];

  return (
    <PageShell
      title="Findings Management"
      subtitle="Document and track audit findings using CCCE methodology"
      breadcrumbs={[{ label: 'Internal Audit', href: '/audit/plans' }, { label: 'Findings & Recommendations' }]}
      isLoading={isLoading}
      actions={<Button onClick={() => setIsCreateOpen(true)}><Plus className="mr-2 h-4 w-4" />New Finding</Button>}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Card key={card.label}>
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-3">
            <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search findings..." />
            <FilterBar filters={filterFields} values={filters} onChange={(k, v) => setFilters(prev => ({ ...prev, [k]: v }))} onReset={() => setFilters({ status: 'all', risk: 'all' })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <DataTable columns={columns} data={filteredFindings} emptyMessage="No findings found" onView={(f) => setViewItem(f)} />
        </CardContent>
      </Card>

      {/* Create Modal */}
      <EntityModal open={isCreateOpen} onOpenChange={(o) => { setIsCreateOpen(o); if (!o) resetForm(); }} title="Create Finding (CCCE)" mode="create" onSave={handleCreate} saveLabel="Create Finding" isSaving={create.isPending} maxWidth="max-w-3xl">
        <div className="space-y-4">
          <div className="space-y-2"><Label>Title *</Label><Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Risk Rating</Label><Select value={formData.risk_rating} onValueChange={v => setFormData({...formData, risk_rating: v})}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="High">High</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="Low">Low</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Impact Area</Label><Input value={formData.impact_area} onChange={e => setFormData({...formData, impact_area: e.target.value})} /></div>
          </div>
          <div className="space-y-2"><Label>Condition * (What was found?)</Label><Textarea value={formData.condition} onChange={e => setFormData({...formData, condition: e.target.value})} /></div>
          <div className="space-y-2"><Label>Criteria (What should be?)</Label><Textarea value={formData.criteria} onChange={e => setFormData({...formData, criteria: e.target.value})} /></div>
          <div className="space-y-2"><Label>Cause (Why did it happen?)</Label><Textarea value={formData.cause} onChange={e => setFormData({...formData, cause: e.target.value})} /></div>
          <div className="space-y-2"><Label>Effect (What is the impact?)</Label><Textarea value={formData.effect} onChange={e => setFormData({...formData, effect: e.target.value})} /></div>
        </div>
      </EntityModal>

      {/* View Modal */}
      <EntityModal open={!!viewItem} onOpenChange={() => setViewItem(null)} title="Finding Details" mode="view" maxWidth="max-w-3xl">
        {viewItem && (
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div><Label className="text-muted-foreground">Title</Label><p className="font-medium text-lg">{viewItem.title}</p></div>
              <StatusBadge status={viewItem.risk_rating || 'Medium'} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-muted-foreground">Status</Label><div className="mt-1"><StatusBadge status={viewItem.status} /></div></div>
              <div><Label className="text-muted-foreground">Impact Area</Label><p>{viewItem.impact_area || '-'}</p></div>
            </div>
            <div><Label className="text-muted-foreground">Condition</Label><p>{viewItem.condition || '-'}</p></div>
            <div><Label className="text-muted-foreground">Criteria</Label><p>{viewItem.criteria || '-'}</p></div>
            <div><Label className="text-muted-foreground">Cause</Label><p>{viewItem.cause || '-'}</p></div>
            <div><Label className="text-muted-foreground">Effect</Label><p>{viewItem.effect || '-'}</p></div>
          </div>
        )}
      </EntityModal>
    </PageShell>
  );
};

export default FindingsManagement;
