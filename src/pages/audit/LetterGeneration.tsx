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
import { FileText, Send, Eye, Download, Plus } from 'lucide-react';
import { useIADocumentTemplates, useIAAnnualPlans, useIADepartments } from '@/hooks/useAuditData';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

export default function LetterGeneration() {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const { data: templates = [], isLoading } = useIADocumentTemplates();
  const { data: plans = [] } = useIAAnnualPlans();
  const { data: departments = [] } = useIADepartments();

  if (isLoading) return <div className="p-6">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold">Letter Generation</h1>
          <p className="text-muted-foreground">Generate audit letters using templates | <Link to="/" className="text-blue-600 hover:underline ml-1">← Back to Dashboard</Link></p>
        </div>
        <Dialog>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Generate Letter</Button></DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Generate Audit Letter</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Template</Label><Select value={selectedTemplate} onValueChange={setSelectedTemplate}><SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger><SelectContent>{templates.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Audit Plan</Label><Select><SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger><SelectContent>{plans.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Department</Label><Select><SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger><SelectContent>{departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Recipient Email</Label><Input type="email" placeholder="recipient@ssb.kn" /></div>
              <div className="flex justify-end gap-2">
                <Button variant="outline"><Download className="w-4 h-4 mr-2" />Download PDF</Button>
                <Button onClick={() => toast({ title: "Letter Sent", description: "Letter generated and sent" })}><Send className="w-4 h-4 mr-2" />Send Letter</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>Letter Templates</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Template Name</TableHead><TableHead>Type</TableHead><TableHead>Category</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {templates.map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell><Badge variant="outline">{t.template_type || '-'}</Badge></TableCell>
                  <TableCell>{t.category || '-'}</TableCell>
                  <TableCell><Badge className={t.is_active ? 'bg-green-500' : 'bg-gray-500'}>{t.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                  <TableCell><Button variant="outline" size="sm"><Eye className="w-4 h-4" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
