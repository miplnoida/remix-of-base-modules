import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { managementResponses, findings } from '@/data/auditData';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

export default function ManagementResponses() {
  const { toast } = useToast();

  const getStatusBadge = (status: string) => {
    const colors = {
      'Draft': 'bg-gray-500',
      'Submitted': 'bg-blue-500',
      'Under Review': 'bg-yellow-500',
      'Accepted': 'bg-green-500'
    };
    return <Badge className={colors[status as keyof typeof colors] || 'bg-gray-500'}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Management Responses</h1>
          <p className="text-muted-foreground">
            Review and track management responses to audit findings |
            <Link to="/" className="text-blue-600 hover:underline ml-1">← Back to Dashboard</Link> |
            <Link to="/audit/findings" className="text-blue-600 hover:underline ml-1">View Findings</Link>
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Awaiting Response</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {findings.filter(f => f.status === 'For Mgmt Response').length}
            </div>
            <p className="text-xs text-muted-foreground">Findings pending</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Submitted</CardTitle>
            <MessageSquare className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {managementResponses.filter(r => r.status === 'Submitted').length}
            </div>
            <p className="text-xs text-muted-foreground">Under review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accepted</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {managementResponses.filter(r => r.status === 'Accepted').length}
            </div>
            <p className="text-xs text-muted-foreground">Approved responses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{managementResponses.length}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Responses Table */}
      <Card>
        <CardHeader>
          <CardTitle>Management Responses</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Finding</TableHead>
                <TableHead>Response</TableHead>
                <TableHead>Responsible Person</TableHead>
                <TableHead>Target Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {managementResponses.map((response) => {
                const finding = findings.find(f => f.id === response.findingId);
                return (
                  <TableRow key={response.id}>
                    <TableCell className="font-medium">
                      <div>
                        <div className="font-semibold">{finding?.findingId}</div>
                        <div className="text-sm text-muted-foreground">{finding?.title}</div>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <div className="space-y-1">
                        <p className="text-sm">{response.responseText}</p>
                        <p className="text-xs text-muted-foreground font-semibold">Action Plan:</p>
                        <p className="text-xs text-muted-foreground whitespace-pre-line">{response.actionPlan}</p>
                      </div>
                    </TableCell>
                    <TableCell>{response.responsiblePerson}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {new Date(response.targetDate).toLocaleDateString()}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(response.status)}</TableCell>
                    <TableCell>
                      {response.submittedDate ? new Date(response.submittedDate).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {response.status === 'Submitted' && (
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => toast({ 
                              title: "Response Accepted",
                              description: "Management response has been accepted" 
                            })}
                          >
                            Accept
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => toast({ 
                              title: "Revisions Requested",
                              description: "Management has been asked to revise the response" 
                            })}
                          >
                            Request Revision
                          </Button>
                        </div>
                      )}
                      {response.status === 'Accepted' && (
                        <Badge className="bg-green-600">Accepted</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Findings Awaiting Response */}
      <Card>
        <CardHeader>
          <CardTitle>Findings Awaiting Management Response</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Finding ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Days Pending</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {findings
                .filter(f => f.status === 'For Mgmt Response')
                .map((finding) => {
                  const daysPending = Math.floor(
                    (new Date().getTime() - new Date(finding.createdDate).getTime()) / (1000 * 60 * 60 * 24)
                  );
                  return (
                    <TableRow key={finding.id}>
                      <TableCell className="font-medium">{finding.findingId}</TableCell>
                      <TableCell>{finding.title}</TableCell>
                      <TableCell>
                        <Badge className={
                          finding.riskRating === 'High' ? 'bg-red-500' :
                          finding.riskRating === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'
                        }>
                          {finding.riskRating}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{finding.ownerRole}</TableCell>
                      <TableCell>{new Date(finding.createdDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={daysPending > 10 ? 'text-red-600' : ''}>
                          {daysPending} days
                        </Badge>
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
