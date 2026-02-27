import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Clock, CheckCircle, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useIAFollowUps, useIAFollowUpMutations } from '@/hooks/useAuditData';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

export default function FollowUpTracker() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const { data: followUps = [], isLoading } = useIAFollowUps();
  const { update } = useIAFollowUpMutations();

  const filteredFollowUps = followUps.filter((fu: any) => {
    const matchesSearch = (fu.action_required || '').toLowerCase().includes(searchTerm.toLowerCase()) || (fu.responsible_person || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || fu.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const isOverdue = (dueDate: string) => dueDate && new Date(dueDate) < new Date();

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = { 'Open': 'bg-blue-500', 'In Progress': 'bg-orange-600', 'Resolved': 'bg-green-500', 'Overdue': 'bg-red-500' };
    return <Badge className={colors[status] || 'bg-gray-500'}>{status}</Badge>;
  };

  const handleUpdate = (id: string, status: string, resolution?: string) => {
    update.mutate({ id, status, resolution_notes: resolution, ...(status === 'Resolved' ? { resolved_date: new Date().toISOString() } : {}) });
  };

  if (!hasPermission('manage_audit_followups')) return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">No permission.</p></div>;
  if (isLoading) return <div className="p-6">Loading...</div>;

  const overdueTasks = filteredFollowUps.filter((fu: any) => fu.status !== 'Resolved' && isOverdue(fu.due_date));

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold">Follow-Up Tracker</h1>
        <p className="text-muted-foreground">Track corrective actions | <Link to="/audit/plans" className="text-blue-600 hover:underline ml-1">View Plans</Link></p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center"><AlertTriangle className="h-4 w-4 text-red-500" /><div className="ml-2"><p className="text-sm font-medium">Overdue</p><p className="text-2xl font-bold text-red-500">{overdueTasks.length}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center"><Clock className="h-4 w-4 text-orange-700" /><div className="ml-2"><p className="text-sm font-medium">In Progress</p><p className="text-2xl font-bold">{filteredFollowUps.filter((fu: any) => fu.status === 'In Progress').length}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center"><Clock className="h-4 w-4 text-blue-500" /><div className="ml-2"><p className="text-sm font-medium">Open</p><p className="text-2xl font-bold">{filteredFollowUps.filter((fu: any) => fu.status === 'Open').length}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500" /><div className="ml-2"><p className="text-sm font-medium">Resolved</p><p className="text-2xl font-bold">{filteredFollowUps.filter((fu: any) => fu.status === 'Resolved').length}</p></div></div></CardContent></Card>
      </div>

      <Card><CardContent className="pt-6"><div className="flex gap-4"><div className="flex-1"><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" /></div></div>
        <Select value={selectedStatus} onValueChange={setSelectedStatus}><SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="Open">Open</SelectItem><SelectItem value="In Progress">In Progress</SelectItem><SelectItem value="Resolved">Resolved</SelectItem></SelectContent></Select>
      </div></CardContent></Card>

      <Card>
        <CardHeader><CardTitle>Follow-up Actions</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Action Required</TableHead><TableHead>Responsible</TableHead><TableHead>Due Date</TableHead><TableHead>Status</TableHead><TableHead>Priority</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredFollowUps.map((fu: any) => (
                <TableRow key={fu.id} className={isOverdue(fu.due_date) && fu.status !== 'Resolved' ? 'bg-red-50' : ''}>
                  <TableCell><div className="font-medium">{fu.action_required}</div><div className="text-sm text-muted-foreground">{fu.description}</div></TableCell>
                  <TableCell>{fu.responsible_person}</TableCell>
                  <TableCell><div className={isOverdue(fu.due_date) && fu.status !== 'Resolved' ? 'text-red-600 font-medium' : ''}>{fu.due_date ? new Date(fu.due_date).toLocaleDateString() : '-'}{isOverdue(fu.due_date) && fu.status !== 'Resolved' && <div className="text-xs text-red-600">OVERDUE</div>}</div></TableCell>
                  <TableCell>{getStatusBadge(fu.status)}</TableCell>
                  <TableCell><Badge variant="outline">{fu.priority || '-'}</Badge></TableCell>
                  <TableCell>
                    <Select defaultValue={fu.status} onValueChange={v => handleUpdate(fu.id, v)}>
                      <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="Open">Open</SelectItem><SelectItem value="In Progress">In Progress</SelectItem><SelectItem value="Resolved">Resolved</SelectItem></SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
