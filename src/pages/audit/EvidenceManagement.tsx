import { useState } from "react";
import { Plus, Eye, Download, FileText, Link as LinkIcon, Upload, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIAEvidence, useIAEvidenceMutations, useIAActivities } from '@/hooks/useAuditData';
import { useToast } from "@/hooks/use-toast";

export default function EvidenceManagement() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const { data: evidenceList = [], isLoading } = useIAEvidence();
  const { data: activities = [] } = useIAActivities();
  const { create } = useIAEvidenceMutations();

  const [formData, setFormData] = useState({ activity_id: '', evidence_type: '', title: '', description: '' });
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const filteredEvidence = evidenceList.filter((ev: any) =>
    (ev.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (ev.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleUpload = () => {
    if (!formData.title) { toast({ title: 'Validation Error', description: 'Title is required', variant: 'destructive' }); return; }
    create.mutate(formData, { onSuccess: () => { setIsDialogOpen(false); setFormData({ activity_id: '', evidence_type: '', title: '', description: '' }); } });
  };

  if (isLoading) return <div className="p-6">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Evidence Management</h1>
          <p className="text-muted-foreground">Upload and manage audit evidence | <Link to="/" className="text-blue-600 hover:underline ml-1">← Back to Dashboard</Link></p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild><Button><Upload className="w-4 h-4 mr-2" />Upload Evidence</Button></DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Upload Audit Evidence</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Related Activity</Label>
                <Select value={formData.activity_id} onValueChange={v => setFormData({...formData, activity_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Select activity" /></SelectTrigger>
                  <SelectContent>{activities.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.title}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Title</Label><Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Evidence title" /></div>
              <div><Label>Type</Label>
                <Select value={formData.evidence_type} onValueChange={v => setFormData({...formData, evidence_type: v})}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent><SelectItem value="Document">Document</SelectItem><SelectItem value="Photo">Photo</SelectItem><SelectItem value="Interview">Interview Record</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Description</Label><Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Describe the evidence..." rows={3} /></div>
              <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button><Button onClick={handleUpload}>Upload Evidence</Button></div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Evidence</CardTitle><FileText className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{evidenceList.length}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">This Month</CardTitle><Upload className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{evidenceList.filter((ev: any) => { const d = new Date(ev.created_at); const n = new Date(); return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear(); }).length}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Activities</CardTitle><FileText className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{new Set(evidenceList.map((ev: any) => ev.activity_id).filter(Boolean)).size}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Types</CardTitle><FileText className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{new Set(evidenceList.map((ev: any) => ev.evidence_type).filter(Boolean)).size}</div></CardContent></Card>
      </div>

      <Card><CardContent className="pt-6"><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search evidence..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" /></div></CardContent></Card>

      <Card>
        <CardHeader><CardTitle>Evidence Repository ({filteredEvidence.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Type</TableHead><TableHead>Description</TableHead><TableHead>Date</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredEvidence.map((ev: any) => (
                <TableRow key={ev.id}>
                  <TableCell className="font-medium">{ev.title}</TableCell>
                  <TableCell><Badge variant="outline">{ev.evidence_type || '-'}</Badge></TableCell>
                  <TableCell className="max-w-md truncate">{ev.description}</TableCell>
                  <TableCell>{ev.created_at ? new Date(ev.created_at).toLocaleDateString() : '-'}</TableCell>
                  <TableCell><div className="flex space-x-2"><Button variant="outline" size="sm"><Eye className="w-4 h-4" /></Button></div></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
