import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, Clock, AlertCircle, TrendingUp } from 'lucide-react';
import { useIAActionTracking, useIAActionTrackingMutations, useIAFindings } from '@/hooks/useAuditData';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

export default function ActionTracking() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState('all');
  const { data: actions = [], isLoading } = useIAActionTracking();
  const { data: findings = [] } = useIAFindings();
  const { update } = useIAActionTrackingMutations();

  const filteredActions = actions.filter((a: any) => statusFilter === 'all' || a.status === statusFilter);

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = { 'Not Started': 'bg-gray-500', 'In Progress': 'bg-blue-500', 'Implemented': 'bg-orange-600', 'Verified': 'bg-green-500', 'Closed': 'bg-purple-500' };
    return <Badge className={colors[status] || 'bg-gray-500'}>{status}</Badge>;
  };

  const handleUpdateStatus = (id: string, newStatus: string) => {
    update.mutate({ id, status: newStatus, ...(newStatus === 'Verified' ? { verified_date: new Date().toISOString() } : {}) });
  };

  if (isLoading) return <div className="p-6">Loading...</div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold">Action Tracking</h1>
        <p className="text-muted-foreground">Track corrective actions | <Link to="/audit/followups" className="text-blue-600 hover:underline ml-1">View Follow-ups</Link></p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {['Not Started', 'In Progress', 'Implemented', 'Verified', 'Closed'].map(s => (
          <Card key={s}><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">{s}</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{actions.filter((a: any) => a.status === s).length}</div></CardContent></Card>
        ))}
      </div>

      <Card><CardContent className="pt-6">
        <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Statuses</SelectItem>{['Not Started','In Progress','Implemented','Verified','Closed'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
      </CardContent></Card>

      <Card>
        <CardHeader><CardTitle>Corrective Actions ({filteredActions.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Finding</TableHead><TableHead>Action</TableHead><TableHead>Responsible</TableHead><TableHead>Target Date</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredActions.map((action: any) => {
                const finding = findings.find((f: any) => f.id === action.finding_id);
                return (
                  <TableRow key={action.id}>
                    <TableCell className="font-medium">{finding?.title || '-'}</TableCell>
                    <TableCell className="max-w-md text-sm">{action.action_description}</TableCell>
                    <TableCell>{action.responsible_person}</TableCell>
                    <TableCell>{action.target_date ? <Badge variant="outline">{new Date(action.target_date).toLocaleDateString()}</Badge> : '-'}</TableCell>
                    <TableCell>{getStatusBadge(action.status)}</TableCell>
                    <TableCell>
                      <Select defaultValue={action.status} onValueChange={v => handleUpdateStatus(action.id, v)}>
                        <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                        <SelectContent>{['Not Started','In Progress','Implemented','Verified','Closed'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
