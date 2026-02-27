import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Send, Plus, Mail, Search } from 'lucide-react';
import { useIADocumentTemplates, useIAAnnualPlans, useIADepartments, useIACommunications, useIACommunicationMutations } from '@/hooks/useAuditData';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

export default function CommunicationCenter() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: templates = [] } = useIADocumentTemplates();
  const { data: plans = [] } = useIAAnnualPlans();
  const { data: departments = [] } = useIADepartments();
  const { data: communications = [], isLoading } = useIACommunications();
  const { create } = useIACommunicationMutations();

  const [formData, setFormData] = useState({ template_id: '', plan_id: '', department_id: '', recipient_email: '', subject: '', body: '' });
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleSend = () => {
    if (!formData.recipient_email) { toast({ title: 'Error', description: 'Recipient email required', variant: 'destructive' }); return; }
    create.mutate({ ...formData, status: 'Sent', sent_date: new Date().toISOString() }, { onSuccess: () => { setIsDialogOpen(false); setFormData({ template_id: '', plan_id: '', department_id: '', recipient_email: '', subject: '', body: '' }); } });
  };

  if (isLoading) return <div className="p-6">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold">Audit Communication Center</h1>
          <p className="text-muted-foreground">Generate and send official audit communications | <Link to="/audit/plans" className="text-primary hover:underline ml-1">← Back to Plans</Link></p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild><Button size="lg"><Plus className="w-4 h-4 mr-2" />New Communication</Button></DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader><DialogTitle>Send Communication</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Template</Label><Select value={formData.template_id} onValueChange={v => setFormData({...formData, template_id: v})}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{templates.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Plan</Label><Select value={formData.plan_id} onValueChange={v => setFormData({...formData, plan_id: v})}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{plans.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Department</Label><Select value={formData.department_id} onValueChange={v => setFormData({...formData, department_id: v})}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Recipient Email *</Label><Input value={formData.recipient_email} onChange={e => setFormData({...formData, recipient_email: e.target.value})} /></div>
              </div>
              <div><Label>Subject</Label><Input value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} /></div>
              <div><Label>Body</Label><Textarea value={formData.body} onChange={e => setFormData({...formData, body: e.target.value})} rows={6} /></div>
              <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button><Button onClick={handleSend}><Send className="w-4 h-4 mr-2" />Send</Button></div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="sent">
        <TabsList><TabsTrigger value="templates"><FileText className="w-4 h-4 mr-2" />Templates</TabsTrigger><TabsTrigger value="sent"><Mail className="w-4 h-4 mr-2" />Sent</TabsTrigger></TabsList>
        <TabsContent value="templates">
          <Card><CardHeader><CardTitle>Letter Templates</CardTitle></CardHeader><CardContent>
            <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Category</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>{templates.map((t: any) => <TableRow key={t.id}><TableCell className="font-medium">{t.name}</TableCell><TableCell><Badge variant="outline">{t.template_type || '-'}</Badge></TableCell><TableCell>{t.category || '-'}</TableCell><TableCell><Badge className={t.is_active ? 'bg-green-500' : 'bg-gray-500'}>{t.is_active ? 'Active' : 'Inactive'}</Badge></TableCell></TableRow>)}</TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="sent">
          <Card><CardHeader><CardTitle>Sent Communications</CardTitle></CardHeader><CardContent>
            <Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Subject</TableHead><TableHead>Recipient</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>{communications.map((c: any) => <TableRow key={c.id}><TableCell>{c.sent_date ? new Date(c.sent_date).toLocaleDateString() : '-'}</TableCell><TableCell>{c.subject}</TableCell><TableCell>{c.recipient_email}</TableCell><TableCell><Badge className="bg-green-500">{c.status || 'Sent'}</Badge></TableCell></TableRow>)}</TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
