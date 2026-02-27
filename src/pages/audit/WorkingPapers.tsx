import { useState } from "react";
import { ArrowLeft, Plus, Eye, Edit, FileText, Link as LinkIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIAWorkingPapers, useIAWorkingPaperMutations, useIAEvidence } from '@/hooks/useAuditData';
import { useToast } from "@/hooks/use-toast";

const WorkingPapers = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: workingPapers = [], isLoading } = useIAWorkingPapers();
  const { data: evidenceList = [] } = useIAEvidence();
  const { create, update } = useIAWorkingPaperMutations();

  const [formData, setFormData] = useState({ title: '', description: '', objective: '', audit_area: '', procedure: '', test_performed: '', results: '', observations: '', conclusion: '' });

  const filteredWPs = workingPapers.filter((wp: any) => {
    const matchesSearch = (wp.title || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || wp.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreate = () => {
    if (!formData.title || !formData.objective) {
      toast({ title: "Validation Error", description: "Title and objective are required", variant: "destructive" });
      return;
    }
    create.mutate(formData, { onSuccess: () => { setIsCreateOpen(false); setFormData({ title: '', description: '', objective: '', audit_area: '', procedure: '', test_performed: '', results: '', observations: '', conclusion: '' }); } });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = { Draft: "secondary", "Under Review": "outline", Approved: "default" };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  if (isLoading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/audit/workbench"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="text-3xl font-bold">Working Papers</h1>
            <p className="text-muted-foreground">Manage audit working papers with full traceability</p>
          </div>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />New Working Paper</Button></DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader><DialogTitle>Create New Working Paper</DialogTitle></DialogHeader>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="space-y-2"><Label>Title *</Label><Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} /></div>
              <div className="space-y-2"><Label>Audit Area</Label><Input value={formData.audit_area} onChange={e => setFormData({...formData, audit_area: e.target.value})} /></div>
              <div className="space-y-2"><Label>Objective *</Label><Textarea value={formData.objective} onChange={e => setFormData({...formData, objective: e.target.value})} /></div>
              <div className="space-y-2"><Label>Description</Label><Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} /></div>
              <div className="space-y-2"><Label>Procedure</Label><Textarea value={formData.procedure} onChange={e => setFormData({...formData, procedure: e.target.value})} /></div>
              <div className="space-y-2"><Label>Results</Label><Textarea value={formData.results} onChange={e => setFormData({...formData, results: e.target.value})} /></div>
              <div className="space-y-2"><Label>Observations</Label><Textarea value={formData.observations} onChange={e => setFormData({...formData, observations: e.target.value})} /></div>
              <div className="space-y-2"><Label>Conclusion</Label><Textarea value={formData.conclusion} onChange={e => setFormData({...formData, conclusion: e.target.value})} /></div>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate}>Create Working Paper</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total</CardTitle><FileText className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{workingPapers.length}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Draft</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{workingPapers.filter((wp: any) => wp.status === "Draft").length}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Under Review</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{workingPapers.filter((wp: any) => wp.status === "Under Review").length}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Approved</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{workingPapers.filter((wp: any) => wp.status === "Approved").length}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Working Papers Repository</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-1" />
            <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="Draft">Draft</SelectItem><SelectItem value="Under Review">Under Review</SelectItem><SelectItem value="Approved">Approved</SelectItem></SelectContent></Select>
          </div>
          <Table>
            <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Audit Area</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredWPs.map((wp: any) => (
                <TableRow key={wp.id}>
                  <TableCell className="font-medium">{wp.title}</TableCell>
                  <TableCell>{wp.audit_area || '-'}</TableCell>
                  <TableCell>{getStatusBadge(wp.status)}</TableCell>
                  <TableCell>{wp.created_at ? new Date(wp.created_at).toLocaleDateString() : '-'}</TableCell>
                  <TableCell><div className="flex gap-2"><Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button><Button variant="ghost" size="sm"><Edit className="h-4 w-4" /></Button></div></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkingPapers;
