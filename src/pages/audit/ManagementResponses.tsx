import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useIAManagementResponses, useIAManagementResponseMutations, useIAFindings } from '@/hooks/useAuditData';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

export default function ManagementResponses() {
  const { toast } = useToast();
  const { data: responses = [], isLoading } = useIAManagementResponses();
  const { data: findings = [] } = useIAFindings();
  const { update } = useIAManagementResponseMutations();

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = { 'Draft': 'bg-gray-500', 'Submitted': 'bg-blue-500', 'Under Review': 'bg-orange-600', 'Accepted': 'bg-green-500' };
    return <Badge className={colors[status] || 'bg-gray-500'}>{status}</Badge>;
  };

  const handleAccept = (id: string) => update.mutate({ id, status: 'Accepted' });
  const handleRevise = (id: string) => update.mutate({ id, status: 'Draft' });

  if (isLoading) return <div className="p-6">Loading...</div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold">Management Responses</h1>
        <p className="text-muted-foreground">Department heads respond to audit findings | <Link to="/audit/findings" className="text-blue-600 hover:underline ml-1">View Findings</Link></p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Awaiting Response</CardTitle><Clock className="h-4 w-4 text-orange-700" /></CardHeader><CardContent><div className="text-2xl font-bold">{findings.filter((f: any) => f.status === 'For Mgmt Response').length}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Submitted</CardTitle><MessageSquare className="h-4 w-4 text-blue-600" /></CardHeader><CardContent><div className="text-2xl font-bold">{responses.filter((r: any) => r.status === 'Submitted').length}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Accepted</CardTitle><CheckCircle className="h-4 w-4 text-green-600" /></CardHeader><CardContent><div className="text-2xl font-bold">{responses.filter((r: any) => r.status === 'Accepted').length}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total</CardTitle><AlertCircle className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{responses.length}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Management Responses</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Finding</TableHead><TableHead>Response</TableHead><TableHead>Responsible</TableHead><TableHead>Target Date</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {responses.map((response: any) => {
                const finding = findings.find((f: any) => f.id === response.finding_id);
                return (
                  <TableRow key={response.id}>
                    <TableCell className="font-medium">{finding?.title || '-'}</TableCell>
                    <TableCell className="max-w-md"><p className="text-sm">{response.response_text}</p></TableCell>
                    <TableCell>{response.responsible_person}</TableCell>
                    <TableCell>{response.target_date ? <Badge variant="outline">{new Date(response.target_date).toLocaleDateString()}</Badge> : '-'}</TableCell>
                    <TableCell>{getStatusBadge(response.status)}</TableCell>
                    <TableCell>
                      {response.status === 'Submitted' && (
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleAccept(response.id)}>Accept</Button>
                          <Button variant="outline" size="sm" onClick={() => handleRevise(response.id)}>Request Revision</Button>
                        </div>
                      )}
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
