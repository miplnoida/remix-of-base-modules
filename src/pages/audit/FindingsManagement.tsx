import { useState } from "react";
import { ArrowLeft, Plus, Eye, Edit, AlertTriangle, FileText } from "lucide-react";
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
import { useIAFindings, useIAFindingMutations } from '@/hooks/useAuditData';
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

const FindingsManagement = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: findings = [], isLoading } = useIAFindings();
  const { create } = useIAFindingMutations();

  const [formData, setFormData] = useState({ title: '', condition: '', criteria: '', cause: '', effect: '', risk_rating: '', impact_area: '', status: 'Draft' });

  const filteredFindings = findings.filter((f: any) => {
    const matchesSearch = (f.title || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || f.status === statusFilter;
    const matchesRisk = riskFilter === "all" || f.risk_rating === riskFilter;
    return matchesSearch && matchesStatus && matchesRisk;
  });

  const handleCreate = () => {
    if (!formData.title || !formData.condition) {
      toast({ title: "Validation Error", description: "Title and Condition are required", variant: "destructive" });
      return;
    }
    create.mutate(formData, { onSuccess: () => { setIsCreateOpen(false); setFormData({ title: '', condition: '', criteria: '', cause: '', effect: '', risk_rating: '', impact_area: '', status: 'Draft' }); } });
  };

  const getRiskBadge = (risk: string) => {
    const colors: Record<string, string> = { High: 'bg-red-500', Medium: 'bg-orange-600', Low: 'bg-green-500' };
    return <Badge className={colors[risk] || 'bg-gray-500'}>{risk}</Badge>;
  };

  if (isLoading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/audit/workbench"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="text-3xl font-bold">Findings Management</h1>
            <p className="text-muted-foreground">Document and track audit findings using CCCE methodology</p>
          </div>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />New Finding</Button></DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader><DialogTitle>Create Finding (CCCE)</DialogTitle></DialogHeader>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="space-y-2"><Label>Title *</Label><Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Risk Rating</Label><Select value={formData.risk_rating} onValueChange={v => setFormData({...formData, risk_rating: v})}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="High">High</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="Low">Low</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label>Impact Area</Label><Input value={formData.impact_area} onChange={e => setFormData({...formData, impact_area: e.target.value})} /></div>
              </div>
              <div className="space-y-2"><Label>Condition *</Label><Textarea value={formData.condition} onChange={e => setFormData({...formData, condition: e.target.value})} placeholder="What was found?" /></div>
              <div className="space-y-2"><Label>Criteria</Label><Textarea value={formData.criteria} onChange={e => setFormData({...formData, criteria: e.target.value})} placeholder="What should be?" /></div>
              <div className="space-y-2"><Label>Cause</Label><Textarea value={formData.cause} onChange={e => setFormData({...formData, cause: e.target.value})} placeholder="Why did it happen?" /></div>
              <div className="space-y-2"><Label>Effect</Label><Textarea value={formData.effect} onChange={e => setFormData({...formData, effect: e.target.value})} placeholder="What is the impact?" /></div>
              <div className="flex justify-end gap-2 pt-4 border-t"><Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button><Button onClick={handleCreate}>Create Finding</Button></div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{findings.length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">High Risk</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-red-600">{findings.filter((f: any) => f.risk_rating === 'High').length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Medium</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-orange-600">{findings.filter((f: any) => f.risk_rating === 'Medium').length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Low</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{findings.filter((f: any) => f.risk_rating === 'Low').length}</div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex gap-4">
            <Input placeholder="Search findings..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-1" />
            <Select value={riskFilter} onValueChange={setRiskFilter}><SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Risks</SelectItem><SelectItem value="High">High</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="Low">Low</SelectItem></SelectContent></Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="Draft">Draft</SelectItem><SelectItem value="Under Review">Under Review</SelectItem><SelectItem value="For Mgmt Response">For Mgmt Response</SelectItem><SelectItem value="Closed">Closed</SelectItem></SelectContent></Select>
          </div>
          <Table>
            <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Risk</TableHead><TableHead>Impact</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredFindings.map((f: any) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{f.title}</TableCell>
                  <TableCell>{getRiskBadge(f.risk_rating)}</TableCell>
                  <TableCell>{f.impact_area || '-'}</TableCell>
                  <TableCell><Badge variant="outline">{f.status}</Badge></TableCell>
                  <TableCell>{f.created_at ? new Date(f.created_at).toLocaleDateString() : '-'}</TableCell>
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

export default FindingsManagement;
